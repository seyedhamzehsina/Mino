import { withSupabase } from 'npm:@supabase/server@1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Content-Type': 'application/json'
};

const allowedEvents = new Set([
  'mino_opened',
  'first_task_created',
  'task_created',
  'task_completed',
  'shortcut_clicked',
  'calendar_month_changed',
  'weekly_report_opened',
  'weekly_report_week_changed'
]);

const allowedParameters: Record<string, Set<string>> = {
  shortcut_clicked: new Set(['shortcut_kind', 'shortcut_id']),
  calendar_month_changed: new Set(['direction']),
  weekly_report_week_changed: new Set(['direction'])
};

function validParameters(name: string, params: unknown) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return {};
  const allowed = allowedParameters[name] || new Set<string>();
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (!allowed.has(key) || typeof value !== 'string') continue;
    if (key === 'shortcut_kind' && (value === 'default' || value === 'custom')) next[key] = value;
    if (key === 'shortcut_id' && ['google', 'gmail', 'github', 'youtube'].includes(value)) next[key] = value;
    if (key === 'direction' && (value === 'previous' || value === 'next')) next[key] = value;
  }
  return next;
}

const handler = withSupabase({ auth: 'publishable' }, async (request) => {
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });

  try {
    const body = await request.json();
    const clientId = typeof body?.client_id === 'string' ? body.client_id : '';
    const event = body?.event;
    if (!/^[a-f0-9-]{36}$/i.test(clientId) || !event || !allowedEvents.has(event.name)) {
      return new Response(JSON.stringify({ error: 'Invalid analytics payload' }), { status: 400, headers: corsHeaders });
    }

    const measurementId = Deno.env.get('GA4_MEASUREMENT_ID');
    const apiSecret = Deno.env.get('GA4_API_SECRET');
    if (!measurementId || !apiSecret) {
      return new Response(JSON.stringify({ error: 'Analytics is not configured' }), { status: 503, headers: corsHeaders });
    }

    const response = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        events: [{ name: event.name, params: validParameters(event.name, event.params) }]
      })
    });
    if (!response.ok) throw new Error(`GA4 returned ${response.status}`);
    return new Response(JSON.stringify({ ok: true }), { status: 202, headers: corsHeaders });
  } catch (error) {
    console.error('Analytics forwarding failed', error);
    return new Response(JSON.stringify({ error: 'Analytics unavailable' }), { status: 502, headers: corsHeaders });
  }
});

export default {
  fetch: async (request: Request) => {
    // Browser preflight requests intentionally arrive without an API key.
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    return handler(request);
  }
};

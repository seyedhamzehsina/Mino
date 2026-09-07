// Fill these in from your Supabase project (Settings → API) to enable accounts & sync.
// Until then the extension stays 100% local — exactly as it works today.
const SyncConfig = {
  SUPABASE_URL: 'https://pxarsfdfmqvynvbedceq.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4YXJ2ZmRmbXF5dm52YmVkY2VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTcwMDAwMDAwMH0.xxxxxxxxxx',
  get enabled() {
    return /https:\/\/.+\.supabase\.co$/.test(this.SUPABASE_URL) && this.SUPABASE_ANON_KEY.length > 20;
  }
};
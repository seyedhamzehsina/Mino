// Fill these in from your Supabase project (Settings → API) to enable accounts & sync.
// Until then the extension stays 100% local — exactly as it works today.
const SyncConfig = {
  SUPABASE_URL: 'https://pxarsfdfmqvynvbedceq.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_uOdC8Uf5zU40RdbE_SKmvA_spptxSgI',
  get enabled() {
    return /https:\/\/.+\.supabase\.co$/.test(this.SUPABASE_URL) && this.SUPABASE_ANON_KEY.length > 20;
  }
};
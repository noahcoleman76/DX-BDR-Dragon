import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export let supabase: SupabaseClient | null = null;
export let cloudConfigurationError = '';
export let cloudProject = 'local';
if (url || key) {
  try {
    if (!url || !key) throw new Error('Cloud configuration is incomplete. Set both Supabase environment variables and redeploy.');
    cloudProject = new URL(url).hostname.split('.')[0];
    supabase = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  } catch (issue) { cloudConfigurationError = issue instanceof Error ? issue.message : String(issue); }
}

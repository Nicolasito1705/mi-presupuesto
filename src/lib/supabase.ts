import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** False when .env is missing or blank — App renders a setup notice instead. */
export const isConfigured = Boolean(url && anonKey);

/**
 * Created eagerly so every module can import it, but only usable once the two
 * env vars are set. The placeholders keep createClient from throwing during a
 * misconfigured boot; `isConfigured` is the real gate.
 */
export const supabase: SupabaseClient = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);

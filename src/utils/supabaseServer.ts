import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Server-only Supabase client using the Service Role key. Bypasses RLS in API routes.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
}
if (!serviceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set (server)');
}

export const supabaseServer: SupabaseClient<Database> = createClient<Database>(url, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../src/types/supabase';

// Get environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || '';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// In production, we should log warnings about missing environment variables
if (process.env.NODE_ENV === 'production' && !isBrowser) {
  if (!supabaseUrl) {
    console.warn('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!supabaseKey) {
    console.warn('Missing environment variable: NEXT_PUBLIC_SUPABASE_KEY');
  }
}

// Create a mock client for server-side rendering when credentials are missing
const createMockClient = (): SupabaseClient<Database> => {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
          data: null,
          error: null
        }),
        data: null,
        error: null
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null })
    }),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: null, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      updateUser: () => Promise.resolve({ data: null, error: null })
    },
    rpc: () => Promise.resolve({ data: null, error: null })
  } as unknown as SupabaseClient<Database>;
};

// Create a properly typed supabase client or a mock client if credentials are missing
export const supabase: SupabaseClient<Database> = (supabaseUrl && supabaseKey) 
  ? createClient<Database>(supabaseUrl, supabaseKey)
  : createMockClient(); 
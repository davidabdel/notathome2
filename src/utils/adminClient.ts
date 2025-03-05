import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Get environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';
const isProduction = process.env.NODE_ENV === 'production';

// Log errors in production
if (isProduction) {
  if (!supabaseUrl) {
    console.error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!supabaseServiceKey) {
    console.error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY');
  }
}

// Create a mock client for server-side rendering when credentials are missing
const createMockAdminClient = (): SupabaseClient<Database> => {
  console.warn('Using mock admin client - this will not work for actual API calls');
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
      admin: {
        listUsers: () => Promise.resolve({ data: { users: [] }, error: null }),
        deleteUser: () => Promise.resolve({ data: null, error: null }),
        createUser: () => Promise.resolve({ data: { user: { id: '', email: '' } }, error: null })
      },
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: null, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      updateUser: () => Promise.resolve({ data: null, error: null })
    },
    rpc: () => Promise.resolve({ data: null, error: null })
  } as unknown as SupabaseClient<Database>;
};

// Create a properly typed supabase admin client or a mock client if credentials are missing
export const createAdminClient = (): SupabaseClient<Database> => {
  if (!supabaseUrl || !supabaseServiceKey) {
    if (isProduction) {
      console.error('Missing Supabase credentials for admin client');
      
      // In API routes, return a mock client that will return appropriate errors
      return {
        ...createMockAdminClient(),
        // Override specific methods to return errors
        from: () => ({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ 
                data: null, 
                error: { message: 'Configuration error: Missing Supabase credentials' } 
              }),
              data: null,
              error: { message: 'Configuration error: Missing Supabase credentials' }
            }),
            data: null,
            error: { message: 'Configuration error: Missing Supabase credentials' }
          }),
          insert: () => Promise.resolve({ 
            data: null, 
            error: { message: 'Configuration error: Missing Supabase credentials' } 
          }),
          update: () => Promise.resolve({ 
            data: null, 
            error: { message: 'Configuration error: Missing Supabase credentials' } 
          }),
          delete: () => Promise.resolve({ 
            data: null, 
            error: { message: 'Configuration error: Missing Supabase credentials' } 
          })
        }),
      } as unknown as SupabaseClient<Database>;
    }
    return createMockAdminClient();
  }
  
  return createClient<Database>(supabaseUrl, supabaseServiceKey);
}; 
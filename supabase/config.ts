import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../src/types/supabase';

// Get environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || '';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// In production, we should log warnings about missing environment variables
if (process.env.NODE_ENV === 'production') {
  if (!supabaseUrl) {
    console.error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!supabaseKey) {
    console.error('Missing environment variable: NEXT_PUBLIC_SUPABASE_KEY');
  }
}

// Create a mock client for server-side rendering when credentials are missing
const createMockClient = (): SupabaseClient<Database> => {
  if (isBrowser && process.env.NODE_ENV === 'production') {
    // In the browser in production, show a user-friendly error
    if (!supabaseUrl || !supabaseKey) {
      // Add a small delay to ensure the DOM is ready
      setTimeout(() => {
        const errorDiv = document.createElement('div');
        errorDiv.style.padding = '20px';
        errorDiv.style.margin = '20px';
        errorDiv.style.backgroundColor = '#f8d7da';
        errorDiv.style.color = '#721c24';
        errorDiv.style.borderRadius = '5px';
        errorDiv.style.textAlign = 'center';
        errorDiv.innerHTML = `
          <h2>Configuration Error</h2>
          <p>The application is missing required configuration. Please contact the administrator.</p>
          <p>Missing: ${!supabaseUrl ? 'SUPABASE_URL' : ''} ${!supabaseKey ? 'SUPABASE_KEY' : ''}</p>
        `;
        
        // Try to add to body if it exists
        if (document.body) {
          document.body.innerHTML = '';
          document.body.appendChild(errorDiv);
        }
      }, 100);
    }
  }
  
  console.warn('Using mock Supabase client - this will not work for actual API calls');
  
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
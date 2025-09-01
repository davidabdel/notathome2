import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Create a single supabase client for interacting with your database
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;

// Provide fallback values for development
// These are dummy values that will only be used in development
const fallbackUrl = 'https://your-project.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtdXB0cHBsZnZpaWZyYndtbXR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzY0NzI2OTUsImV4cCI6MTk5MjA0ODY5NX0.fallback-key';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// In production, we should never use fallbacks
const isProduction = process.env.NODE_ENV === 'production';

// Log errors in production
if (isProduction) {
  if (!supabaseUrl) {
    console.error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
  }

  if (!supabaseKey) {
    console.error('Missing environment variable: NEXT_PUBLIC_SUPABASE_KEY');
  }
}

// Only log warnings in development and when in the browser
if (isBrowser && !isProduction) {
  if (!supabaseUrl) {
    console.warn('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL, using fallback for development');
  }

  if (!supabaseKey) {
    console.warn('Missing environment variable: NEXT_PUBLIC_SUPABASE_KEY, using fallback for development');
  }
}

// Use fallbacks only in development
let finalUrl = supabaseUrl || '';
let finalKey = supabaseKey || '';

if (!isProduction && (!finalUrl || !finalKey)) {
  if (!finalUrl) finalUrl = fallbackUrl;
  if (!finalKey) finalKey = fallbackKey;
  
  if (isBrowser) {
    console.warn('Using fallback Supabase credentials for development. These will not work for actual API calls.');
  }
}

// In the browser in production, show a user-friendly error
if (isBrowser && isProduction && (!finalUrl || !finalKey)) {
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
      <p>Missing: ${!finalUrl ? 'SUPABASE_URL' : ''} ${!finalKey ? 'SUPABASE_KEY' : ''}</p>
    `;
    
    // Try to add to body if it exists
    if (document.body) {
      document.body.innerHTML = '';
      document.body.appendChild(errorDiv);
    }
  }, 100);
}

// Define the mock client type
type MockClient = {
  from: () => {
    select: () => {
      eq: () => {
        single: () => Promise<{ data: null; error: null }>;
        data: null;
        error: null;
      };
      data: null;
      error: null;
    };
    insert: () => Promise<{ data: null; error: null }>;
    update: () => Promise<{ data: null; error: null }>;
    delete: () => Promise<{ data: null; error: null }>;
  };
  auth: {
    getUser: () => Promise<{ data: { user: null }; error: null }>;
    signIn: () => Promise<{ data: null; error: null }>;
    signOut: () => Promise<{ error: null }>;
  };
  rpc: () => Promise<{ data: null; error: null }>;
};

// Create a mock client if we're in a server environment without credentials
// This prevents server-side rendering errors
const supabase: SupabaseClient<Database> = (!finalUrl || !finalKey) 
  ? (!isBrowser 
    ? {
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
          getUser: () => Promise.resolve({ data: { user: null }, error: null }),
          signIn: () => Promise.resolve({ data: null, error: null }),
          signOut: () => Promise.resolve({ error: null })
        },
        rpc: () => Promise.resolve({ data: null, error: null })
      } as unknown as SupabaseClient<Database>
    : createClient<Database>(fallbackUrl, fallbackKey))
  : createClient<Database>(finalUrl, finalKey);

export { supabase }; 
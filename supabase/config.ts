import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../src/types/supabase';

// Create a properly typed supabase client
export const supabase: SupabaseClient<Database> = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
); 
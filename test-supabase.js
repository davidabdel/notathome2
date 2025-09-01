// Simple script to test Supabase connection
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Log environment variables (without revealing full values)
console.log('Environment check:');
console.log('NEXT_PUBLIC_SUPABASE_URL defined:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('NEXT_PUBLIC_SUPABASE_URL length:', process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0);
console.log('NEXT_PUBLIC_SUPABASE_KEY defined:', !!process.env.NEXT_PUBLIC_SUPABASE_KEY);
console.log('NEXT_PUBLIC_SUPABASE_KEY length:', process.env.NEXT_PUBLIC_SUPABASE_KEY?.length || 0);

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;

// Check if we have the required environment variables
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables:');
  if (!supabaseUrl) console.error('- NEXT_PUBLIC_SUPABASE_URL is missing');
  if (!supabaseKey) console.error('- NEXT_PUBLIC_SUPABASE_KEY is missing');
  process.exit(1);
}

// Create client and test connection
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    // Try a simple query that should work on any Supabase project
    const { data, error } = await supabase.from('_prisma_migrations').select('count()', { count: 'exact' }).limit(1);
    
    if (error) {
      console.error('Connection error:', error);
    } else {
      console.log('Connection successful!', data);
    }
  } catch (err) {
    console.error('Exception during connection test:', err);
  }
}

testConnection();

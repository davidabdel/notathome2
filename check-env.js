// Simple script to check environment variables
require('dotenv').config({ path: '.env.local' });

console.log('Environment variables check:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 
  `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 8)}...` : 'undefined');
console.log('NEXT_PUBLIC_SUPABASE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_KEY ? 
  `${process.env.NEXT_PUBLIC_SUPABASE_KEY.substring(0, 5)}...` : 'undefined');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 
  `${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 5)}...` : 'undefined');

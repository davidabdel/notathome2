// Direct environment file checker
const fs = require('fs');
const path = require('path');

try {
  // Read the .env.local file directly
  const envPath = path.join(__dirname, '.env.local');
  console.log('Checking for .env.local file at:', envPath);
  
  if (fs.existsSync(envPath)) {
    console.log('.env.local file exists');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    // Check for required variables
    const variables = {
      NEXT_PUBLIC_SUPABASE_URL: false,
      NEXT_PUBLIC_SUPABASE_KEY: false,
      SUPABASE_SERVICE_ROLE_KEY: false
    };
    
    lines.forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const [key] = line.split('=');
        if (key && key.trim() in variables) {
          variables[key.trim()] = true;
        }
      }
    });
    
    console.log('\nEnvironment variables check:');
    Object.entries(variables).forEach(([key, exists]) => {
      console.log(`${key}: ${exists ? '✓ Found' : '✗ Missing'}`);
    });
    
    // Check if values are properly formatted
    console.log('\nChecking variable formats:');
    lines.forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').trim();
        
        if (key && key.trim() === 'NEXT_PUBLIC_SUPABASE_URL') {
          if (!value.startsWith('https://') || !value.includes('.supabase.co')) {
            console.log('⚠️ NEXT_PUBLIC_SUPABASE_URL format looks incorrect. Should be like: https://your-project-id.supabase.co');
          } else {
            console.log('✓ NEXT_PUBLIC_SUPABASE_URL format looks correct');
          }
        }
        
        if (key && key.trim() === 'NEXT_PUBLIC_SUPABASE_KEY') {
          if (value.length < 20) {
            console.log('⚠️ NEXT_PUBLIC_SUPABASE_KEY looks too short. Should be a long API key');
          } else {
            console.log('✓ NEXT_PUBLIC_SUPABASE_KEY length looks reasonable');
          }
        }
        
        if (key && key.trim() === 'SUPABASE_SERVICE_ROLE_KEY') {
          if (value.length < 20) {
            console.log('⚠️ SUPABASE_SERVICE_ROLE_KEY looks too short. Should be a long API key');
          } else {
            console.log('✓ SUPABASE_SERVICE_ROLE_KEY length looks reasonable');
          }
        }
      }
    });
    
  } else {
    console.error('❌ .env.local file does not exist!');
    console.log('\nYou need to create a .env.local file in the project root with the following variables:');
    console.log(`
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
    `);
  }
} catch (error) {
  console.error('Error checking environment file:', error);
}

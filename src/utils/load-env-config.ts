import { createClient } from '@supabase/supabase-js';

/**
 * Load email configuration from database into environment variables
 */
export async function loadEmailConfigFromDatabase() {
  // Skip if we're in the browser
  if (typeof window !== 'undefined') {
    return;
  }
  
  try {
    // Create Supabase client with the service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Get email configuration from the database
    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .select('settings')
      .eq('category', 'email')
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No email config found (normal on first run)
        console.log('No email configuration found in database');
      } else {
        console.error('Error loading email configuration:', error);
      }
      return;
    }
    
    if (data && data.settings) {
      const settings = data.settings;
      
      // Set environment variables
      if (settings.host) process.env.EMAIL_HOST = settings.host;
      if (settings.port) process.env.EMAIL_PORT = settings.port.toString();
      if (settings.user) process.env.EMAIL_USER = settings.user;
      if (settings.pass) process.env.EMAIL_PASS = settings.pass;
      if (settings.from) process.env.EMAIL_FROM = settings.from;
      if (settings.secure !== undefined) process.env.EMAIL_SECURE = settings.secure.toString();
      if (settings.adminEmail) process.env.ADMIN_EMAIL = settings.adminEmail;
      
      console.log('Email configuration loaded from database');
    }
  } catch (err) {
    console.error('Exception loading email configuration:', err);
  }
} 
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface EmailConfig {
  email_host: string;
  email_port: string;
  email_user: string;
  email_pass: string;
  email_from: string;
  email_secure: boolean;
  admin_email: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify the user is an admin
    const { data: { session } } = await supabaseAdmin.auth.getSession();
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Check if user is an admin
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id);
    
    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
      return res.status(500).json({ error: 'Failed to verify admin status' });
    }
    
    const adminRole = userRoles?.find(role => role.role === 'admin');
    
    if (!adminRole) {
      return res.status(403).json({ error: 'You do not have permission to access this resource' });
    }

    // Get the configuration from the request body
    const {
      email_host,
      email_port,
      email_user,
      email_pass,
      email_from,
      email_secure,
      admin_email
    } = req.body as EmailConfig;

    // Validate required fields
    if (!email_host || !email_port || !email_user || !email_pass || !admin_email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Save configuration to database
    // Using a system_settings table to store app configuration
    // First check if the table exists, if not create it
    const { error: tableCheckError } = await supabaseAdmin
      .from('system_settings')
      .select('id')
      .limit(1);

    if (tableCheckError && tableCheckError.code === '42P01') {
      // Table doesn't exist, create it
      await supabaseAdmin.rpc('create_system_settings_table');
    }

    // Check if email config already exists
    const { data: existingConfig, error: configError } = await supabaseAdmin
      .from('system_settings')
      .select('id')
      .eq('category', 'email');

    // Prepare config data
    const configData = {
      category: 'email',
      settings: {
        host: email_host,
        port: email_port,
        user: email_user,
        pass: email_pass,
        from: email_from,
        secure: email_secure,
        adminEmail: admin_email
      }
    };

    let saveError;
    if (existingConfig && existingConfig.length > 0) {
      // Update existing config
      const { error } = await supabaseAdmin
        .from('system_settings')
        .update(configData)
        .eq('category', 'email');
      
      saveError = error;
    } else {
      // Insert new config
      const { error } = await supabaseAdmin
        .from('system_settings')
        .insert([configData]);
      
      saveError = error;
    }

    if (saveError) {
      console.error('Error saving email configuration:', saveError);
      return res.status(500).json({ error: 'Failed to save email configuration' });
    }

    // Save values to environment variables for the current session
    process.env.EMAIL_HOST = email_host;
    process.env.EMAIL_PORT = email_port;
    process.env.EMAIL_USER = email_user;
    process.env.EMAIL_PASS = email_pass;
    process.env.EMAIL_FROM = email_from;
    process.env.EMAIL_SECURE = email_secure.toString();
    process.env.ADMIN_EMAIL = admin_email;

    return res.status(200).json({ 
      success: true, 
      message: 'Email configuration saved successfully' 
    });
  } catch (err) {
    console.error('Error saving email configuration:', err);
    return res.status(500).json({ 
      error: err instanceof Error ? err.message : 'An unexpected error occurred' 
    });
  }
} 
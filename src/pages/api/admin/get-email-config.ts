import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
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

    // Get the email configuration from the database
    const { data: configData, error: configError } = await supabaseAdmin
      .from('system_settings')
      .select('settings')
      .eq('category', 'email')
      .single();
    
    if (configError && configError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      console.error('Error fetching email configuration:', configError);
      return res.status(500).json({ error: 'Failed to fetch email configuration' });
    }
    
    // If configuration exists, return it
    if (configData && configData.settings) {
      const settings = configData.settings;
      
      // Hide the password for security
      if (settings.pass) {
        settings.pass = '********';
      }
      
      return res.status(200).json({
        success: true,
        data: {
          email_host: settings.host || '',
          email_port: settings.port || '',
          email_user: settings.user || '',
          email_pass: settings.pass || '',
          email_from: settings.from || '',
          email_secure: settings.secure || false,
          admin_email: settings.adminEmail || ''
        }
      });
    }
    
    // No configuration found, return empty values
    return res.status(200).json({
      success: true,
      data: {
        email_host: '',
        email_port: '',
        email_user: '',
        email_pass: '',
        email_from: '',
        email_secure: false,
        admin_email: ''
      }
    });
  } catch (err) {
    console.error('Error getting email configuration:', err);
    return res.status(500).json({ 
      error: err instanceof Error ? err.message : 'An unexpected error occurred' 
    });
  }
} 
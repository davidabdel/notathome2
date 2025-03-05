import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Password reset API called with method:', req.method);
  console.log('Environment variables check:');
  console.log('NEXT_PUBLIC_APP_URL defined:', !!process.env.NEXT_PUBLIC_APP_URL);
  console.log('NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);

  // Check if the request method is allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get the email from the request body
  const { email } = req.body;
  
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid email' });
  }

  // Get the site URL from environment variables or request headers
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 
                  `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
  
  console.log('Using site URL for reset link:', siteUrl);

  try {
    // Check if the user exists
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error fetching users:', userError);
      return res.status(500).json({ error: 'Failed to check user existence' });
    }
    
    const existingUser = userData.users.find(user => user.email === email);
    
    if (existingUser) {
      // User exists, send password reset email
      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/congregation/reset-password`,
      });
      
      if (resetError) {
        console.error('Error sending password reset email:', resetError);
        return res.status(500).json({ error: 'Failed to send password reset email' });
      }
      
      return res.status(200).json({ 
        success: true, 
        message: 'Password reset instructions have been sent to your email'
      });
    } else {
      // Check if this email is associated with a congregation
      const { data: congregationData, error: congregationError } = await supabaseAdmin
        .from('congregations')
        .select('id, name')
        .eq('contact_email', email);
      
      if (congregationError) {
        console.error('Error checking congregation:', congregationError);
        return res.status(500).json({ error: 'Failed to check congregation' });
      }
      
      if (!congregationData || congregationData.length === 0) {
        // Not a congregation admin
        return res.status(404).json({ 
          error: 'Email not found. Only congregation admins can use this feature.' 
        });
      }
      
      // Create a new user and send a password reset email
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        password: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) // Random password
      });
      
      if (createError) {
        console.error('Error creating user:', createError);
        return res.status(500).json({ error: 'Failed to create user account' });
      }
      
      // Assign congregation admin role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: newUser.user.id,
          congregation_id: congregationData[0].id,
          role: 'congregation_admin',
          user_email: email
        });
      
      if (roleError) {
        console.error('Error assigning role:', roleError);
        return res.status(500).json({ error: 'Failed to assign admin role' });
      }
      
      // Send password reset email to the newly created user
      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/congregation/reset-password`,
      });
      
      if (resetError) {
        console.error('Error sending password reset email:', resetError);
        return res.status(500).json({ error: 'Failed to send password reset email' });
      }
      
      return res.status(200).json({ 
        success: true, 
        message: 'Password reset instructions have been sent to your email'
      });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 
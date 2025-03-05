import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with admin privileges
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Log environment variables (without revealing full keys)
  console.log('Supabase URL:', supabaseUrl);
  console.log('Service Role Key exists:', !!supabaseServiceRoleKey);

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return res.status(500).json({
      success: false,
      message: 'Missing Supabase credentials',
      details: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set'
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Get the site URL from environment variables or request
    const siteUrl = req.body.siteUrl || process.env.NEXT_PUBLIC_APP_URL || 
                   `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
    
    console.log('Configuring Supabase with site URL:', siteUrl);

    // Update the site URL in Supabase Auth settings
    const { error: siteUrlError } = await supabase
      .from('auth.config')
      .update({ site_url: siteUrl })
      .eq('id', 1);

    if (siteUrlError) {
      console.error('Error updating site URL:', siteUrlError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update site URL',
        error: siteUrlError
      });
    }

    // Update the password reset email template
    const { error: templateError } = await supabase
      .from('auth.templates')
      .update({
        template: `
          <h2>Reset Your Password</h2>
          <p>Hello,</p>
          <p>Someone has requested a password reset for your Not At Home account.</p>
          <p>If this was you, please click the button below to reset your password:</p>
          <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Reset Password</a>
          <p>If you didn't request this change, you can safely ignore this email.</p>
          <p>This link will expire in 24 hours.</p>
          <p>Thank you,<br>The Not At Home Team</p>
        `,
        subject: 'Reset your Not At Home password'
      })
      .eq('type', 'recovery');

    if (templateError) {
      console.error('Error updating password reset template:', templateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update password reset template',
        error: templateError
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Supabase configuration updated successfully',
      siteUrl
    });
  } catch (error) {
    console.error('Error configuring Supabase:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error
    });
  }
} 
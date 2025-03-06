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
    // Configure the password reset email template
    const { error: resetTemplateError } = await supabase.auth.admin.updateAuthConfig({
      config: {
        email_template_forgot_password: {
          subject: "Reset your Not At Home password",
          content: `
            <h2>Reset Your Password</h2>
            <p>Hello,</p>
            <p>Someone has requested a password reset for your Not At Home account.</p>
            <p>If this was you, please click the button below to reset your password:</p>
            <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Reset Password</a>
            <p>If you didn't request this change, you can safely ignore this email.</p>
            <p>This link will expire in 24 hours.</p>
            <p>Thank you,<br>The Not At Home Team</p>
          `
        }
      }
    });

    if (resetTemplateError) {
      console.error('Error updating password reset template:', resetTemplateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update password reset template',
        error: resetTemplateError
      });
    }

    // Configure the email sender
    const { error: senderError } = await supabase.auth.admin.updateAuthConfig({
      config: {
        email_template_sender_name: "Not At Home",
      }
    });

    if (senderError) {
      console.error('Error updating email sender:', senderError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update email sender',
        error: senderError
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Email templates configured successfully'
    });
  } catch (error) {
    console.error('Error configuring email templates:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error
    });
  }
} 
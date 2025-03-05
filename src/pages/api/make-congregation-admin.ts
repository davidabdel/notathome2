import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../supabase/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: `The HTTP ${req.method} method is not supported by this route.`,
    });
  }

  // Check if we have the service role key
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ 
      error: 'SUPABASE_SERVICE_ROLE_KEY is not set in environment variables',
      message: 'Server configuration error'
    });
  }

  try {
    // Get the current user session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'You must be logged in to access this resource',
      });
    }

    const userId = session.user.id;
    const { congregationId } = req.body;

    if (!congregationId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Congregation ID is required',
      });
    }

    // Check if the user has a role for this congregation
    const { data: existingRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .eq('congregation_id', congregationId);

    if (rolesError) {
      console.error('Error checking existing roles:', rolesError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to check existing roles',
      });
    }

    // If the user already has a role for this congregation, update it
    if (existingRoles && existingRoles.length > 0) {
      const { error: updateError } = await supabase
        .from('user_roles')
        .update({ role: 'congregation_admin' })
        .eq('user_id', userId)
        .eq('congregation_id', congregationId);

      if (updateError) {
        console.error('Error updating role:', updateError);
        return res.status(500).json({
          error: 'Database error',
          message: 'Failed to update role',
        });
      }
    } else {
      // If the user doesn't have a role for this congregation, insert a new one
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          congregation_id: congregationId,
          role: 'congregation_admin',
        });

      if (insertError) {
        console.error('Error inserting role:', insertError);
        return res.status(500).json({
          error: 'Database error',
          message: 'Failed to insert role',
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'You are now a congregation admin',
    });
  } catch (error: any) {
    console.error('Error making user a congregation admin:', error);
    return res.status(500).json({
      error: 'Server error',
      message: error.message || 'An unexpected error occurred',
    });
  }
} 
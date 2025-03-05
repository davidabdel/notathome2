import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if we have the service role key
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ 
        error: 'SUPABASE_SERVICE_ROLE_KEY is not set in environment variables',
        message: 'Server configuration error'
      });
    }
    
    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Get email and congregation name from request body
    const { email, congregationName } = req.body;
    
    if (!email || !congregationName) {
      return res.status(400).json({ 
        error: 'Bad request',
        message: 'Email and congregation name are required' 
      });
    }
    
    console.log('Assigning admin role for:', { email, congregationName });
    
    // Find the congregation by name
    const { data: congregation, error: congregationError } = await supabaseAdmin
      .from('congregations')
      .select('id, name')
      .eq('name', congregationName)
      .single();
    
    if (congregationError || !congregation) {
      console.error('Error finding congregation:', congregationError);
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Congregation not found' 
      });
    }
    
    // Find the user by email
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error listing users:', userError);
      return res.status(500).json({ 
        error: 'Database error',
        message: 'Failed to find user' 
      });
    }
    
    const user = users.find(u => u.email === email);
    
    if (!user) {
      console.error('User not found with email:', email);
      return res.status(404).json({ 
        error: 'Not found',
        message: 'User not found' 
      });
    }
    
    // Check if the user already has a role for this congregation
    const { data: existingRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .eq('congregation_id', congregation.id);
    
    if (rolesError) {
      console.error('Error checking existing roles:', rolesError);
      return res.status(500).json({ 
        error: 'Database error',
        message: 'Failed to check existing roles' 
      });
    }
    
    // If the user already has a role for this congregation, update it
    if (existingRoles && existingRoles.length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('user_roles')
        .update({ role: 'congregation_admin' })
        .eq('user_id', user.id)
        .eq('congregation_id', congregation.id);
      
      if (updateError) {
        console.error('Error updating role:', updateError);
        return res.status(500).json({ 
          error: 'Database error',
          message: 'Failed to update role' 
        });
      }
    } else {
      // If the user doesn't have a role for this congregation, insert a new one
      const { error: insertError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: user.id,
          congregation_id: congregation.id,
          role: 'congregation_admin'
        });
      
      if (insertError) {
        console.error('Error inserting role:', insertError);
        return res.status(500).json({ 
          error: 'Database error',
          message: 'Failed to insert role' 
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      message: `User ${email} is now an admin for congregation ${congregationName}`,
      user: {
        id: user.id,
        email: user.email
      },
      congregation: {
        id: congregation.id,
        name: congregation.name
      }
    });
  } catch (error: any) {
    console.error('Error assigning congregation admin:', error);
    return res.status(500).json({ 
      error: 'Server error',
      message: error.message || 'An unexpected error occurred' 
    });
  }
} 
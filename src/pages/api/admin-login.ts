import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // Get the pin from the request body
    const { pin } = req.body;
    
    if (!pin || pin.length < 3 || pin.length > 10) {
      return res.status(400).json({ error: 'PIN must be between 3 and 10 digits' });
    }
    
    // Check if we have the service role key
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ 
        error: 'SUPABASE_SERVICE_ROLE_KEY is not set in environment variables',
        message: 'Please add the SUPABASE_SERVICE_ROLE_KEY to your .env.local file'
      });
    }
    
    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // First check if the Admin Congregation exists
    let { data: congregation, error: checkError } = await supabaseAdmin
      .from('congregations')
      .select('*')
      .eq('name', 'Admin Congregation')
      .eq('status', 'active')
      .single();
    
    if (checkError) {
      return res.status(500).json({ 
        error: `Error checking for Admin Congregation: ${checkError.message}`,
        details: checkError
      });
    }
    
    // If congregation doesn't exist, create it
    if (!congregation) {
      const { data: newCongregation, error: insertError } = await supabaseAdmin
        .from('congregations')
        .insert({
          name: 'Admin Congregation',
          pin_code: '123456',
          status: 'active'
        })
        .select()
        .single();
      
      if (insertError) {
        return res.status(500).json({ 
          error: `Error inserting congregation: ${insertError.message}`,
          details: insertError
        });
      }
      
      // Use the newly created congregation
      congregation = newCongregation;
    }
    
    // Verify the PIN code
    if (String(congregation.pin_code) !== String(pin)) {
      return res.status(401).json({ error: 'Invalid PIN code' });
    }
    
    // Create a temporary email and password for the admin user
    const email = `admin-${Date.now()}@notathome.app`;
    const password = `Admin${Date.now()}!`;
    
    // Create a user with the admin role key
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    
    if (userError) {
      return res.status(500).json({ 
        error: `User creation error: ${userError.message}`,
        details: userError
      });
    }
    
    // Get the user ID
    const userId = userData.user?.id;
    
    if (!userId) {
      return res.status(500).json({ error: 'Failed to get user ID' });
    }
    
    // Add admin roles for this user
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert([
        {
          user_id: userId,
          congregation_id: congregation.id,
          role: 'admin'
        },
        {
          user_id: userId,
          congregation_id: congregation.id,
          role: 'congregation_admin'
        }
      ]);
    
    if (roleError) {
      // Log the error but continue
      console.error('Error assigning roles:', roleError);
    }
    
    // Return the credentials so the client can sign in
    return res.status(200).json({ 
      message: 'Admin user created successfully',
      congregation,
      credentials: {
        email,
        password
      }
    });
  } catch (error: any) {
    console.error('Error in admin-login API:', error);
    return res.status(500).json({ 
      error: 'An unexpected error occurred',
      message: error.message
    });
  }
} 
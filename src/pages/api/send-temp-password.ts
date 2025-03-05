import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

// Create a Supabase client with the service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Send temporary password API called with method:', req.method);

  // Check if the request method is allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get the email from the request body
  const { email } = req.body;
  
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid email' });
  }

  try {
    // Check if the user exists
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error fetching users:', userError);
      return res.status(500).json({ error: 'Failed to check user existence' });
    }
    
    const existingUser = userData.users.find(user => user.email === email);
    
    // Generate a temporary password (8 characters)
    const tempPassword = randomBytes(4).toString('hex');
    
    if (existingUser) {
      // User exists, update their password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password: tempPassword }
      );
      
      if (updateError) {
        console.error('Error updating user password:', updateError);
        return res.status(500).json({ error: 'Failed to update password' });
      }
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
      
      // Create a new user with the temporary password
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true
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
    }
    
    // Send email with temporary password
    // In a production environment, you would use a proper email service
    // For now, we'll just log it and return it in the response
    console.log(`Temporary password for ${email}: ${tempPassword}`);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Temporary password has been sent to your email',
      // Only include the password in development for testing
      ...(process.env.NODE_ENV === 'development' && { tempPassword })
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 
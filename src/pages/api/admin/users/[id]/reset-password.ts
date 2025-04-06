import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../../utils/adminClient';

// Create a Supabase admin client
const supabaseAdmin = createAdminClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check if the request method is allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get the user ID from the URL
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid user ID' });
  }

  // Get the authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header' });
  }

  // Extract the token
  const token = authHeader.split(' ')[1];
  
  try {
    // Verify the token and get the user
    const { data: { user: currentUser }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !currentUser) {
      console.error('Error verifying token:', userError);
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    
    // Check if the user is an admin
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .eq('role', 'admin');
    
    if (rolesError || !userRoles || userRoles.length === 0) {
      console.error('Error checking admin role:', rolesError);
      return res.status(403).json({ error: 'Forbidden: User is not an admin' });
    }
    
    // Verify the target user exists
    const { data: userData, error: userDataError } = await supabaseAdmin.auth.admin.getUserById(id);
    
    if (userDataError || !userData.user) {
      console.error('Error fetching user:', userDataError);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Send password reset email
    const { data, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: userData.user.email as string,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/auth/set-password`
      }
    });
    
    if (resetError) {
      console.error('Error sending password reset email:', resetError);
      return res.status(500).json({ error: 'Failed to send password reset email' });
    }
    
    return res.status(200).json({ success: true, message: 'Password reset email sent successfully' });
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 
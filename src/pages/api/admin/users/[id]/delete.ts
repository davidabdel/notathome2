import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Delete user API called with method:', req.method);

  // Check if the request method is allowed
  if (req.method !== 'DELETE') {
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
    
    console.log('Verified user:', currentUser.id);
    
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
    
    // Check if the user exists
    const { data: userData, error: userDataError } = await supabaseAdmin.auth.admin.getUserById(id);
    
    if (userDataError || !userData.user) {
      console.error('Error fetching user:', userDataError);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent deleting yourself
    if (id === currentUser.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }
    
    // Delete user roles first
    const { error: deleteRolesError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', id);
    
    if (deleteRolesError) {
      console.error('Error deleting user roles:', deleteRolesError);
      // Continue anyway, as we want to delete the user
    }
    
    // Delete the user
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(id);
    
    if (deleteUserError) {
      console.error('Error deleting user:', deleteUserError);
      return res.status(500).json({ error: 'Failed to delete user' });
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 
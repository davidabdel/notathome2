import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Update user API called with method:', req.method);

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
    
    // Get the request body
    const { roles, congregation_id } = req.body;
    
    if (!roles || !Array.isArray(roles)) {
      return res.status(400).json({ error: 'Invalid roles data' });
    }
    
    // Check if the user exists
    const { data: userData, error: userDataError } = await supabaseAdmin.auth.admin.getUserById(id);
    
    if (userDataError || !userData.user) {
      console.error('Error fetching user:', userDataError);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete existing roles
    const { error: deleteRolesError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', id);
    
    if (deleteRolesError) {
      console.error('Error deleting user roles:', deleteRolesError);
      return res.status(500).json({ error: 'Failed to update user roles' });
    }
    
    // Insert new roles
    const roleInserts = roles.map(role => ({
      user_id: id,
      role,
      congregation_id: congregation_id || null
    }));
    
    if (roleInserts.length > 0) {
      const { error: insertRolesError } = await supabaseAdmin
        .from('user_roles')
        .insert(roleInserts);
      
      if (insertRolesError) {
        console.error('Error inserting user roles:', insertRolesError);
        return res.status(500).json({ error: 'Failed to update user roles' });
      }
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'User updated successfully',
      user: {
        id,
        roles,
        congregation_id
      }
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('User details API called with method:', req.method);

  // Check if the request method is allowed
  if (req.method !== 'GET') {
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
    
    // Get the user details
    const { data: userData, error: userDataError } = await supabaseAdmin.auth.admin.getUserById(id);
    
    if (userDataError || !userData.user) {
      console.error('Error fetching user:', userDataError);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user roles
    const { data: roles, error: rolesDataError } = await supabaseAdmin
      .from('user_roles')
      .select('role, congregation_id')
      .eq('user_id', id);
    
    if (rolesDataError) {
      console.error('Error fetching user roles:', rolesDataError);
      return res.status(500).json({ error: 'Failed to fetch user roles' });
    }
    
    // Get congregation name if user has a congregation
    let congregationName = 'N/A';
    let congregationId = null;
    
    if (roles && roles.length > 0 && roles[0].congregation_id) {
      congregationId = roles[0].congregation_id;
      
      const { data: congregation, error: congregationError } = await supabaseAdmin
        .from('congregations')
        .select('name')
        .eq('id', congregationId)
        .single();
      
      if (!congregationError && congregation) {
        congregationName = congregation.name;
      }
    }
    
    // Prepare the user details
    const userDetails = {
      id: userData.user.id,
      email: userData.user.email,
      roles: roles ? roles.map(r => r.role) : [],
      congregation_name: congregationName,
      congregation_id: congregationId,
      created_at: userData.user.created_at,
      last_sign_in: userData.user.last_sign_in_at
    };
    
    return res.status(200).json({ user: userDetails });
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 
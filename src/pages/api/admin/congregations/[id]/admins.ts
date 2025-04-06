import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../../utils/adminClient';

// Create a Supabase admin client
const supabaseAdmin = createAdminClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get congregation ID from the URL
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid congregation ID' });
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
    
    // Check if the user is a super admin
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .eq('role', 'admin');
    
    if (rolesError || !userRoles || userRoles.length === 0) {
      return res.status(403).json({ error: 'Forbidden: User is not an admin' });
    }
    
    // Verify congregation exists
    const { data: congregation, error: congregationError } = await supabaseAdmin
      .from('congregations')
      .select('id, name')
      .eq('id', id)
      .single();
    
    if (congregationError || !congregation) {
      return res.status(404).json({ error: 'Congregation not found' });
    }

    // Handle different HTTP methods
    if (req.method === 'GET') {
      // Get all congregation admins
      const { data: roleData, error: roleError } = await supabaseAdmin
        .from('user_roles')
        .select('user_id, user_email')
        .eq('congregation_id', id)
        .eq('role', 'congregation_admin');
      
      if (roleError) {
        console.error('Error fetching congregation admins:', roleError);
        return res.status(500).json({ error: 'Failed to fetch congregation admins' });
      }
      
      // If no admins found, return empty array
      if (!roleData || roleData.length === 0) {
        return res.status(200).json({ admins: [] });
      }
      
      // Get user details for all admin IDs
      const userIds = roleData.map(role => role.user_id);
      const admins = [];
      
      for (const userId of userIds) {
        // Get user from auth.users
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (!userError && userData.user) {
          const admin = {
            id: userData.user.id,
            email: userData.user.email,
            created_at: userData.user.created_at,
            last_sign_in: userData.user.last_sign_in_at
          };
          
          admins.push(admin);
        }
      }
      
      return res.status(200).json({ admins });
    } 
    else if (req.method === 'POST') {
      // Add a new congregation admin
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }
      
      // Check if user exists or create a new one
      let userId: string;
      
      // First check if the user already exists
      const { data: existingUser, error: existingUserError } = await supabaseAdmin.auth.admin.listUsers();
      
      const userExists = existingUser?.users.find(user => user.email?.toLowerCase() === email.toLowerCase());
      
      if (userExists) {
        userId = userExists.id;
        
        // Check if user is already an admin for this congregation
        const { data: existingRole, error: existingRoleError } = await supabaseAdmin
          .from('user_roles')
          .select('id')
          .eq('user_id', userId)
          .eq('congregation_id', id)
          .eq('role', 'congregation_admin');
        
        if (!existingRoleError && existingRole && existingRole.length > 0) {
          return res.status(400).json({ error: 'User is already an admin for this congregation' });
        }
      } 
      else {
        // Create a new user
        const { data: newUser, error: newUserError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/auth/set-password`,
          data: {
            congregation_id: id,
            role: 'congregation_admin'
          }
        });
        
        if (newUserError || !newUser.user) {
          console.error('Error creating user:', newUserError);
          return res.status(500).json({ error: 'Failed to create user' });
        }
        
        userId = newUser.user.id;
      }
      
      // Add congregation_admin role
      const { error: insertRoleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userId,
          congregation_id: id,
          role: 'congregation_admin',
          user_email: email
        });
      
      if (insertRoleError) {
        console.error('Error adding congregation admin role:', insertRoleError);
        return res.status(500).json({ error: 'Failed to add congregation admin role' });
      }
      
      return res.status(201).json({ success: true, message: 'Congregation admin added successfully' });
    }
    else if (req.method === 'DELETE') {
      // Remove a congregation admin
      const { adminId } = req.body;
      
      if (!adminId || typeof adminId !== 'string') {
        return res.status(400).json({ error: 'Invalid or missing admin ID' });
      }
      
      // Remove the congregation_admin role for this user
      const { error: deleteRoleError } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', adminId)
        .eq('congregation_id', id)
        .eq('role', 'congregation_admin');
      
      if (deleteRoleError) {
        console.error('Error removing congregation admin role:', deleteRoleError);
        return res.status(500).json({ error: 'Failed to remove congregation admin role' });
      }
      
      return res.status(200).json({ success: true, message: 'Congregation admin removed successfully' });
    }
    else {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  }
  catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 
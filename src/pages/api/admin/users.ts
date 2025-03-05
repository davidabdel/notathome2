import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Service Role Key Length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);

  if (req.method === 'GET') {
    try {
      // Get all users from auth.users
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (authError) {
        throw authError;
      }
      
      // Get user roles from the user_roles table
      const { data: userRoles, error: rolesError } = await supabaseAdmin
        .from('user_roles')
        .select('user_id, role, congregation_id');
      
      if (rolesError) {
        console.warn('Error fetching user roles:', rolesError);
      }
      
      // Get congregations
      const { data: congregations, error: congError } = await supabaseAdmin
        .from('congregations')
        .select('id, name');
      
      if (congError) {
        console.warn('Error fetching congregations:', congError);
      }
      
      // Map auth users to our User interface
      const users = authUsers.users.map(authUser => {
        // Find role for this user
        const userRole = userRoles?.find(role => role.user_id === authUser.id);
        
        // Find congregation for this user
        const congregation = userRole?.congregation_id 
          ? congregations?.find(cong => cong.id === userRole.congregation_id)
          : null;
        
        return {
          id: authUser.id,
          email: authUser.email || 'No Email',
          role: userRole?.role || 'user',
          congregation_name: congregation?.name || 'None',
          created_at: authUser.created_at,
          last_sign_in: authUser.last_sign_in_at
        };
      });
      
      res.status(200).json({ users });
    } catch (error) {
      console.error('Error in users API:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { userId } = req.query;
      
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'User ID is required' });
      }
      
      console.log(`Deleting user ${userId}...`);
      
      // First delete user roles
      const { error: rolesError } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      
      if (rolesError) {
        console.error('Error deleting user roles:', rolesError);
        // Continue with user deletion even if roles deletion fails
      }
      
      // Then delete the user from auth
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      
      if (authError) {
        throw authError;
      }
      
      console.log(`User ${userId} deleted successfully`);
      res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 
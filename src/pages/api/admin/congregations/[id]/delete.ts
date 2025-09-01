import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow DELETE requests
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid congregation ID' });
  }

  try {
    console.log(`Attempting to delete congregation: ${id}`);
    
    // Get authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Create Supabase admin client with service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Verify the user is an admin
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Error verifying user:', userError);
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Check if user is admin
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();
    
    if (rolesError || !userRoles) {
      console.error('Error checking admin role:', rolesError);
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }
    
    console.log('User verified as admin, proceeding with deletion');
    
    // Check if congregation exists
    const { data: congregation, error: congregationError } = await supabaseAdmin
      .from('congregations')
      .select('id, name')
      .eq('id', id)
      .single();
    
    if (congregationError || !congregation) {
      console.error('Error finding congregation:', congregationError);
      return res.status(404).json({ error: 'Congregation not found' });
    }
    
    console.log(`Found congregation: ${congregation.name}, proceeding with deletion`);
    
    // Begin deletion process - use a transaction if possible
    
    // 1. Delete congregation_requests related to this congregation
    console.log('Deleting related congregation requests...');
    const { error: requestsError } = await supabaseAdmin
      .from('congregation_requests')
      .delete()
      .eq('name', congregation.name);
    
    if (requestsError) {
      console.error('Error deleting congregation requests:', requestsError);
      // Continue anyway, as this is not critical
    }
    
    // 2. Delete user roles associated with this congregation
    console.log('Deleting user roles...');
    const { error: rolesDeleteError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('congregation_id', id);
    
    if (rolesDeleteError) {
      console.error('Error deleting user roles:', rolesDeleteError);
      return res.status(500).json({ 
        error: 'Failed to delete user roles',
        details: rolesDeleteError.message
      });
    }
    
    // 3. Delete sessions associated with this congregation
    console.log('Deleting sessions...');
    try {
      const { error: sessionsError } = await supabaseAdmin
        .from('sessions')
        .delete()
        .eq('congregation_id', id);
      
      if (sessionsError) {
        console.error('Error deleting sessions:', sessionsError);
        // If the error is that the table doesn't exist, continue with deletion
        if (sessionsError.code === '42P01') { // Table doesn't exist error code
          console.log('Sessions table does not exist, continuing with deletion...');
        } else {
          // For other errors, return an error response
          return res.status(500).json({ 
            error: 'Failed to delete sessions',
            details: sessionsError.message
          });
        }
      }
    } catch (sessionErr: any) {
      console.error('Exception when deleting sessions:', sessionErr);
      // Continue with deletion even if sessions deletion fails
      console.log('Continuing with congregation deletion despite sessions error');
    }
    
    // 4. Finally delete the congregation itself
    console.log('Deleting congregation...');
    const { error: deleteError } = await supabaseAdmin
      .from('congregations')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      console.error('Error deleting congregation:', deleteError);
      return res.status(500).json({ 
        error: 'Failed to delete congregation',
        details: deleteError.message
      });
    }
    
    console.log(`Successfully deleted congregation: ${congregation.name}`);
    
    return res.status(200).json({ 
      success: true,
      message: `Congregation "${congregation.name}" successfully deleted`
    });
    
  } catch (err: any) {
    console.error('Unexpected error during congregation deletion:', err);
    return res.status(500).json({ 
      error: 'An unexpected error occurred',
      message: err.message
    });
  }
} 
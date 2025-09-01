import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/adminClient';
import { SupabaseClient } from '@supabase/supabase-js';

// Define types for our data
interface Congregation {
  id: string;
  name: string;
}

interface Session {
  id: string;
  code: string;
  congregation_id: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
  [key: string]: any; // For any additional fields
}

interface SessionWithCongregation extends Session {
  congregation_name: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseAdmin = createAdminClient();

    // First, ensure there's an admin policy for viewing sessions
    await createAdminSessionPolicy(supabaseAdmin);

    // Get active sessions
    const { data: activeSessions, error: activeSessionsError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString());

    if (activeSessionsError) {
      console.error('Error fetching active sessions:', activeSessionsError);
      return res.status(500).json({ error: 'Failed to fetch active sessions' });
    }

    // Get all sessions for comparison
    const { data: allSessions, error: allSessionsError } = await supabaseAdmin
      .from('sessions')
      .select('*');

    if (allSessionsError) {
      console.error('Error fetching all sessions:', allSessionsError);
    }

    // Get congregation names
    const { data: congregations, error: congregationsError } = await supabaseAdmin
      .from('congregations')
      .select('id, name');

    if (congregationsError) {
      console.error('Error fetching congregations:', congregationsError);
    }

    // Create a map of congregation IDs to names
    const congregationMap: Record<string, string> = {};
    if (congregations) {
      congregations.forEach((cong: Congregation) => {
        congregationMap[cong.id] = cong.name;
      });
    }

    // Log for debugging
    console.log(`Found ${activeSessions?.length || 0} active sessions`);
    console.log(`Found ${allSessions?.length || 0} total sessions`);
    
    if (activeSessions) {
      activeSessions.forEach((session: Session) => {
        console.log(`Active session: ${session.id}, congregation: ${congregationMap[session.congregation_id] || 'Unknown'}, expires: ${session.expires_at}`);
      });
    }

    // Add congregation names to active sessions
    const activeSessionsWithCongregation = activeSessions?.map((session: Session): SessionWithCongregation => ({
      ...session,
      congregation_name: congregationMap[session.congregation_id] || 'Unknown'
    }));

    return res.status(200).json({
      activeSessions: activeSessionsWithCongregation || [],
      totalSessions: allSessions?.length || 0,
      activeSessionsCount: activeSessions?.length || 0
    });
  } catch (error) {
    console.error('Error in active-sessions API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Function to create an admin policy for viewing all sessions
async function createAdminSessionPolicy(supabaseAdmin: SupabaseClient) {
  try {
    console.log('Creating admin session policy...');
    
    // Check if the policy already exists
    const { data: policies, error: policiesError } = await supabaseAdmin.rpc('execute_sql', {
      sql_query: `
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'sessions' AND policyname = 'admin_view_all_sessions';
      `
    });
    
    if (policiesError) {
      console.error('Error checking for existing policy:', policiesError);
      return;
    }
    
    // If policy doesn't exist, create it
    if (!policies || policies.length === 0) {
      const { error: policyError } = await supabaseAdmin.rpc('execute_sql', {
        sql_query: `
          -- Create policy for admins to view all sessions
          DROP POLICY IF EXISTS admin_view_all_sessions ON sessions;
          CREATE POLICY admin_view_all_sessions ON sessions
            FOR SELECT USING (
              auth.uid() IN (
                SELECT user_id FROM user_roles WHERE role = 'admin'
              )
            );
        `
      });
      
      if (policyError) {
        console.error('Error creating admin session policy:', policyError);
      } else {
        console.log('Admin session policy created successfully');
      }
    } else {
      console.log('Admin session policy already exists');
    }
  } catch (error) {
    console.error('Error in createAdminSessionPolicy:', error);
  }
} 
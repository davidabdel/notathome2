import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../../supabase/config';

interface UserRole {
  congregation_id: string;
  role: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check if user is authenticated
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'You must be logged in to access this resource',
    });
  }

  // Get user's role and congregation
  const { data: userRoles, error: rolesError } = await supabase
    .from('user_roles')
    .select('congregation_id, role')
    .eq('user_id', session.user.id);

  if (rolesError) {
    console.error('Error fetching user roles:', rolesError);
    return res.status(500).json({
      error: 'Database error',
      message: 'Failed to fetch user roles',
    });
  }

  if (!userRoles || userRoles.length === 0) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You are not associated with any congregation',
    });
  }

  // Check if user is a congregation admin or system admin
  const isAdmin = userRoles.some((role: UserRole) => 
    role.role === 'congregation_admin' || role.role === 'admin'
  );

  if (!isAdmin) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to manage territory maps',
    });
  }

  // Get the congregation ID (use the first one if multiple)
  const congregationId = userRoles[0].congregation_id;

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getMaps(req, res, congregationId);
    case 'POST':
      return createMap(req, res, congregationId);
    default:
      return res.status(405).json({
        error: 'Method not allowed',
        message: `The HTTP ${req.method} method is not supported by this route.`,
      });
  }
}

// Get all maps for a congregation
async function getMaps(
  req: NextApiRequest,
  res: NextApiResponse,
  congregationId: string
) {
  try {
    const { data, error } = await supabase
      .from('territory_maps')
      .select('*')
      .eq('congregation_id', congregationId)
      .order('name');

    if (error) {
      throw error;
    }

    return res.status(200).json({ maps: data });
  } catch (error: any) {
    console.error('Error fetching territory maps:', error);
    return res.status(500).json({
      error: 'Database error',
      message: 'Failed to fetch territory maps',
      details: error.message,
    });
  }
}

// Create a new map
async function createMap(
  req: NextApiRequest,
  res: NextApiResponse,
  congregationId: string
) {
  try {
    const { name, image_url } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Map name is required',
      });
    }

    const { data, error } = await supabase
      .from('territory_maps')
      .insert({
        name,
        image_url,
        congregation_id: congregationId,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.status(201).json({ 
      message: 'Territory map created successfully',
      map: data 
    });
  } catch (error: any) {
    console.error('Error creating territory map:', error);
    return res.status(500).json({
      error: 'Database error',
      message: 'Failed to create territory map',
      details: error.message,
    });
  }
} 
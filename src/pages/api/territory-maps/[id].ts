import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../../supabase/config';

interface UserRole {
  congregation_id: string;
  role: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get the map ID from the URL
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      error: 'Bad request',
      message: 'Map ID is required',
    });
  }

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

  // Verify the map belongs to the user's congregation
  const { data: map, error: mapError } = await supabase
    .from('territory_maps')
    .select('*')
    .eq('id', id)
    .single();

  if (mapError) {
    console.error('Error fetching territory map:', mapError);
    return res.status(404).json({
      error: 'Not found',
      message: 'Territory map not found',
    });
  }

  if (map.congregation_id !== congregationId) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to access this territory map',
    });
  }

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getMap(res, map);
    case 'PUT':
      return updateMap(req, res, id);
    case 'DELETE':
      return deleteMap(req, res, id, map.image_url);
    default:
      return res.status(405).json({
        error: 'Method not allowed',
        message: `The HTTP ${req.method} method is not supported by this route.`,
      });
  }
}

// Get a specific map
function getMap(res: NextApiResponse, map: any) {
  return res.status(200).json({ map });
}

// Update a map
async function updateMap(req: NextApiRequest, res: NextApiResponse, mapId: string) {
  try {
    const { name, image_url } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Map name is required',
      });
    }

    const updateData: { name: string; image_url?: string } = { name };
    
    // Only update image_url if provided
    if (image_url) {
      updateData.image_url = image_url;
    }

    const { data, error } = await supabase
      .from('territory_maps')
      .update(updateData)
      .eq('id', mapId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.status(200).json({ 
      message: 'Territory map updated successfully',
      map: data 
    });
  } catch (error: any) {
    console.error('Error updating territory map:', error);
    return res.status(500).json({
      error: 'Database error',
      message: 'Failed to update territory map',
      details: error.message,
    });
  }
}

// Delete a map
async function deleteMap(
  req: NextApiRequest, 
  res: NextApiResponse, 
  mapId: string,
  imageUrl?: string
) {
  try {
    // Delete the map record
    const { error: deleteError } = await supabase
      .from('territory_maps')
      .delete()
      .eq('id', mapId);

    if (deleteError) {
      throw deleteError;
    }

    // If there's an image URL, delete the file from storage
    if (imageUrl) {
      try {
        // Extract the file path from the URL
        const url = new URL(imageUrl);
        const pathParts = url.pathname.split('/');
        const filePath = pathParts.slice(pathParts.indexOf('maps') + 1).join('/');
        
        if (filePath) {
          await supabase.storage
            .from('maps')
            .remove([filePath]);
        }
      } catch (storageError) {
        // Log but don't fail if storage deletion fails
        console.error('Error deleting map image from storage:', storageError);
      }
    }

    return res.status(200).json({ 
      message: 'Territory map deleted successfully' 
    });
  } catch (error: any) {
    console.error('Error deleting territory map:', error);
    return res.status(500).json({
      error: 'Database error',
      message: 'Failed to delete territory map',
      details: error.message,
    });
  }
} 
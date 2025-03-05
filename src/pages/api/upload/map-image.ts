import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../../supabase/config';
import formidable, { File } from 'formidable';
import fs from 'fs';
import path from 'path';

// Disable the default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

interface UserRole {
  congregation_id: string;
  role: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: `The HTTP ${req.method} method is not supported by this route.`,
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
      message: 'You do not have permission to upload territory maps',
    });
  }

  // Get the congregation ID (use the first one if multiple)
  const congregationId = userRoles[0].congregation_id;

  try {
    // Parse the form data
    const form = formidable({
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
    });

    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err: Error | null, fields: formidable.Fields, files: formidable.Files) => {
        if (err) {
          reject(err);
          return;
        }
        resolve([fields, files]);
      });
    });

    // Check if a file was uploaded
    const fileField = files.file;
    if (!fileField || Array.isArray(fileField)) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'No file uploaded or multiple files received',
      });
    }
    
    const file = fileField as File;

    // Read the file
    const fileData = fs.readFileSync(file.filepath);
    
    // Generate a unique filename
    const fileExt = path.extname(file.originalFilename || 'image.jpg');
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${fileExt}`;
    const filePath = `territory-maps/${congregationId}/${fileName}`;
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('maps')
      .upload(filePath, fileData, {
        contentType: file.mimetype || 'image/jpeg',
      });
    
    if (uploadError) {
      throw uploadError;
    }
    
    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('maps')
      .getPublicUrl(filePath);
    
    // Return the URL
    return res.status(200).json({
      message: 'File uploaded successfully',
      url: publicUrl,
    });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return res.status(500).json({
      error: 'Upload failed',
      message: error.message || 'Failed to upload file',
    });
  }
} 
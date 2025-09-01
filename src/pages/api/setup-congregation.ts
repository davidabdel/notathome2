import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check if we have the service role key
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ 
        error: 'SUPABASE_SERVICE_ROLE_KEY is not set in environment variables' 
      });
    }
    
    // Check if the congregation already exists
    const { data: existingCongregations } = await supabaseAdmin
      .from('congregations')
      .select('id')
      .eq('name', 'Admin Congregation');
    
    if (existingCongregations && existingCongregations.length > 0) {
      return res.status(200).json({ 
        message: 'Admin Congregation already exists',
        congregation: existingCongregations[0]
      });
    }
    
    // Create the Admin Congregation
    const { data: congregation, error } = await supabaseAdmin
      .from('congregations')
      .insert({
        name: 'Admin Congregation',
        pin_code: '123456',
        status: 'active'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating congregation:', error);
      return res.status(500).json({ error: error.message });
    }
    
    return res.status(200).json({ 
      message: 'Admin Congregation created successfully',
      congregation 
    });
  } catch (error) {
    console.error('Error setting up congregation:', error);
    return res.status(500).json({ error: 'Failed to set up congregation' });
  }
} 
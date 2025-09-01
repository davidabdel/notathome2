import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check if we have the service role key
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ 
        error: 'SUPABASE_SERVICE_ROLE_KEY is not set in environment variables',
        message: 'Please add the SUPABASE_SERVICE_ROLE_KEY to your .env.local file'
      });
    }
    
    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // First check if the congregation already exists
    const { data: existingCongregations, error: checkError } = await supabaseAdmin
      .from('congregations')
      .select('*')
      .eq('name', 'Admin Congregation');
    
    if (checkError) {
      return res.status(500).json({ 
        error: `Error checking for existing congregation: ${checkError.message}`,
        details: checkError
      });
    }
    
    // If congregation exists, return it
    if (existingCongregations && existingCongregations.length > 0) {
      // Make sure it's active
      const { error: updateError } = await supabaseAdmin
        .from('congregations')
        .update({ status: 'active' })
        .eq('id', existingCongregations[0].id);
      
      if (updateError) {
        return res.status(500).json({ 
          error: `Error updating congregation status: ${updateError.message}`,
          details: updateError
        });
      }
      
      return res.status(200).json({ 
        message: 'Admin Congregation already exists and is now active',
        congregation: existingCongregations[0]
      });
    }
    
    // Insert the Admin Congregation
    const { data: newCongregation, error: insertError } = await supabaseAdmin
      .from('congregations')
      .insert({
        name: 'Admin Congregation',
        pin_code: '123456',
        status: 'active'
      })
      .select()
      .single();
    
    if (insertError) {
      return res.status(500).json({ 
        error: `Error inserting congregation: ${insertError.message}`,
        details: insertError
      });
    }
    
    return res.status(200).json({ 
      message: 'Admin Congregation created successfully',
      congregation: newCongregation
    });
  } catch (error: any) {
    console.error('Error in direct-insert API:', error);
    return res.status(500).json({ 
      error: 'An unexpected error occurred',
      message: error.message
    });
  }
} 
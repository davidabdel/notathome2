import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if we have the service role key
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ 
        error: 'SUPABASE_SERVICE_ROLE_KEY is not set in environment variables',
        message: 'Server configuration error'
      });
    }
    
    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Get congregation details from request body
    const { name, pin_code } = req.body;
    
    if (!name || !pin_code) {
      return res.status(400).json({ error: 'Congregation name and PIN code are required' });
    }
    
    console.log('Creating congregation:', { name, pinLength: pin_code.length });
    
    // Check if congregation already exists
    const { data: existingCongregations, error: checkError } = await supabaseAdmin
      .from('congregations')
      .select('id, name')
      .eq('name', name);
    
    if (checkError) {
      console.error('Error checking for existing congregation:', checkError);
      return res.status(500).json({ 
        error: 'Error checking for existing congregation',
        details: checkError.message
      });
    }
    
    // If congregation exists, return it
    if (existingCongregations && existingCongregations.length > 0) {
      // Make sure it's active
      const { error: updateError } = await supabaseAdmin
        .from('congregations')
        .update({ status: 'active', pin_code })
        .eq('id', existingCongregations[0].id);
      
      if (updateError) {
        console.error('Error updating congregation:', updateError);
        return res.status(500).json({ 
          error: 'Error updating congregation',
          details: updateError.message
        });
      }
      
      const { data: updatedCongregation } = await supabaseAdmin
        .from('congregations')
        .select('*')
        .eq('id', existingCongregations[0].id)
        .single();
      
      return res.status(200).json({ 
        message: 'Congregation already exists and has been updated',
        congregation: updatedCongregation
      });
    }
    
    // Insert the new congregation
    const { data: newCongregation, error: insertError } = await supabaseAdmin
      .from('congregations')
      .insert({
        name,
        pin_code,
        status: 'active'
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Error creating congregation:', insertError);
      return res.status(500).json({ 
        error: 'Error creating congregation',
        details: insertError.message
      });
    }
    
    return res.status(201).json({ 
      message: 'Congregation created successfully',
      congregation: newCongregation
    });
  } catch (error: any) {
    console.error('Error in create-congregation API:', error);
    return res.status(500).json({ 
      error: 'An unexpected error occurred',
      message: error.message
    });
  }
} 
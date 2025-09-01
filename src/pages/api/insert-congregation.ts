import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../supabase/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // First, check if the congregation already exists
    const { data: existingCongregations, error: checkError } = await supabase
      .from('congregations')
      .select('id')
      .eq('name', 'Admin Congregation');
    
    if (checkError) {
      console.error('Error checking for existing congregation:', checkError);
      // Continue anyway, as we'll try to insert
    }
    
    if (existingCongregations && existingCongregations.length > 0) {
      return res.status(200).json({ 
        message: 'Admin Congregation already exists',
        congregation: existingCongregations[0]
      });
    }
    
    // Try direct insert
    const { data, error: insertError } = await supabase
      .from('congregations')
      .insert({
        name: 'Admin Congregation',
        pin_code: '123456',
        status: 'active'
      })
      .select();
    
    if (insertError) {
      console.error('Error inserting congregation:', insertError);
      return res.status(500).json({ 
        error: insertError.message,
        message: 'Please run the following SQL in the Supabase SQL Editor:',
        sql: `
          INSERT INTO congregations (name, pin_code, status)
          VALUES ('Admin Congregation', '123456', 'active');
        `
      });
    }
    
    return res.status(200).json({ 
      message: 'Admin Congregation created successfully',
      congregation: data
    });
  } catch (error) {
    console.error('Error inserting congregation:', error);
    return res.status(500).json({ error: 'Failed to insert congregation' });
  }
} 
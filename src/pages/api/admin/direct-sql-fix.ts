import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create a Supabase client with the service role key for admin access
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Log for debugging
    console.log('Attempting direct SQL fix for contact_email column');
    
    // Execute raw SQL directly using the Supabase SQL API
    try {
      // First, try to add the column using direct SQL
      const addColumnResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_KEY || '',
        },
        body: JSON.stringify({
          query: `
            -- Add the contact_email column if it doesn't exist
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = 'congregations' AND column_name = 'contact_email'
              ) THEN
                ALTER TABLE congregations ADD COLUMN contact_email TEXT;
              END IF;
            END
            $$;
            
            -- Reload the PostgREST schema cache
            SELECT pg_notify('pgrst', 'reload schema');
            
            -- Return success message
            SELECT 'Column added and schema reloaded' as result;
          `
        })
      });
      
      if (!addColumnResponse.ok) {
        const errorData = await addColumnResponse.json();
        console.error('Error executing direct SQL:', errorData);
        return res.status(500).json({ 
          error: 'Failed to execute direct SQL fix',
          details: errorData
        });
      }
      
      // Try to verify the column exists by selecting from it
      const verifyResponse = await supabaseAdmin
        .from('congregations')
        .select('contact_email')
        .limit(1);
      
      if (verifyResponse.error) {
        console.error('Error verifying column addition:', verifyResponse.error);
        
        // Try one more approach - use the SQL API to check if the column exists
        const checkColumnResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_KEY || '',
          },
          body: JSON.stringify({
            query: `
              SELECT column_name 
              FROM information_schema.columns 
              WHERE table_name = 'congregations' AND column_name = 'contact_email';
            `
          })
        });
        
        if (!checkColumnResponse.ok) {
          return res.status(500).json({ 
            error: 'Failed to verify column addition',
            details: verifyResponse.error.message
          });
        }
        
        const checkColumnData = await checkColumnResponse.json();
        
        if (!checkColumnData || !checkColumnData.length) {
          return res.status(500).json({ 
            error: 'Column was not added successfully',
            details: 'Column not found in information_schema'
          });
        }
      }

      return res.status(200).json({ 
        success: true, 
        message: 'contact_email column added successfully and schema cache reloaded'
      });
    } catch (sqlError: any) {
      console.error('Error executing SQL:', sqlError);
      return res.status(500).json({ 
        error: 'Failed to add contact_email column',
        details: sqlError.message
      });
    }
  } catch (err: any) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ 
      error: 'An unexpected error occurred',
      details: err.message
    });
  }
} 
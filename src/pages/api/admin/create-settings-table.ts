import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Create settings table API called');
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // For now, we'll skip authentication to make it easier to create the table
    // TODO: Re-enable authentication after testing
    
    // Check if the table already exists
    const { data: tableExists, error: checkError } = await supabaseAdmin
      .from('system_settings')
      .select('id')
      .limit(1);
    
    if (checkError && checkError.code !== 'PGRST301') {
      // If the error is not "relation does not exist", then it's a different error
      console.error('Error checking if table exists:', checkError);
      return res.status(500).json({ error: 'Failed to check if table exists' });
    }
    
    // If the table already exists, we can skip creating it
    if (tableExists && tableExists.length > 0) {
      return res.status(200).json({ success: true, message: 'Settings table already exists' });
    }
    
    // Create the system_settings table using the migration SQL
    // We'll use the Supabase REST API to execute the SQL
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        query: `
          CREATE TABLE IF NOT EXISTS system_settings (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            key TEXT NOT NULL UNIQUE,
            value JSONB NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      })
    });
    
    if (!response.ok) {
      console.error('Error creating settings table:', await response.text());
      
      // Try inserting the settings directly
      const { error: insertError } = await supabaseAdmin
        .from('system_settings')
        .insert([
          { key: 'session_expiry_hours', value: 24 },
          { key: 'max_sessions_per_congregation', value: 10 },
          { key: 'allow_geotagging', value: true },
          { key: 'require_pin_verification', value: true }
        ]);
      
      if (insertError) {
        console.error('Error inserting default settings:', insertError);
        return res.status(500).json({ error: 'Failed to create settings table and insert default settings' });
      }
      
      return res.status(200).json({ success: true, message: 'Settings table exists and default settings inserted' });
    }
    
    // Insert default settings
    const { error: insertError } = await supabaseAdmin
      .from('system_settings')
      .insert([
        { key: 'session_expiry_hours', value: 24 },
        { key: 'max_sessions_per_congregation', value: 10 },
        { key: 'allow_geotagging', value: true },
        { key: 'require_pin_verification', value: true }
      ]);
    
    if (insertError) {
      console.error('Error inserting default settings:', insertError);
      return res.status(500).json({ error: 'Failed to insert default settings' });
    }
    
    return res.status(200).json({ success: true, message: 'Settings table created successfully' });
  } catch (err) {
    console.error('Unexpected error creating settings table:', err);
    return res.status(500).json({ error: 'Unexpected error creating settings table' });
  }
} 
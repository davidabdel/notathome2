import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with admin privileges
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Creating RPC functions...');

    // SQL to create the insert_address RPC function
    const createRpcSQL = `
      -- Create the insert_address function
      CREATE OR REPLACE FUNCTION insert_address(
        p_session_id UUID,
        p_block_number INTEGER,
        p_address TEXT,
        p_latitude DOUBLE PRECISION,
        p_longitude DOUBLE PRECISION,
        p_created_by UUID
      ) RETURNS JSONB AS $$
      DECLARE
        v_result JSONB;
        v_id UUID;
      BEGIN
        -- First, ensure the table exists
        BEGIN
          EXECUTE '
            CREATE TABLE IF NOT EXISTS not_at_home_addresses (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
              block_number INTEGER NOT NULL,
              address TEXT,
              latitude DOUBLE PRECISION,
              longitude DOUBLE PRECISION,
              created_by UUID REFERENCES auth.users(id),
              created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            )
          ';
          
          -- Enable Row Level Security if not already enabled
          EXECUTE 'ALTER TABLE not_at_home_addresses ENABLE ROW LEVEL SECURITY';
          
          -- Create RLS policies if they don't exist
          BEGIN
            EXECUTE '
              CREATE POLICY "Anyone can insert addresses" 
                ON not_at_home_addresses
                FOR INSERT
                WITH CHECK (true)
            ';
          EXCEPTION WHEN duplicate_object THEN
            -- Policy already exists, ignore
          END;
          
          BEGIN
            EXECUTE '
              CREATE POLICY "Anyone can view addresses" 
                ON not_at_home_addresses
                FOR SELECT
                USING (true)
            ';
          EXCEPTION WHEN duplicate_object THEN
            -- Policy already exists, ignore
          END;
          
          BEGIN
            EXECUTE '
              CREATE POLICY "Anyone can update addresses" 
                ON not_at_home_addresses
                FOR UPDATE
                USING (true)
            ';
          EXCEPTION WHEN duplicate_object THEN
            -- Policy already exists, ignore
          END;
          
          BEGIN
            EXECUTE '
              CREATE POLICY "Anyone can delete addresses" 
                ON not_at_home_addresses
                FOR DELETE
                USING (true)
            ';
          EXCEPTION WHEN duplicate_object THEN
            -- Policy already exists, ignore
          END;
        EXCEPTION WHEN others THEN
          -- Table creation failed, but we'll try to insert anyway
          RAISE NOTICE 'Table creation failed: %', SQLERRM;
        END;
        
        -- Insert the address
        INSERT INTO not_at_home_addresses (
          session_id,
          block_number,
          address,
          latitude,
          longitude,
          created_by
        ) VALUES (
          p_session_id,
          p_block_number,
          p_address,
          p_latitude,
          p_longitude,
          p_created_by
        )
        RETURNING id INTO v_id;
        
        -- Return the result
        SELECT jsonb_build_object(
          'id', v_id,
          'session_id', p_session_id,
          'block_number', p_block_number,
          'address', p_address,
          'latitude', p_latitude,
          'longitude', p_longitude,
          'created_by', p_created_by
        ) INTO v_result;
        
        RETURN v_result;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      
      -- Grant execute permission to everyone
      GRANT EXECUTE ON FUNCTION insert_address TO PUBLIC;
    `;

    // Execute the SQL to create the RPC function
    const { data, error } = await supabaseAdmin.rpc('execute_sql', { sql_query: createRpcSQL });

    if (error) {
      console.error('Error creating RPC functions:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create RPC functions',
        details: error.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'RPC functions created successfully'
    });
  } catch (error) {
    console.error('Error creating RPC functions:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create RPC functions',
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 
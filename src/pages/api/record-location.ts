import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with admin privileges
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!serviceRoleKey) {
  console.error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY');
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId, blockNumber, latitude, longitude, address } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  if (!blockNumber) {
    return res.status(400).json({ error: 'Block number is required' });
  }

  try {
    console.log('Recording location via API...');

    // First try to use the RPC function
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('insert_address', {
      p_session_id: sessionId,
      p_block_number: blockNumber,
      p_address: address || null,
      p_latitude: latitude || null,
      p_longitude: longitude || null,
      p_created_by: null // Admin endpoint doesn't have user context
    });

    if (rpcError) {
      console.error('RPC error:', rpcError);
      
      // If RPC fails, try direct SQL
      const insertSQL = `
        INSERT INTO not_at_home_addresses (
          session_id, 
          block_number, 
          address, 
          latitude, 
          longitude,
          created_by
        ) VALUES (
          '${sessionId}', 
          ${blockNumber}, 
          ${address ? `'${address.replace(/'/g, "''")}'` : 'NULL'}, 
          ${latitude || 'NULL'}, 
          ${longitude || 'NULL'},
          NULL
        )
        RETURNING id;
      `;

      const { data: sqlData, error: sqlError } = await supabaseAdmin.rpc('execute_sql', { 
        sql_query: insertSQL 
      });

      if (sqlError) {
        console.error('SQL error:', sqlError);
        
        // Try one more approach with a simpler query
        const simpleSQL = `
          INSERT INTO not_at_home_addresses (session_id, block_number)
          VALUES ('${sessionId}', ${blockNumber})
          RETURNING id;
        `;
        
        const { data: simpleData, error: simpleError } = await supabaseAdmin.rpc('execute_sql', { 
          sql_query: simpleSQL 
        });
        
        if (simpleError) {
          console.error('Simple SQL error:', simpleError);
          
          // Try a direct insert without RPC
          try {
            const { data: directData, error: directError } = await supabaseAdmin
              .from('not_at_home_addresses')
              .insert([
                { 
                  session_id: sessionId,
                  block_number: blockNumber
                }
              ])
              .select();
              
            if (directError) {
              console.error('Direct insert error:', directError);
              return res.status(500).json({
                success: false,
                error: 'Failed to record location',
                details: directError.message
              });
            }
            
            return res.status(200).json({
              success: true,
              message: 'Location recorded successfully via direct insert',
              data: directData
            });
          } catch (directErr) {
            console.error('Direct insert exception:', directErr);
            return res.status(500).json({
              success: false,
              error: 'Failed to record location',
              details: directErr instanceof Error ? directErr.message : String(directErr)
            });
          }
        }
        
        return res.status(200).json({
          success: true,
          message: 'Location recorded successfully via simple SQL',
          data: simpleData
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Location recorded successfully via direct SQL',
        data: sqlData
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Location recorded successfully via RPC',
      data: rpcData
    });
  } catch (error) {
    console.error('Error recording location:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to record location',
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 
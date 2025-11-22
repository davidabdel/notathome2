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
    try {
        console.log('Querying triggers via direct select...');

        // Try to query information_schema directly
        // Note: This might fail if the Data API doesn't expose information_schema
        // But with service_role key it might work if we use the RPC to grant access or if it's already accessible?
        // Actually, Supabase Data API usually exposes "public" schema by default.
        // Accessing other schemas requires configuration.

        // Let's try the RPC again but with a different assumption or maybe the previous RPC call failed to return data for some reason.
        // If the RPC is "execute_sql", it might be a custom function.

        // Let's try to see if we can find the definition of execute_sql
        // But we can't.

        // Let's try to use the RPC to select from pg_trigger directly?

        const findTriggersSQL = `
      SELECT 
        tgname as trigger_name,
        relname as table_name
      FROM pg_trigger
      JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
      WHERE tgisinternal = false;
    `;

        // If the RPC returns the result of the query, it should work.
        // If it returns void/success json, then we can't use it for SELECTs.

        // Let's assume the previous RPC call returned {"success": true} because the function is defined to return that, 
        // OR because the query was treated as a command that doesn't return rows?

        // Let's try to use the supabase client to check for sessions table triggers, maybe we can see them?
        // No, the client doesn't expose triggers.

        // Let's try to use the RPC to return JSON directly.
        const jsonSQL = `
      SELECT json_agg(t) FROM (
        SELECT 
          event_object_table as table_name,
          trigger_name,
          action_statement,
          action_timing
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
      ) t;
    `;

        const { data: triggers, error: triggerError } = await supabaseAdmin.rpc('execute_sql', { sql_query: jsonSQL });

        return res.status(200).json({
            success: true,
            triggers: triggers,
            note: "Attempted to fetch triggers via RPC"
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed',
            details: error instanceof Error ? error.message : String(error)
        });
    }
}

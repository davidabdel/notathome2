import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with admin privileges
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        return res.status(500).json({
            success: false,
            message: 'Missing Supabase credentials',
            details: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set'
        });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    try {
        console.log('Adding blocks column to territory_maps table...');

        // Use direct SQL query to add the column
        const response = await fetch(`${supabaseUrl}/rest/v1/sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceRoleKey}`,
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_KEY || '',
            },
            body: JSON.stringify({
                query: `ALTER TABLE territory_maps ADD COLUMN IF NOT EXISTS blocks INTEGER DEFAULT 10;`
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error adding blocks column:', errorText);

            // Fallback to RPC if direct SQL fails
            const { error: rpcError } = await supabase.rpc('execute_sql', {
                sql_query: `ALTER TABLE territory_maps ADD COLUMN IF NOT EXISTS blocks INTEGER DEFAULT 10;`
            });

            if (rpcError) {
                console.error('Error adding blocks column with RPC:', rpcError);
                throw new Error(`Failed to add blocks column: ${rpcError.message}`);
            }
        }

        // Refresh schema cache
        await supabase.rpc('execute_sql', {
            sql_query: `SELECT pg_notify('pgrst', 'reload schema');`
        });

        return res.status(200).json({
            success: true,
            message: 'blocks column added/verified successfully'
        });
    } catch (error: any) {
        console.error('Error adding blocks column:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to add blocks column',
            details: error.message || 'Unknown error'
        });
    }
}

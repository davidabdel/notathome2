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
        console.log('Adding notification_email column to congregations table...');

        // Use direct SQL query to add the column
        // Note: This endpoint might not be enabled on all Supabase projects
        const response = await fetch(`${supabaseUrl}/rest/v1/sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceRoleKey}`,
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_KEY || '',
            },
            body: JSON.stringify({
                query: `ALTER TABLE congregations ADD COLUMN IF NOT EXISTS notification_email TEXT;`
            })
        });

        if (!response.ok) {
            // If direct SQL fails, try RPC
            console.log('Direct SQL failed, trying RPC...');

            const { error: rpcError } = await supabase.rpc('execute_sql', {
                sql_query: `ALTER TABLE congregations ADD COLUMN IF NOT EXISTS notification_email TEXT;`
            });

            if (rpcError) {
                console.error('Error adding notification_email column with RPC:', rpcError);

                // Try one more fallback: exec_sql (older name)
                const { error: execError } = await supabase.rpc('exec_sql', {
                    sql_query: `ALTER TABLE congregations ADD COLUMN IF NOT EXISTS notification_email TEXT;`
                });

                if (execError) {
                    throw new Error(`Failed to add notification_email column: ${rpcError.message} / ${execError.message}`);
                }
            }
        }

        // Refresh schema cache
        await supabase.rpc('reload_schema');

        return res.status(200).json({
            success: true,
            message: 'notification_email column added/verified successfully'
        });
    } catch (error: any) {
        console.error('Error adding notification_email column:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to add notification_email column',
            details: error.message || 'Unknown error'
        });
    }
}

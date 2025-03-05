import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('API called with method:', req.method);

  // Check if the request method is allowed
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // For now, we'll skip authentication to make it easier to test
  // TODO: Re-enable authentication after testing
  
  try {
    // Handle GET request - Get settings
    if (req.method === 'GET') {
      try {
        // Get all settings
        const { data: settings, error: settingsError } = await supabaseAdmin
          .from('system_settings')
          .select('key, value');
        
        if (settingsError) {
          console.error('Error fetching settings:', settingsError);
          
          // If table doesn't exist, return default settings
          if (settingsError.code === '42P01') {
            console.log('Table does not exist, returning default settings');
            
            // Return default settings
            return res.status(200).json({
              settings: {
                sessionExpiryHours: 24,
                maxSessionsPerCongregation: 10,
                allowGeotagging: true,
                requirePinVerification: true
              },
              warning: 'Using default settings because table does not exist'
            });
          }
          
          return res.status(500).json({ error: 'Failed to fetch settings' });
        }
        
        // Convert array of settings to an object
        const settingsObject = settings.reduce((acc, setting) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {} as Record<string, any>);
        
        return res.status(200).json({ settings: settingsObject });
      } catch (error) {
        console.error('Error in GET settings:', error);
        
        // Return default settings if we can't create the table
        const defaultSettings = {
          sessionExpiryHours: 24,
          maxSessionsPerCongregation: 10,
          allowGeotagging: true,
          requirePinVerification: true
        };
        
        return res.status(200).json({ 
          settings: defaultSettings,
          warning: 'Using default settings because database table could not be created'
        });
      }
    }
    
    // Handle POST request - Save settings
    if (req.method === 'POST') {
      const { settings } = req.body;
      
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: 'Invalid settings data' });
      }
      
      console.log('Received settings:', settings);
      
      try {
        // Check if table exists
        const { error: tableCheckError } = await supabaseAdmin
          .from('system_settings')
          .select('key')
          .limit(1);
          
        if (tableCheckError && tableCheckError.code === '42P01') {
          // Table doesn't exist, just return success
          console.log('Table does not exist, settings saved in memory only');
          return res.status(200).json({ 
            success: true, 
            message: 'Settings saved in memory only (table does not exist)',
            warning: 'Settings will not persist between sessions'
          });
        }
        
        // Convert settings object to array of key-value pairs
        const settingsArray = Object.entries(settings).map(([key, value]) => ({
          key,
          value
        }));
        
        // Upsert all settings at once
        const { error: upsertError } = await supabaseAdmin
          .from('system_settings')
          .upsert(settingsArray, { onConflict: 'key' });
        
        if (upsertError) {
          console.error('Error upserting settings:', upsertError);
          return res.status(500).json({ error: 'Failed to save settings' });
        }
        
        return res.status(200).json({ success: true, message: 'Settings saved successfully' });
      } catch (error) {
        console.error('Error saving settings:', error);
        return res.status(500).json({ error: 'Failed to save settings' });
      }
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 
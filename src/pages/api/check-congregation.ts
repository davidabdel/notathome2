import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../supabase/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get all congregations
    const { data: congregations, error } = await supabase
      .from('congregations')
      .select('*');
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    return res.status(200).json({ congregations });
  } catch (error) {
    console.error('Error checking congregations:', error);
    return res.status(500).json({ error: 'Failed to check congregations' });
  }
} 
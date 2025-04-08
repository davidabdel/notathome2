import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../supabase/config';
import { sendCongregationRequestNotification } from '../../utils/email';

interface CongregationRequest {
  name: string;
  pin_code: string;
  contact_email: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, pin_code, contact_email } = req.body as CongregationRequest;

    // Basic validation
    if (!name || !pin_code || !contact_email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (pin_code.length < 3 || pin_code.length > 10 || !/^\d+$/.test(pin_code)) {
      return res.status(400).json({ error: 'PIN code must be between 3 and 10 digits' });
    }

    // Insert the request into the congregation_requests table
    const { data, error } = await supabase
      .from('congregation_requests')
      .insert([{ name, pin_code, contact_email }]);

    if (error) {
      console.error('Error submitting congregation request:', error);
      return res.status(500).json({ error: error.message });
    }

    // Send email notification
    try {
      await sendCongregationRequestNotification(name, contact_email, pin_code);
      console.log('Congregation request notification email sent successfully');
    } catch (emailError) {
      // Don't fail the request if email fails, just log the error
      console.error('Failed to send congregation request notification email:', emailError);
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Congregation request submitted successfully' 
    });
  } catch (err) {
    console.error('Error processing congregation request:', err);
    return res.status(500).json({ 
      error: err instanceof Error ? err.message : 'An unexpected error occurred' 
    });
  }
} 
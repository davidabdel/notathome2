import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Create a Supabase client with the service role key
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  // Log for debugging
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Service Role Key Length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);

  if (req.method === 'GET') {
    try {
      // Fetch real congregation requests from the database
      const { data, error } = await supabaseAdmin
        .from('congregation_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching congregation requests:', error);
        return res.status(500).json({ 
          error: error.message,
          details: error.details,
          hint: error.hint
        });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error('Error in congregation requests API:', error);
      return res.status(500).json({ error: 'Failed to fetch congregation requests' });
    }
  } else if (req.method === 'POST') {
    try {
      const { id, action } = req.body;

      if (!id || !action) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (action === 'approve') {
        // Get the congregation request details
        const { data: requestData, error: requestError } = await supabaseAdmin
          .from('congregation_requests')
          .select('*')
          .eq('id', id)
          .single();

        if (requestError) {
          console.error('Error fetching congregation request:', requestError);
          return res.status(500).json({ error: requestError.message });
        }

        if (!requestData) {
          return res.status(404).json({ error: 'Congregation request not found' });
        }

        // Create a new congregation
        const { data: congregationData, error: congregationError } = await supabaseAdmin
          .from('congregations')
          .insert([
            {
              name: requestData.name,
              pin_code: requestData.pin_code,
              status: 'active',
              contact_email: requestData.contact_email // Store the contact email in the congregation
            }
          ])
          .select()
          .single();

        if (congregationError) {
          console.error('Error creating congregation:', congregationError);
          return res.status(500).json({ error: congregationError.message });
        }

        // Check if a user with this email already exists
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (userError) {
          console.error('Error fetching users:', userError);
          return res.status(500).json({ error: 'Failed to check user existence' });
        }
        
        const existingUser = userData.users.find(user => user.email === requestData.contact_email);
        let userId;
        
        if (existingUser) {
          // User exists, use their ID
          userId = existingUser.id;
          console.log(`User with email ${requestData.contact_email} already exists with ID ${userId}`);
        } else {
          // Create a new user with a temporary password
          const tempPassword = randomBytes(4).toString('hex');
          
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: requestData.contact_email,
            password: tempPassword,
            email_confirm: true
          });
          
          if (createError) {
            console.error('Error creating user:', createError);
            return res.status(500).json({ error: 'Failed to create user account for congregation admin' });
          }
          
          userId = newUser.user.id;
          console.log(`Created new user with email ${requestData.contact_email}, ID ${userId}, and temp password ${tempPassword}`);
        }
        
        // Assign congregation admin role to the user
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: userId,
            congregation_id: congregationData.id,
            role: 'congregation_admin',
            user_email: requestData.contact_email // Store the email in the user_roles table
          });
        
        if (roleError) {
          console.error('Error assigning admin role:', roleError);
          return res.status(500).json({ error: 'Failed to assign admin role' });
        }

        // Update the request status
        const { error: updateError } = await supabaseAdmin
          .from('congregation_requests')
          .update({ status: 'approved' })
          .eq('id', id);

        if (updateError) {
          console.error('Error updating congregation request:', updateError);
          return res.status(500).json({ error: updateError.message });
        }

        return res.status(200).json({ 
          message: 'Congregation request approved', 
          congregation: congregationData,
          admin: {
            email: requestData.contact_email,
            userId
          }
        });
      } else if (action === 'reject') {
        // Update the request status
        const { error: updateError } = await supabaseAdmin
          .from('congregation_requests')
          .update({ status: 'rejected' })
          .eq('id', id);

        if (updateError) {
          console.error('Error updating congregation request:', updateError);
          return res.status(500).json({ error: updateError.message });
        }

        return res.status(200).json({ message: 'Congregation request rejected' });
      } else {
        return res.status(400).json({ error: 'Invalid action' });
      }
    } catch (error) {
      console.error('Error in congregation requests API:', error);
      return res.status(500).json({ error: 'Failed to process congregation request' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
} 
import { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes } from 'crypto';
import { createAdminClient } from '../../../utils/adminClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Log environment variables (without revealing values)
    console.log('congregation-requests.ts: Environment check');
    console.log('NEXT_PUBLIC_SUPABASE_URL defined =', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('NEXT_PUBLIC_SUPABASE_URL length =', process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0);
    console.log('SUPABASE_SERVICE_ROLE_KEY defined =', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('SUPABASE_SERVICE_ROLE_KEY length =', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);
    
    // Create a Supabase admin client using our utility function
    console.log('Creating Supabase admin client');
    const supabaseAdmin = createAdminClient();
    console.log('Supabase admin client created');

    // Log for debugging
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'defined' : 'undefined');
    console.log('Service Role Key Length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);

    if (req.method === 'GET') {
      try {
        console.log('Handling GET request for congregation requests');
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
            hint: error.hint,
            code: error.code
          });
        }

        console.log(`Found ${data?.length || 0} pending congregation requests`);
        return res.status(200).json(data);
      } catch (e) {
        console.error('Exception in GET congregation requests:', e);
        return res.status(500).json({ 
          error: 'Failed to fetch congregation requests',
          details: e instanceof Error ? e.message : String(e)
        });
      }
    } else if (req.method === 'POST') {
      try {
        console.log('Handling POST request for congregation requests');
        const { id, action } = req.body;

        if (!id || !action) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        console.log(`Processing ${action} action for congregation request ${id}`);

        if (action === 'approve') {
          // Get the congregation request details
          try {
            const { data: requestData, error: requestError } = await supabaseAdmin
              .from('congregation_requests')
              .select('*')
              .eq('id', id)
              .single();

            if (requestError) {
              console.error('Error fetching congregation request:', requestError);
              return res.status(500).json({ 
                error: requestError.message,
                details: requestError.details,
                hint: requestError.hint,
                code: requestError.code
              });
            }

            if (!requestData) {
              return res.status(404).json({ error: 'Congregation request not found' });
            }

            console.log('Found congregation request:', requestData);

            // Create a new congregation
            try {
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
                return res.status(500).json({ 
                  error: congregationError.message,
                  details: congregationError.details,
                  hint: congregationError.hint,
                  code: congregationError.code
                });
              }

              console.log('Created new congregation:', congregationData);

              // Check if a user with this email already exists
              try {
                const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
                
                if (userError) {
                  console.error('Error fetching users:', userError);
                  return res.status(500).json({ 
                    error: 'Failed to check user existence',
                    details: userError.message
                  });
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
                  
                  try {
                    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                      email: requestData.contact_email,
                      password: tempPassword,
                      email_confirm: true
                    });
                    
                    if (createError) {
                      console.error('Error creating user:', createError);
                      return res.status(500).json({ 
                        error: 'Failed to create user account for congregation admin',
                        details: createError.message
                      });
                    }
                    
                    userId = newUser.user.id;
                    console.log(`Created new user with email ${requestData.contact_email}, ID ${userId}, and temp password ${tempPassword}`);
                  } catch (e) {
                    console.error('Exception creating user:', e);
                    return res.status(500).json({ 
                      error: 'Exception creating user account',
                      details: e instanceof Error ? e.message : String(e)
                    });
                  }
                }
                
                // Assign congregation admin role to the user
                try {
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
                    return res.status(500).json({ 
                      error: 'Failed to assign admin role',
                      details: roleError.message,
                      code: roleError.code
                    });
                  }

                  console.log(`Assigned congregation_admin role to user ${userId} for congregation ${congregationData.id}`);

                  // Update the request status
                  try {
                    const { error: updateError } = await supabaseAdmin
                      .from('congregation_requests')
                      .update({ status: 'approved' })
                      .eq('id', id);

                    if (updateError) {
                      console.error('Error updating congregation request:', updateError);
                      return res.status(500).json({ 
                        error: updateError.message,
                        details: updateError.details,
                        hint: updateError.hint,
                        code: updateError.code
                      });
                    }

                    console.log(`Updated congregation request ${id} status to approved`);

                    return res.status(200).json({ 
                      message: 'Congregation request approved', 
                      congregation: congregationData,
                      admin: {
                        email: requestData.contact_email,
                        userId
                      }
                    });
                  } catch (e) {
                    console.error('Exception updating request status:', e);
                    return res.status(500).json({ 
                      error: 'Exception updating request status',
                      details: e instanceof Error ? e.message : String(e)
                    });
                  }
                } catch (e) {
                  console.error('Exception assigning admin role:', e);
                  return res.status(500).json({ 
                    error: 'Exception assigning admin role',
                    details: e instanceof Error ? e.message : String(e)
                  });
                }
              } catch (e) {
                console.error('Exception checking user existence:', e);
                return res.status(500).json({ 
                  error: 'Exception checking user existence',
                  details: e instanceof Error ? e.message : String(e)
                });
              }
            } catch (e) {
              console.error('Exception creating congregation:', e);
              return res.status(500).json({ 
                error: 'Exception creating congregation',
                details: e instanceof Error ? e.message : String(e)
              });
            }
          } catch (e) {
            console.error('Exception fetching congregation request:', e);
            return res.status(500).json({ 
              error: 'Exception fetching congregation request',
              details: e instanceof Error ? e.message : String(e)
            });
          }
        } else if (action === 'reject') {
          // Update the request status
          try {
            const { error: updateError } = await supabaseAdmin
              .from('congregation_requests')
              .update({ status: 'rejected' })
              .eq('id', id);

            if (updateError) {
              console.error('Error updating congregation request:', updateError);
              return res.status(500).json({ 
                error: updateError.message,
                details: updateError.details,
                hint: updateError.hint,
                code: updateError.code
              });
            }

            console.log(`Updated congregation request ${id} status to rejected`);
            return res.status(200).json({ message: 'Congregation request rejected' });
          } catch (e) {
            console.error('Exception rejecting congregation request:', e);
            return res.status(500).json({ 
              error: 'Exception rejecting congregation request',
              details: e instanceof Error ? e.message : String(e)
            });
          }
        } else {
          return res.status(400).json({ error: 'Invalid action' });
        }
      } catch (e) {
        console.error('Exception in POST congregation requests:', e);
        return res.status(500).json({ 
          error: 'Failed to process congregation request',
          details: e instanceof Error ? e.message : String(e)
        });
      }
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (e) {
    console.error('Top-level exception in congregation requests:', e);
    return res.status(500).json({ 
      error: 'Unexpected error in congregation requests',
      details: e instanceof Error ? e.message : String(e)
    });
  }
} 
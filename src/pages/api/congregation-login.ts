import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../utils/adminClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Log environment variables (without revealing values)
    console.log('congregation-login.ts: Environment check');
    console.log('NEXT_PUBLIC_SUPABASE_URL defined =', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('NEXT_PUBLIC_SUPABASE_URL length =', process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0);
    console.log('SUPABASE_SERVICE_ROLE_KEY defined =', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('SUPABASE_SERVICE_ROLE_KEY length =', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);
    
    // Create a Supabase admin client
    console.log('Creating Supabase admin client');
    const supabaseAdmin = createAdminClient();
    console.log('Supabase admin client created');
    
    // Get congregation name and pin from request body
    const { congregationName, pin } = req.body;
    
    if (!congregationName || !pin) {
      return res.status(400).json({ error: 'Congregation name and PIN are required' });
    }
    
    console.log('Congregation login attempt:', { 
      congregationName, 
      pinLength: pin.length,
      pin: pin // Log the actual PIN for debugging
    });
    
    // Get all congregations for debugging
    console.log('Fetching all congregations');
    try {
      const { data: allCongregations, error: allError } = await supabaseAdmin
        .from('congregations')
        .select('id, name, pin_code, status');
      
      console.log('All congregations:', allCongregations);
      
      if (allError) {
        console.error('Error fetching all congregations:', allError);
        return res.status(500).json({ 
          error: 'Error fetching congregations', 
          details: allError.message,
          code: allError.code
        });
      }
    } catch (e) {
      console.error('Exception fetching all congregations:', e);
      return res.status(500).json({ 
        error: 'Exception fetching congregations', 
        details: e instanceof Error ? e.message : String(e)
      });
    }
    
    // First try exact match
    console.log('Trying exact match for congregation:', congregationName);
    try {
      const { data: exactMatch, error: exactError } = await supabaseAdmin
        .from('congregations')
        .select('id, name, pin_code, status')
        .eq('name', congregationName)
        .eq('status', 'active');
      
      console.log('Exact match results:', exactMatch);
      
      if (exactError) {
        console.error('Error finding congregation:', exactError);
        return res.status(500).json({ 
          error: 'Error finding congregation', 
          details: exactError.message,
          code: exactError.code
        });
      }
      
      // If exact match found, check PIN
      if (exactMatch && exactMatch.length > 0) {
        const congregation = exactMatch[0];
        
        console.log('Found exact match congregation:', {
          id: congregation.id,
          name: congregation.name,
          pin_code: congregation.pin_code,
          status: congregation.status,
          enteredPin: pin,
          pinMatch: String(congregation.pin_code) === String(pin)
        });
        
        // Verify the PIN code
        if (String(congregation.pin_code) === String(pin)) {
          // Create a unique email and password for this session
          const sessionEmail = `anonymous-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@notathome.app`;
          const sessionPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
          
          console.log('Creating anonymous user with email:', sessionEmail);
          
          // First create the user
          try {
            const { data: userData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
              email: sessionEmail,
              password: sessionPassword,
              email_confirm: true
            });
            
            if (createUserError) {
              console.error('Error creating anonymous user:', createUserError);
              return res.status(500).json({ 
                error: 'Error creating user session',
                details: createUserError.message
              });
            }
            
            if (!userData || !userData.user) {
              console.error('No user data returned from createUser');
              return res.status(500).json({ error: 'Failed to create user' });
            }
            
            const userId = userData.user.id;
            
            // Add user role for this user
            const { error: roleError } = await supabaseAdmin
              .from('user_roles')
              .insert({
                user_id: userId,
                congregation_id: congregation.id,
                role: 'user'
              });
            
            if (roleError) {
              console.error('Error assigning role:', roleError);
              // Continue anyway
            }
            
            // Now sign in with the created user to get a session
            const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
              email: sessionEmail,
              password: sessionPassword
            });
            
            if (signInError) {
              console.error('Error signing in with created user:', signInError);
              return res.status(500).json({ 
                error: 'Error creating session',
                details: signInError.message
              });
            }
            
            if (!signInData || !signInData.session) {
              console.error('No session data returned from signIn');
              return res.status(500).json({ error: 'Failed to create session' });
            }
            
            // Return success with session
            return res.status(200).json({
              success: true,
              congregation: {
                id: congregation.id,
                name: congregation.name
              },
              session: signInData.session
            });
          } catch (e) {
            console.error('Exception in user creation/login:', e);
            return res.status(500).json({ 
              error: 'Exception in user creation/login', 
              details: e instanceof Error ? e.message : String(e)
            });
          }
        } else {
          console.log('PIN code mismatch:', {
            congregationPin: congregation.pin_code,
            enteredPin: pin
          });
          return res.status(401).json({ 
            error: 'Invalid PIN code',
            debug: {
              congregationPin: congregation.pin_code,
              enteredPin: pin
            }
          });
        }
      }
    } catch (e) {
      console.error('Exception in exact match search:', e);
      return res.status(500).json({ 
        error: 'Exception in exact match search', 
        details: e instanceof Error ? e.message : String(e)
      });
    }
    
    // If no exact match, try case-insensitive search
    console.log('No exact match found, trying case-insensitive search');
    try {
      const { data: congregations, error: congregationError } = await supabaseAdmin
        .from('congregations')
        .select('id, name, pin_code, status')
        .ilike('name', `%${congregationName}%`)
        .eq('status', 'active');
      
      console.log('Case-insensitive search results:', congregations);
      
      if (congregationError) {
        console.error('Error searching congregations:', congregationError);
        return res.status(500).json({ 
          error: 'Error searching for congregation',
          details: congregationError.message,
          code: congregationError.code
        });
      }
      
      if (!congregations || congregations.length === 0) {
        return res.status(404).json({ 
          error: 'Congregation not found or not active',
          debug: {
            searchTerm: congregationName
          }
        });
      }
      
      // Use the first matching congregation
      const congregation = congregations[0];
      
      console.log('Found congregation via search:', {
        id: congregation.id,
        name: congregation.name,
        pin_code: congregation.pin_code,
        status: congregation.status,
        enteredPin: pin,
        pinMatch: String(congregation.pin_code) === String(pin)
      });
      
      // Verify the PIN code
      if (String(congregation.pin_code) !== String(pin)) {
        console.log('PIN code mismatch:', {
          congregationPin: congregation.pin_code,
          enteredPin: pin
        });
        return res.status(401).json({ 
          error: 'Invalid PIN code',
          debug: {
            congregationPin: congregation.pin_code,
            enteredPin: pin
          }
        });
      }
      
      // Create a unique email and password for this session
      const sessionEmail = `anonymous-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@notathome.app`;
      const sessionPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      
      console.log('Creating anonymous user with email:', sessionEmail);
      
      try {
        // First create the user
        const { data: userData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
          email: sessionEmail,
          password: sessionPassword,
          email_confirm: true
        });
        
        if (createUserError) {
          console.error('Error creating anonymous user:', createUserError);
          return res.status(500).json({ 
            error: 'Error creating user session',
            details: createUserError.message
          });
        }
        
        if (!userData || !userData.user) {
          console.error('No user data returned from createUser');
          return res.status(500).json({ error: 'Failed to create user' });
        }
        
        const userId = userData.user.id;
        
        // Add user role for this user
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: userId,
            congregation_id: congregation.id,
            role: 'user'
          });
        
        if (roleError) {
          console.error('Error assigning role:', roleError);
          // Continue anyway
        }
        
        // Now sign in with the created user to get a session
        const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
          email: sessionEmail,
          password: sessionPassword
        });
        
        if (signInError) {
          console.error('Error signing in with created user:', signInError);
          return res.status(500).json({ 
            error: 'Error creating session',
            details: signInError.message
          });
        }
        
        if (!signInData || !signInData.session) {
          console.error('No session data returned from signIn');
          return res.status(500).json({ error: 'Failed to create session' });
        }
        
        // Return success with session
        return res.status(200).json({
          success: true,
          congregation: {
            id: congregation.id,
            name: congregation.name
          },
          session: signInData.session
        });
      } catch (e) {
        console.error('Exception in user creation/login:', e);
        return res.status(500).json({ 
          error: 'Exception in user creation/login', 
          details: e instanceof Error ? e.message : String(e)
        });
      }
    } catch (e) {
      console.error('Exception in case-insensitive search:', e);
      return res.status(500).json({ 
        error: 'Exception in case-insensitive search', 
        details: e instanceof Error ? e.message : String(e)
      });
    }
  } catch (e) {
    console.error('Top-level exception in congregation login:', e);
    return res.status(500).json({ 
      error: 'Unexpected error in congregation login', 
      details: e instanceof Error ? e.message : String(e)
    });
  }
} 
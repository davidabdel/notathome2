import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../utils/adminClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create a Supabase admin client
    const supabaseAdmin = createAdminClient();
    
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
    const { data: allCongregations, error: allError } = await supabaseAdmin
      .from('congregations')
      .select('id, name, pin_code, status');
    
    console.log('All congregations:', allCongregations);
    
    if (allError) {
      console.error('Error fetching all congregations:', allError);
    }
    
    // First try exact match
    const { data: exactMatch, error: exactError } = await supabaseAdmin
      .from('congregations')
      .select('id, name, pin_code, status')
      .eq('name', congregationName)
      .eq('status', 'active');
    
    console.log('Exact match results:', exactMatch);
    
    if (exactError) {
      console.error('Error finding congregation:', exactError);
      return res.status(500).json({ error: 'Error finding congregation' });
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
    
    // If no exact match, try case-insensitive search
    const { data: congregations, error: congregationError } = await supabaseAdmin
      .from('congregations')
      .select('id, name, pin_code, status')
      .ilike('name', `%${congregationName}%`)
      .eq('status', 'active');
    
    console.log('Case-insensitive search results:', congregations);
    
    if (congregationError) {
      console.error('Error searching congregations:', congregationError);
      return res.status(500).json({ error: 'Error searching for congregation' });
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
    
  } catch (error: any) {
    console.error('Error in congregation-login API:', error);
    return res.status(500).json({ 
      error: 'An unexpected error occurred',
      message: error.message
    });
  }
} 
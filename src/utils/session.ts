import { supabase } from '../../supabase/config';

// Generate a random 4-digit numeric session code
export const generateSessionCode = (): string => {
  // Generate a random number between 1000 and 9999
  const code = Math.floor(1000 + Math.random() * 9000);
  return code.toString();
};

// Interface for session data
export interface SessionData {
  id: string;
  code: string;
  congregation_id: string;
  created_by: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
  map_number?: number;
}

// Create a new session in the database
export const createSession = async (
  congregationId: string, 
  userId: string, 
  mapNumber?: number
): Promise<SessionData | null> => {
  try {
    console.log('Creating session with params:', { congregationId, userId, mapNumber });
    
    // Validate inputs
    if (!congregationId) {
      console.error('Error creating session: congregationId is required');
      return null;
    }
    
    if (!userId) {
      console.error('Error creating session: userId is required');
      return null;
    }
    
    const sessionCode = generateSessionCode();
    
    // Set expiration to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    // First check if the sessions table exists
    try {
      const { error: tableCheckError } = await supabase
        .from('sessions')
        .select('id')
        .limit(1);
      
      if (tableCheckError && tableCheckError.code === '42P01') {
        console.error('Error creating session: sessions table does not exist', tableCheckError);
        return null;
      }
    } catch (tableErr) {
      console.error('Error checking sessions table:', tableErr);
    }
    
    // Create the session
    const sessionData = {
      code: sessionCode,
      congregation_id: congregationId,
      created_by: userId,
      expires_at: expiresAt.toISOString(),
      is_active: true,
      map_number: mapNumber
    };
    
    console.log('Inserting session with data:', sessionData);
    
    const { data, error } = await supabase
      .from('sessions')
      .insert(sessionData)
      .select();
    
    if (error) {
      console.error('Error creating session:', error);
      return null;
    }
    
    if (!data || data.length === 0) {
      console.error('No session data returned after insert');
      return null;
    }
    
    // We should only have one session created
    const createdSession = data[0];
    console.log('Session created successfully:', createdSession);
    return createdSession;
  } catch (err) {
    console.error('Exception in createSession:', err);
    return null;
  }
};

// Join an existing session using a session code
export const joinSession = async (sessionCode: string, userId: string): Promise<SessionData | null> => {
  try {
    // First, find the session by code - don't use single() to avoid errors
    const { data: sessions, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('code', sessionCode)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString());
    
    if (sessionError) {
      console.error('Error finding session:', sessionError);
      return null;
    }
    
    if (!sessions || sessions.length === 0) {
      console.log(`No active session found with code: ${sessionCode}`);
      return null;
    }
    
    // Use the first session if multiple were returned
    if (sessions.length > 1) {
      console.warn(`Multiple sessions found with code: ${sessionCode} (unusual). Using the first one.`);
    }
    
    const session = sessions[0];
    
    // Then, add the user to the session participants
    const { error: participantError } = await supabase
      .from('session_participants')
      .insert({
        session_id: session.id,
        user_id: userId,
        joined_at: new Date().toISOString()
      });
    
    if (participantError) {
      console.error('Error adding participant:', participantError);
      return null;
    }
    
    return session;
  } catch (err) {
    console.error('Error in joinSession:', err);
    return null;
  }
};

// End an active session and delete all associated data
export const endSession = async (sessionId: string): Promise<boolean> => {
  try {
    console.log('Ending session and deleting all associated data for sessionId:', sessionId);
    
    // Start a transaction for all delete operations
    // @ts-ignore - Supabase client is imported from utils
    const { error: txError } = await supabase.rpc('end_session', {
      p_session_id: sessionId
    });

    if (txError) {
      console.error('Error in end_session RPC:', txError);
      
      // Fallback approach if RPC fails - delete in correct order
      try {
        // 1. Delete session participants first (they reference the session)
        const { error: participantsDeleteError } = await supabase
          .from('session_participants')
          .delete()
          .eq('session_id', sessionId);
        
        if (participantsDeleteError) {
          console.error('Error deleting session participants:', participantsDeleteError);
          return false;
        }
        
        // 2. Delete addresses next (they reference the session)
        const { error: addressesDeleteError } = await supabase
          .from('not_at_home_addresses')
          .delete()
          .eq('session_id', sessionId);
        
        if (addressesDeleteError) {
          console.error('Error deleting session addresses:', addressesDeleteError);
          return false;
        }
        
        // 3. Finally delete the session itself
        const { error: sessionDeleteError } = await supabase
          .from('sessions')
          .delete()
          .eq('id', sessionId);
        
        if (sessionDeleteError) {
          console.error('Error deleting session:', sessionDeleteError);
          return false;
        }
      } catch (fallbackErr) {
        console.error('Error in fallback deletion:', fallbackErr);
        return false;
      }
    }
    
    // Verify the session was deleted - don't use single() to avoid errors
    const { data: verifySession, error: verifyError } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId);
    
    if (verifyError) {
      console.error('Error verifying session deletion:', verifyError);
      return false;
    }
    
    if (!verifySession || verifySession.length === 0) {
      // No sessions found - session was successfully deleted
      console.log('Verification confirms session was deleted:', sessionId);
      return true;
    }
    
    console.error('Session still exists after deletion attempt:', verifySession);
    return false;
  } catch (err) {
    console.error('Error in endSession:', err);
    return false;
  }
};

// Share a session code using the Web Share API if available
export const shareSessionCode = async (sessionCode: string, congregationName: string): Promise<boolean> => {
  try {
    if (navigator.share) {
      await navigator.share({
        title: 'Join Not At Home Session',
        text: `Join the "${congregationName}" outreach session with code: ${sessionCode}`,
        url: `${window.location.origin}/join-session?code=${sessionCode}`
      });
      return true;
    } else {
      // Fallback for browsers that don't support the Web Share API
      await navigator.clipboard.writeText(sessionCode);
      return true;
    }
  } catch (err) {
    console.error('Error sharing session code:', err);
    return false;
  }
};

// Fetch and share session data
export const fetchAndShareSessionData = async (
  sessionId: string, 
  congregationName: string,
  fetchOnly: boolean = false,
  prefetchedData?: any
): Promise<boolean | any> => {
  try {
    console.log('Starting fetchAndShareSessionData with sessionId:', sessionId, 'fetchOnly:', fetchOnly);
    
    let addresses;
    let session;
    
    // If we have prefetched data, use it
    if (prefetchedData) {
      console.log('Using prefetched data');
      addresses = prefetchedData.addresses;
      session = prefetchedData.session;
    } else {
      // Otherwise fetch the data
      // Fetch all addresses for this session
      const { data: fetchedAddresses, error: addressesError } = await supabase
        .from('not_at_home_addresses')
        .select('*')
        .eq('session_id', sessionId)
        .order('block_number', { ascending: true })
        .order('created_at', { ascending: true });
      
      if (addressesError) {
        console.error('Error fetching addresses for sharing:', addressesError);
        return false;
      }
      
      addresses = fetchedAddresses;
      console.log('Addresses fetched:', addresses ? addresses.length : 0);
      
      console.log(`Fetching session details in fetchAndShareSessionData, sessionId: ${sessionId}`);
      
      // Get session details - don't use single() to avoid errors
      const { data: fetchedSessions, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId);
        
      console.log(`Session query result in fetchAndShareSessionData - sessions: ${fetchedSessions ? fetchedSessions.length : 0}, error: ${sessionError ? 'yes' : 'no'}`);
      
      if (sessionError) {
        console.error('Error fetching session details:', sessionError);
        // Create a minimal session object
        session = {
          id: sessionId,
          code: 'ERROR',
          created_at: new Date().toISOString(),
          map_number: 'N/A'
        };
      } else if (!fetchedSessions || fetchedSessions.length === 0) {
        // If the session doesn't exist anymore (it's been deleted), we'll create a minimal session object
        console.log('Session not found in database (likely deleted), using minimal session object');
        session = {
          id: sessionId,
          code: 'DELETED',
          created_at: new Date().toISOString(),
          map_number: 'N/A'
        };
      } else {
        // Use the first session if multiple were returned (should not happen)
        if (fetchedSessions.length > 1) {
          console.warn(`Multiple sessions found with ID: ${sessionId} (unusual). Using the first one.`);
        }
        session = fetchedSessions[0];
      }
      
      console.log('Session details:', session);
      
      if (!session) {
        console.error('Session not found and could not create minimal session object');
        return false;
      }
    }
    
    // If we're just fetching the data, return it
    if (fetchOnly) {
      return { addresses, session };
    }
    
    // Format the data as a table
    const sessionDate = new Date(session.created_at).toLocaleDateString();
    const sessionTime = new Date(session.created_at).toLocaleTimeString();
    
    let shareText = `Not At Home - ${congregationName}\n`;
    shareText += `Session: ${session.code} - Map: ${session.map_number || 'N/A'}\n`;
    shareText += `Date: ${sessionDate} - Time: ${sessionTime}\n\n`;
    
    // If we have addresses, group and add them
    if (addresses && addresses.length > 0) {
      // Group addresses by block number
      const addressesByBlock: Record<number, typeof addresses> = {};
      
      addresses.forEach((address: { block_number: number }) => {
        if (!addressesByBlock[address.block_number]) {
          addressesByBlock[address.block_number] = [];
        }
        addressesByBlock[address.block_number].push(address);
      });
      
      // Process each block in ascending order
      Object.keys(addressesByBlock).sort((a, b) => Number(a) - Number(b)).forEach((blockNumber: string) => {
        const blockTitle = `Block ${blockNumber}`;
        shareText += `\n\n${blockTitle}\n${'_'.repeat(blockTitle.length)}\n`;
        
        // Group addresses by street name
        const addressesByStreet: Record<string, number[]> = {};
        
        addressesByBlock[Number(blockNumber)].forEach((address: { address?: string; latitude?: number; longitude?: number }) => {
          if (address.address) {
            // Parse the address to extract house number and street name
            const addressMatch = address.address.match(/^(\d+[A-Za-z]?)\s+(.+?)(?:\s*,\s*.+)?$/);
            
            if (addressMatch) {
              const houseNumber = addressMatch[1];
              const streetName = addressMatch[2];
              
              if (!addressesByStreet[streetName]) {
                addressesByStreet[streetName] = [];
              }
              
              // Convert to number for sorting if possible
              const numericPart = houseNumber.match(/^(\d+)/);
              if (numericPart) {
                addressesByStreet[streetName].push(parseInt(numericPart[1], 10));
              } else {
                // If it's not a number (e.g., '1A'), just add it as is
                addressesByStreet[streetName].push(NaN);
              }
            } else {
              // If we can't parse the address, add it as is
              shareText += `\n${address.address}`;
            }
          } else if (address.latitude && address.longitude) {
            shareText += `\nLat: ${address.latitude.toFixed(6)}, Lng: ${address.longitude.toFixed(6)}`;
          }
        });
        
        // Add each street with sorted house numbers
        Object.keys(addressesByStreet).sort().forEach(streetName => {
          shareText += `\n${streetName}`;
          
          // Sort house numbers in ascending order
          const sortedNumbers = addressesByStreet[streetName].sort((a, b) => a - b);
          
          // Add each house number on a new line
          sortedNumbers.forEach(number => {
            shareText += `\n${number}`;
          });
          
          shareText += '\n';
        });
      });
    } else {
      shareText += "\nNo addresses recorded for this session.";
    }
    
    console.log('Share text prepared:', shareText);
    
    // Share the data using the Web Share API if available
    if (navigator.share) {
      console.log('Using Web Share API');
      try {
        await navigator.share({
          title: `Not At Home - Session ${session.code}`,
          text: shareText
        });
        console.log('Share successful via Web Share API');
        return true;
      } catch (shareError) {
        console.error('Error using Web Share API:', shareError);
        // Fall back to clipboard
        await navigator.clipboard.writeText(shareText);
        alert('Session data copied to clipboard!');
        return true;
      }
    } else {
      console.log('Web Share API not available, using clipboard');
      // Fallback for browsers that don't support the Web Share API
      await navigator.clipboard.writeText(shareText);
      alert('Session data copied to clipboard!');
      return true;
    }
  } catch (err) {
    console.error('Error sharing session data:', err);
    return false;
  }
}; 
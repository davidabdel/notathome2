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
      .select()
      .single();
    
    if (error) {
      console.error('Error creating session:', error);
      return null;
    }
    
    console.log('Session created successfully:', data);
    return data;
  } catch (err) {
    console.error('Exception in createSession:', err);
    return null;
  }
};

// Join an existing session using a session code
export const joinSession = async (sessionCode: string, userId: string): Promise<SessionData | null> => {
  try {
    // First, find the session by code
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('code', sessionCode)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (sessionError || !session) {
      console.error('Error finding session:', sessionError);
      return null;
    }
    
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
    
    // Verify the session was deleted
    const { data: verifySession, error: verifyError } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .single();
    
    if (verifyError && verifyError.code === 'PGRST116') {
      // PGRST116 means no rows returned - session was successfully deleted
      console.log('Verification confirms session was deleted:', sessionId);
      return true;
    }
    
    if (verifySession) {
      console.error('Session still exists after deletion attempt:', verifySession);
      return false;
    }
    
    return true;
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
      
      // Get session details
      const { data: fetchedSession, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (sessionError) {
        // If the session doesn't exist anymore (it's been deleted), we'll create a minimal session object
        console.log('Session not found in database (likely deleted), using minimal session object');
        session = {
          id: sessionId,
          code: 'DELETED',
          created_at: new Date().toISOString(),
          map_number: 'N/A'
        };
      } else {
        session = fetchedSession;
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
      
      Object.keys(addressesByBlock).sort((a, b) => Number(a) - Number(b)).forEach((blockNumber: string) => {
        const blockTitle = `Block ${blockNumber}`;
        shareText += `\n\n${blockTitle}\n${'-'.repeat(blockTitle.length)}\n`;
        
        addressesByBlock[Number(blockNumber)].forEach((address: { address?: string; latitude?: number; longitude?: number }) => {
          if (address.address) {
            shareText += `\n${address.address}`;
          } else if (address.latitude && address.longitude) {
            shareText += `\nLat: ${address.latitude.toFixed(6)}, Lng: ${address.longitude.toFixed(6)}`;
          }
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
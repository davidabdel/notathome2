import { supabase } from '../../supabase/config';
import { sendEmail } from './email';
import { fetchAndShareSessionData } from './session';

/**
 * Sends a notification email with session data when a session is approaching expiration or has expired
 * @param sessionId The ID of the session
 * @param isApproachingExpiration Whether the session is approaching expiration (23 hours) or has expired (24 hours)
 * @returns Promise<boolean> indicating success or failure
 */
export async function sendSessionExpirationNotification(
  sessionId: string,
  isApproachingExpiration: boolean = false
): Promise<boolean> {
  // Check if we're on the client side
  if (typeof window !== 'undefined') {
    console.error('Session notification is not supported on the client side');
    return false;
  }
  try {
    console.log(`Preparing ${isApproachingExpiration ? 'approaching expiration' : 'expiration'} notification for session ${sessionId}`);
    
    console.log(`Fetching session details for notification, sessionId: ${sessionId}`);
    
    // First, get the session details - don't use single() to avoid errors
    const { data: sessions, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        *,
        congregations (
          id,
          name,
          notification_email
        )
      `)
      .eq('id', sessionId);
      
    console.log(`Session query result - sessions: ${sessions ? sessions.length : 0}, error: ${sessionError ? 'yes' : 'no'}`);
    
    if (sessionError) {
      console.error('Error fetching session for notification:', sessionError);
      return false;
    }
    
    // Check if we got exactly one session
    if (!sessions || sessions.length === 0) {
      console.error(`No session found with ID: ${sessionId}`);
      return false;
    }
    
    if (sessions.length > 1) {
      console.error(`Multiple sessions found with ID: ${sessionId} (unusual)`);
      // Continue with the first one
    }
    
    // Use the first (or only) session
    const session = sessions[0];
    
    // Check if there's a notification email set for the congregation
    const congregationName = session.congregations?.name || 'Unknown Congregation';
    const notificationEmail = session.congregations?.notification_email;
    
    if (!notificationEmail) {
      console.log(`No notification email set for congregation ${congregationName}. Skipping notification.`);
      return false;
    }
    
    // Fetch all addresses for this session
    const { data: sessionData } = await fetchAndShareSessionData(
      sessionId, 
      congregationName,
      true // fetchOnly = true
    );
    
    if (!sessionData) {
      console.error('Error fetching session data for notification');
      return false;
    }
    
    const { addresses, session: sessionDetails } = sessionData;
    
    // Format the session data for email
    const sessionDate = new Date(sessionDetails.created_at).toLocaleDateString();
    const sessionTime = new Date(sessionDetails.created_at).toLocaleTimeString();
    const expirationDate = new Date().toLocaleDateString();
    const expirationTime = new Date().toLocaleTimeString();
    
    // Count addresses by block
    const addressesByBlock: Record<number, any[]> = {};
    let totalAddresses = 0;
    
    if (addresses && addresses.length > 0) {
      totalAddresses = addresses.length;
      
      addresses.forEach((address: any) => {
        const blockNumber = address.block_number || 0;
        if (!addressesByBlock[blockNumber]) {
          addressesByBlock[blockNumber] = [];
        }
        addressesByBlock[blockNumber].push(address);
      });
    }
    
    // Create HTML email content
    let htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Not At Home - ${isApproachingExpiration ? 'Session Expiring Soon' : 'Session Expired'}</h2>
        
        <p>${isApproachingExpiration ? 
          `A session for <strong>${congregationName}</strong> will expire in about 1 hour. Please close the session if you're finished, or it will be automatically closed.` : 
          `A session for <strong>${congregationName}</strong> has expired and was automatically closed.`
        }</p>
        
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Session Code:</strong> ${sessionDetails.code}</p>
          <p><strong>Map Number:</strong> ${sessionDetails.map_number || 'N/A'}</p>
          <p><strong>Started:</strong> ${sessionDate} at ${sessionTime}</p>
          <p><strong>${isApproachingExpiration ? 'Expiring at' : 'Expired'}:</strong> ${expirationDate} at ${expirationTime}</p>
          <p><strong>Total Addresses:</strong> ${totalAddresses}</p>
        </div>
    `;
    
    // Add address summary by block
    if (totalAddresses > 0) {
      htmlContent += `<h3 style="color: #374151;">Address Summary</h3>`;
      
      Object.keys(addressesByBlock).sort((a, b) => Number(a) - Number(b)).forEach((blockNumber: string) => {
        const blockAddresses = addressesByBlock[Number(blockNumber)];
        htmlContent += `
          <div style="margin-bottom: 15px;">
            <h4 style="margin-bottom: 5px; color: #4b5563;">Block ${blockNumber} (${blockAddresses.length} addresses)</h4>
        `;
        
        // Group addresses by street
        const streetCounts: Record<string, number> = {};
        
        blockAddresses.forEach((address: any) => {
          if (address.address) {
            // Extract street name
            const addressMatch = address.address.match(/^(\d+[A-Za-z]?)\s+(.+?)(?:\s*,\s*.+)?$/);
            if (addressMatch) {
              const streetName = addressMatch[2];
              if (!streetCounts[streetName]) {
                streetCounts[streetName] = 0;
              }
              streetCounts[streetName]++;
            }
          }
        });
        
        // Add street summary
        htmlContent += `<ul style="margin-top: 5px;">`;
        Object.keys(streetCounts).sort().forEach(streetName => {
          htmlContent += `<li>${streetName}: ${streetCounts[streetName]} addresses</li>`;
        });
        htmlContent += `</ul></div>`;
      });
    }
    
    // Add footer
    htmlContent += `
        <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
          This is an automated notification from Not At Home. ${isApproachingExpiration ? 
            'If you need to continue using this session, please close and restart it to reset the timer.' : 
            'The session data has been saved.'}
        </p>
      </div>
    `;
    
    // Send the email
    const emailResult = await sendEmail({
      to: notificationEmail,
      subject: `Not At Home - ${isApproachingExpiration ? 'Session Expiring Soon' : 'Expired Session'} (${sessionDetails.code}) - ${congregationName}`,
      html: htmlContent
    });
    
    if (emailResult) {
      console.log(`Session expiration notification sent to ${notificationEmail}`);
      return true;
    } else {
      console.error('Failed to send session expiration notification');
      return false;
    }
  } catch (error) {
    console.error('Error sending session expiration notification:', error);
    return false;
  }
}

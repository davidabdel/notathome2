import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServer } from '../../utils/supabaseServer';
import { sendEmail } from '../../utils/email';

/**
 * API endpoint to directly test session notification without complex lookups
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, isApproachingExpiration = false } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    console.log(`Testing notification for session ID: ${sessionId}`);
    
    // First try to find the session
    let session = null;
    let congregation = null;
    
    // 1. Try exact match
    const { data: sessions, error: sessionError } = await supabaseServer
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
      
    if (sessions && sessions.length > 0) {
      session = sessions[0];
      congregation = session.congregations;
    }
    
    // 2. If not found and ID is longer than 36 chars, try with first 36
    if (!session && sessionId.length > 36) {
      const normalizedId = sessionId.substring(0, 36);
      
      const { data: normalizedSessions } = await supabaseServer
        .from('sessions')
        .select(`
          *,
          congregations (
            id,
            name,
            notification_email
          )
        `)
        .eq('id', normalizedId);
        
      if (normalizedSessions && normalizedSessions.length > 0) {
        session = normalizedSessions[0];
        congregation = session.congregations;
      }
    }
    
    // 3. If still not found, try with all sessions
    if (!session) {
      const { data: allSessions } = await supabaseServer
        .from('sessions')
        .select(`
          *,
          congregations (
            id,
            name,
            notification_email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (allSessions && allSessions.length > 0) {
        // Just use the most recent session
        session = allSessions[0];
        congregation = session.congregations;
        
        console.log(`No session found with ID ${sessionId}, using most recent session: ${session.id}`);
      }
    }
    
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        details: 'Could not find any sessions in the database'
      });
    }

    // Fetch recorded addresses for this session to include in the email
    const { data: addresses } = await supabaseServer
      .from('not_at_home_addresses')
      .select('address, block_number, created_at, latitude, longitude')
      .eq('session_id', session.id)
      .order('block_number', { ascending: true })
      .order('created_at', { ascending: true });
    
    // Check if we have a notification email
    if (!congregation || !congregation.notification_email) {
      return res.status(400).json({
        error: 'No notification email',
        details: 'The congregation does not have a notification email configured',
        session: {
          id: session.id,
          code: session.code,
          congregation: congregation ? congregation.name : 'Unknown'
        }
      });
    }
    
    // Prepare formatted list of blocks and addresses (as full lines)
    const groupHtml = (() => {
      if (!addresses || addresses.length === 0) {
        return '<p>No addresses recorded for this session.</p>';
      }
      // Group by block number -> list of display lines (preserve insertion order)
      const byBlock: Record<string, string[]> = {};
      for (const a of addresses as any[]) {
        const block = String(a.block_number ?? 'Unassigned');
        if (!byBlock[block]) byBlock[block] = [];
        if (a.address && String(a.address).trim().length > 0) {
          byBlock[block].push(String(a.address));
        } else if (a.latitude && a.longitude) {
          byBlock[block].push(`${Number(a.latitude).toFixed(6)}, ${Number(a.longitude).toFixed(6)}`);
        }
      }
      // Build HTML
      let html = '';
      const blockKeys = Object.keys(byBlock).sort((a,b)=>Number(a)-Number(b));
      for (const block of blockKeys) {
        html += `<h4 style="margin:16px 0 8px;">Block Number ${block}</h4>`;
        html += '<div style="margin:0 0 12px 0;">';
        for (const line of byBlock[block]) {
          html += `<div>${line}</div>`;
        }
        html += '</div>';
      }
      return html;
    })();

    // Create notification email content per requested copy
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 720px; margin: 0 auto;">
        <h2 style="color: #111827;">Session Has Not Been Closed</h2>
        <p><strong>Session code:</strong> ${session.code}</p>
        <p><strong>Map Number:</strong> ${session.map_number ?? 'N/A'}</p>
        <div style="background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px; padding:16px; margin-top:16px;">
          <h3 style="margin:0 0 8px; color:#111827;">Recorded Blocks and Addresses</h3>
          ${groupHtml}
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #6B7280;">This is a test notification from Not At Home.</p>
      </div>
    `;
    
    // Support a dry-run that skips actual sending (for quick testing)
    const dryRun = process.env.EMAIL_DRY_RUN === 'true';
    let emailResult = true;
    if (!dryRun) {
      // Send the email
      emailResult = await sendEmail({
        to: congregation.notification_email,
        subject: `Not At Home - Session Has Not Been Closed (${session.code}) - ${congregation.name}`,
        html: htmlContent
      });
    }
    
    if (emailResult) {
      return res.status(200).json({
        success: true,
        message: dryRun
          ? `(Dry Run) Notification would be sent to ${congregation.notification_email}`
          : `Test notification sent successfully to ${congregation.notification_email}`,
        session: {
          id: session.id,
          code: session.code,
          congregation: congregation.name
        }
      });
    } else {
      // Provide hints about provider configuration for easier debugging
      const usingResend = !!process.env.RESEND_API_KEY;
      const provider = usingResend ? 'resend' : 'smtp';
      const hint = usingResend
        ? 'Resend may have rejected the request: check RESEND_API_KEY and RESEND_FROM (verified sender/domain).'
        : 'SMTP may be misconfigured: check SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_SECURE.';
      return res.status(502).json({
        success: false,
        message: 'Failed to send email notification',
        provider,
        hint,
        to: congregation.notification_email,
        session: {
          id: session.id,
          code: session.code,
          congregation: congregation.name
        }
      });
    }
  } catch (error) {
    console.error('Error in direct-notification-test API:', error);
    return res.status(500).json({
      error: 'Failed to send test notification',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/config';
import { useRouter } from 'next/router';

const SessionNotificationTester: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [manualSessionId, setManualSessionId] = useState<string>('');
  const [useManualInput, setUseManualInput] = useState<boolean>(false);
  const [notificationType, setNotificationType] = useState<'expiration' | 'approaching'>('approaching');
  const [loadingSessions, setLoadingSessions] = useState(false);
  const router = useRouter();
  
  // Check for session ID in URL query params
  useEffect(() => {
    if (router.isReady && router.query.sessionId) {
      const sessionId = router.query.sessionId as string;
      setManualSessionId(sessionId);
      setUseManualInput(true);
      setSelectedSession(sessionId);
      
      // Validate the session ID
      const validationResult = validateSessionId(sessionId);
      if (!validationResult.valid) {
        console.log(`Invalid session ID in URL: ${sessionId}`);
        // We don't set an error here to avoid confusion, just log it
      }
    }
  }, [router.isReady, router.query]);

  // Fetch active sessions
  const fetchActiveSessions = async () => {
    setLoadingSessions(true);
    setError(null);
    
    try {
      // Use Supabase client to fetch active sessions
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id,
          code,
          created_at,
          expires_at,
          congregations (
            name
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setSessions(data || []);
      
      if (data && data.length > 0) {
        setSelectedSession(data[0].id);
      }
    } catch (err: any) {
      setError(`Error fetching sessions: ${err.message}`);
    } finally {
      setLoadingSessions(false);
    }
  };

  // Simple validation for session ID input
  const validateSessionId = (id: string): {valid: boolean, message?: string} => {
    // Trim any whitespace
    const trimmed = id.trim();
    
    if (!trimmed) {
      return { valid: false, message: 'Please enter a session ID' };
    }
    
    // For session codes (numerical, 4-5 digits)
    if (/^\d{4,5}$/.test(trimmed)) {
      return { valid: true };
    }
    
    // For UUIDs (standard format with hyphens)
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)) {
      return { valid: true };
    }
    
    // For UUIDs with extra characters
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}.+$/i.test(trimmed)) {
      return { valid: true };
    }
    
    // For partial UUIDs (at least the first part)
    if (/^[0-9a-f]{8}(-[0-9a-f]{4})?/i.test(trimmed) && trimmed.length >= 8) {
      return { valid: true };
    }
    
    return { valid: false, message: 'Invalid session ID format' };
  };
  
  // Test notification for a session
  const testNotification = async () => {
    if (!selectedSession) {
      setError('Please select a session');
      return;
    }
    
    // Validate the session ID format
    const validationResult = validateSessionId(selectedSession);
    if (!validationResult.valid) {
      setError(validationResult.message || `Invalid session ID format: ${selectedSession}`);
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Use the API endpoint to send the notification (server-side only)
      const response = await fetch('/api/test-session-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: selectedSession,
          isApproachingExpiration: notificationType === 'approaching'
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        // Extract detailed error information
        const errorMessage = result.error || result.message || 'Failed to send test notification';
        const errorDetails = result.details || '';
        const availableSessions = result.availableSessions;
        
        // Create a more detailed error message
        let fullErrorMessage = errorMessage;
        if (errorDetails) {
          fullErrorMessage += `: ${errorDetails}`;
        }
        
        // Set the error with additional information
        setError(fullErrorMessage);
        
        // If there are available sessions, show them in the success message to help the user
        if (availableSessions && availableSessions.length > 0) {
          setSuccess(`No session found with that ID. Here are some available sessions you can use instead:\n${availableSessions.map((s: { id: string; code: string; created_at: string }) => 
            `ID: ${s.id} - Code: ${s.code} - Created: ${new Date(s.created_at).toLocaleString()}`
          ).join('\n')}`);
        }
        
        return;
      }
      
      setSuccess(`Test notification sent successfully for session code: ${result.sessionCode}`);
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  return (
    <div className="notification-tester">
      <h2>Session Notification Tester</h2>
      
      <p className="description">
        This tool allows you to test the session expiration notification system without actually ending a session.
        It will send a notification email to the congregation's default notification email address.
      </p>
      
      <div className="session-selector">
        <div className="section-header">
          <h3>1. Select a Session</h3>
          <button 
            type="button" 
            className="refresh-button"
            onClick={fetchActiveSessions}
            disabled={loadingSessions}
          >
            {loadingSessions ? 'Loading...' : 'Load Active Sessions'}
          </button>
        </div>
        
        {sessions.length > 0 ? (
          <div className="session-list">
            <div className="session-selection">
              <div className="selection-toggle">
                <label className="toggle-label">
                  <input 
                    type="checkbox" 
                    checked={useManualInput}
                    onChange={() => setUseManualInput(!useManualInput)}
                    className="toggle-input"
                  />
                  <span className="toggle-text">Enter session ID manually</span>
                </label>
              </div>
              
              {useManualInput ? (
                <div className="manual-input">
                  <input
                    type="text"
                    value={manualSessionId}
                    onChange={(e) => setManualSessionId(e.target.value)}
                    placeholder="Enter session ID (UUID format)"
                    className="session-text-input"
                    disabled={loading}
                  />
                  <button 
                    type="button"
                    className="use-button"
                    onClick={() => setSelectedSession(manualSessionId)}
                    disabled={!manualSessionId || loading}
                  >
                    Use This ID
                  </button>
                </div>
              ) : (
                <select
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  disabled={loading}
                  className="session-dropdown"
                >
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      Code: {session.code} - {session.congregations?.name || 'Unknown'} - Created: {formatDate(session.created_at)}
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            {selectedSession && sessions.find(s => s.id === selectedSession) && (
              <div className="session-details">
                <div className="detail-item">
                  <span className="detail-label">Session Code:</span>
                  <span className="detail-value">{sessions.find(s => s.id === selectedSession)?.code}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Congregation:</span>
                  <span className="detail-value">{sessions.find(s => s.id === selectedSession)?.congregations?.name || 'Unknown'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Created:</span>
                  <span className="detail-value">{formatDate(sessions.find(s => s.id === selectedSession)?.created_at)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Expires:</span>
                  <span className="detail-value">{formatDate(sessions.find(s => s.id === selectedSession)?.expires_at)}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state">
            {loadingSessions ? (
              <p>Loading sessions...</p>
            ) : (
              <p>No active sessions found. Click "Load Active Sessions" to fetch sessions.</p>
            )}
          </div>
        )}
      </div>
      
      <div className="notification-section">
        <h3>2. Choose Notification Type</h3>
        <p className="section-description">
          Select which type of notification to test.
        </p>
        
        <div className="notification-type-selector">
          <label className={`type-option ${notificationType === 'approaching' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="notificationType"
              value="approaching"
              checked={notificationType === 'approaching'}
              onChange={() => setNotificationType('approaching')}
              disabled={loading}
            />
            <span className="option-label">Approaching Expiration (23 hours)</span>
            <span className="option-description">Tests the notification sent 1 hour before session expiration</span>
          </label>
          
          <label className={`type-option ${notificationType === 'expiration' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="notificationType"
              value="expiration"
              checked={notificationType === 'expiration'}
              onChange={() => setNotificationType('expiration')}
              disabled={loading}
            />
            <span className="option-label">Expired Session (24 hours)</span>
            <span className="option-description">Tests the notification sent when a session expires</span>
          </label>
        </div>
        
        <h3>3. Send Test Notification</h3>
        <p className="section-description">
          This will send a test notification to the default notification email address configured for the congregation.
        </p>
        
        <button
          type="button"
          className="test-button"
          onClick={testNotification}
          disabled={loading || !selectedSession}
        >
          {loading ? 'Sending...' : `Send ${notificationType === 'approaching' ? 'Approaching Expiration' : 'Expiration'} Notification`}
        </button>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {success && (
        <div className="success-message">
          {success.includes('\n') ? (
            <pre className="pre-formatted">{success}</pre>
          ) : (
            success
          )}
        </div>
      )}
      
      <style jsx>{`
        .notification-tester {
          background-color: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          padding: 1.5rem;
          margin: 1.5rem 0;
        }
        
        h2 {
          font-size: 1.5rem;
          color: #1e293b;
          margin-top: 0;
          margin-bottom: 1rem;
        }
        
        h3 {
          font-size: 1.25rem;
          color: #334155;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }
        
        .description, .section-description {
          color: #64748b;
          font-size: 0.9rem;
          margin-bottom: 1.5rem;
        }
        
        .section-description {
          margin-bottom: 1rem;
        }
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        
        .refresh-button {
          background-color: #e2e8f0;
          color: #475569;
          border: none;
          border-radius: 4px;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .refresh-button:hover:not(:disabled) {
          background-color: #cbd5e1;
        }
        
        .refresh-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .session-selection {
          margin-bottom: 15px;
        }
        
        .selection-toggle {
          margin-bottom: 10px;
        }
        
        .toggle-label {
          display: flex;
          align-items: center;
          cursor: pointer;
        }
        
        .toggle-input {
          margin-right: 8px;
        }
        
        .toggle-text {
          font-size: 0.9rem;
          color: #475569;
        }
        
        .manual-input {
          display: flex;
          gap: 10px;
        }
        
        .session-text-input {
          flex: 1;
          padding: 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          font-size: 0.9rem;
          color: #1e293b;
          font-family: monospace;
        }
        
        .use-button {
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0 15px;
          font-size: 0.85rem;
          cursor: pointer;
        }
        
        .use-button:disabled {
          background-color: #93c5fd;
          cursor: not-allowed;
        }
        
        .session-dropdown {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          font-size: 0.9rem;
          color: #1e293b;
          background-color: white;
        }
        
        .session-details {
          margin-top: 1rem;
          background-color: white;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          padding: 1rem;
        }
        
        .detail-item {
          display: flex;
          margin-bottom: 0.5rem;
        }
        
        .detail-item:last-child {
          margin-bottom: 0;
        }
        
        .detail-label {
          font-weight: 500;
          color: #64748b;
          width: 100px;
          flex-shrink: 0;
        }
        
        .detail-value {
          color: #1e293b;
        }
        
        .empty-state {
          background-color: white;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          padding: 2rem;
          text-align: center;
          color: #64748b;
        }
        
        .notification-section {
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 1px solid #e2e8f0;
        }
        
        .notification-type-selector {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        
        .type-option {
          display: flex;
          flex-direction: column;
          padding: 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .type-option.selected {
          border-color: #3b82f6;
          background-color: #eff6ff;
        }
        
        .type-option:hover:not(.selected) {
          background-color: #f8fafc;
        }
        
        .type-option input {
          position: absolute;
          opacity: 0;
        }
        
        .option-label {
          font-weight: 500;
          color: #1e293b;
          margin-bottom: 0.25rem;
        }
        
        .option-description {
          font-size: 0.875rem;
          color: #64748b;
        }
        
        .test-button {
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.75rem 1.5rem;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .test-button:hover:not(:disabled) {
          background-color: #2563eb;
        }
        
        .test-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .error-message {
          margin-top: 1.5rem;
          background-color: #fee2e2;
          color: #b91c1c;
          padding: 0.75rem;
          border-radius: 4px;
          font-size: 0.9rem;
        }
        
        .success-message {
          margin-top: 1.5rem;
          background-color: #dcfce7;
          color: #166534;
          padding: 0.75rem;
          border-radius: 4px;
          font-size: 0.9rem;
        }
        
        .pre-formatted {
          margin: 0;
          white-space: pre-wrap;
          font-family: monospace;
          font-size: 0.85rem;
          line-height: 1.5;
          overflow-x: auto;
        }
      `}</style>
    </div>
  );
};

export default SessionNotificationTester;

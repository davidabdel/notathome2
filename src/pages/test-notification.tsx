import React, { useState } from 'react';
import Link from 'next/link';
import SessionNotificationTester from '../components/SessionNotificationTester';

const TestNotificationPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  // Manually trigger the session expiration check
  const triggerExpirationCheck = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/check-session-expiration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, error: String(error) });
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="container">
      <header>
        <h1>Session Notification Tester</h1>
        <div className="nav-links">
          <Link href="/session-debug" className="nav-link">Session Debug</Link>
          <Link href="/debug" className="nav-link">Debug</Link>
          <Link href="/" className="nav-link">Home</Link>
        </div>
      </header>
      
      <main>
        <div className="info-box">
          <h2>About Session Expiration Notifications</h2>
          <p>
            The system is configured to automatically check for sessions every 15 minutes and will:
          </p>
          <ol>
            <li><strong>At 23 hours:</strong> Send a notification email to the congregation's default notification email</li>
            <li><strong>At 24 hours:</strong> Automatically end the session and delete the data</li>
          </ol>
          <p>
            Both notifications include all session data and addresses collected during the session.
          </p>
          <p>
            This page allows you to test the notification feature without actually ending a session.
          </p>
        </div>
        
        <SessionNotificationTester />
        
        <div className="manual-check-section">
          <h2>Manual Session Expiration Check</h2>
          <p>
            You can manually trigger the session expiration check to test the system.
            This will check for sessions that are 23 hours old (to send notifications) and
            sessions that are 24 hours old (to end them).
          </p>
          
          <button 
            className="check-button"
            onClick={triggerExpirationCheck}
            disabled={loading}
          >
            {loading ? 'Checking...' : 'Run Session Expiration Check'}
          </button>
          
          {result && (
            <div className={`result-box ${result.success ? 'success' : 'error'}`}>
              <p>{result.message}</p>
              {result.endedCount !== undefined && (
                <p>Sessions ended: {result.endedCount}</p>
              )}
              {result.error && (
                <div>
                  <p className="error-text">Error: {result.error}</p>
                  {result.error.includes('Session not found') && (
                    <div className="help-text">
                      <p>
                        Use the <Link href="/check-session" className="inline-link">Session Checker</Link> to verify if this session exists in the database, or the <Link href="/session-debug" className="inline-link">Session Debugger</Link> to check all active sessions.
                      </p>
                      <p>
                        <strong>Recommendation:</strong> Try the <Link href="/direct-test" className="inline-link">Direct Test</Link> page instead, which uses a simpler approach that works with any session ID format.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="setup-instructions">
          <h2>How to Set Up Notifications</h2>
          <ol>
            <li>
              <strong>Configure Default Notification Email</strong>
              <p>Go to the Congregation Dashboard and set the "Default Notification Email" field.</p>
            </li>
            <li>
              <strong>Ensure Email Settings are Configured</strong>
              <p>The system must have valid email server settings configured in the environment variables.</p>
            </li>
          </ol>
        </div>
      </main>
      
      <style jsx>{`
        .container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }
        
        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 15px;
        }
        
        h1 {
          font-size: 1.8rem;
          color: #1e293b;
          margin: 0;
        }
        
        .nav-links {
          display: flex;
          gap: 15px;
        }
        
        .nav-link {
          color: #3b82f6;
          text-decoration: none;
          font-size: 1rem;
        }
        
        .info-box {
          background-color: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
        }
        
        .info-box h2 {
          color: #1e40af;
          font-size: 1.25rem;
          margin-top: 0;
          margin-bottom: 15px;
        }
        
        .info-box p {
          color: #1e3a8a;
          margin-bottom: 15px;
        }
        
        .info-box ol {
          margin: 0;
          padding-left: 20px;
        }
        
        .info-box li {
          color: #1e3a8a;
          margin-bottom: 8px;
        }
        
        .setup-instructions {
          margin-top: 30px;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
        }
        
        .manual-check-section,
        .setup-instructions {
          margin-top: 30px;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
        }
        
        .manual-check-section h2,
        .setup-instructions h2 {
          color: #334155;
          font-size: 1.25rem;
          margin-top: 0;
          margin-bottom: 15px;
        }
        
        .check-button {
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 10px 20px;
          font-size: 1rem;
          cursor: pointer;
          margin-top: 10px;
        }
        
        .check-button:hover:not(:disabled) {
          background-color: #2563eb;
        }
        
        .check-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .result-box {
          margin-top: 15px;
          padding: 15px;
          border-radius: 6px;
        }
        
        .result-box.success {
          background-color: #dcfce7;
          border: 1px solid #86efac;
        }
        
        .result-box.error {
          background-color: #fee2e2;
          border: 1px solid #fecaca;
        }
        
        .error-text {
          color: #b91c1c;
          font-weight: 500;
        }
        
        .help-text {
          margin-top: 8px;
          color: #475569;
          font-size: 0.9rem;
        }
        
        .inline-link {
          color: #3b82f6;
          text-decoration: underline;
          font-weight: 500;
        }
        
        .setup-instructions ol {
          padding-left: 20px;
          margin: 0;
        }
        
        .setup-instructions li {
          margin-bottom: 15px;
        }
        
        .setup-instructions strong {
          color: #334155;
          display: block;
          margin-bottom: 5px;
        }
        
        .setup-instructions p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
};

export default TestNotificationPage;

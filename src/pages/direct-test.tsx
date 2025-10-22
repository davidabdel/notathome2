import React, { useState } from 'react';
import Link from 'next/link';

const DirectTestPage: React.FC = () => {
  const [sessionId, setSessionId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isApproaching, setIsApproaching] = useState<boolean>(true);

  const sendDirectTest = async () => {
    if (!sessionId) {
      setError('Please enter a session ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/direct-notification-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          isApproachingExpiration: isApproaching
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || data.message || 'Failed to send notification');
        if (data.details) {
          setError(`${error}: ${data.details}`);
        }
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header>
        <h1>Direct Notification Test</h1>
        <div className="nav-links">
          <Link href="/test-notification" className="nav-link">Regular Test</Link>
          <Link href="/session-debug" className="nav-link">Session Debug</Link>
          <Link href="/" className="nav-link">Home</Link>
        </div>
      </header>
      
      <main>
        <div className="info-box">
          <h2>About Direct Testing</h2>
          <p>
            This page provides a simplified approach to test session notifications.
            It will try multiple ways to find a session and send a notification:
          </p>
          <ol>
            <li>First try with the exact session ID you provide</li>
            <li>If that fails, try with just the first 36 characters (for UUIDs)</li>
            <li>If all else fails, use the most recent session in the database</li>
          </ol>
        </div>

        <div className="test-panel">
          <h2>Send Test Notification</h2>
          
          <div className="input-group">
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="Enter session ID or code"
              className="session-input"
            />
          </div>
          
          <div className="option-group">
            <label className="radio-label">
              <input
                type="radio"
                checked={isApproaching}
                onChange={() => setIsApproaching(true)}
              />
              Approaching Expiration (23 hours)
            </label>
            
            <label className="radio-label">
              <input
                type="radio"
                checked={!isApproaching}
                onChange={() => setIsApproaching(false)}
              />
              Expired Session (24 hours)
            </label>
          </div>
          
          <button
            onClick={sendDirectTest}
            disabled={loading}
            className="test-button"
          >
            {loading ? 'Sending...' : 'Send Test Notification'}
          </button>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {result && (
            <div className="result-box">
              <h3>{result.success ? 'Notification Sent!' : 'Failed to Send'}</h3>
              <p>{result.message}</p>
              
              {result.session && (
                <div className="session-details">
                  <p><strong>Session Code:</strong> {result.session.code}</p>
                  <p><strong>Session ID:</strong> {result.session.id}</p>
                  <p><strong>Congregation:</strong> {result.session.congregation}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      
      <style jsx>{`
        .container {
          max-width: 800px;
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
          margin-bottom: 10px;
        }
        
        .info-box ol {
          margin: 0;
          padding-left: 20px;
          color: #1e3a8a;
        }
        
        .info-box li {
          margin-bottom: 5px;
        }
        
        .test-panel {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
        }
        
        .test-panel h2 {
          margin-top: 0;
          margin-bottom: 20px;
          color: #334155;
          font-size: 1.3rem;
        }
        
        .input-group {
          margin-bottom: 15px;
        }
        
        .session-input {
          width: 100%;
          padding: 10px;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          font-size: 1rem;
          font-family: monospace;
        }
        
        .option-group {
          margin-bottom: 20px;
        }
        
        .radio-label {
          display: block;
          margin-bottom: 10px;
          color: #334155;
          cursor: pointer;
        }
        
        .radio-label input {
          margin-right: 8px;
        }
        
        .test-button {
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 12px 20px;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .test-button:hover:not(:disabled) {
          background-color: #2563eb;
        }
        
        .test-button:disabled {
          background-color: #93c5fd;
          cursor: not-allowed;
        }
        
        .error-message {
          background-color: #fee2e2;
          color: #b91c1c;
          padding: 12px;
          border-radius: 6px;
          margin-top: 20px;
        }
        
        .result-box {
          background-color: #f0fdf4;
          border: 1px solid #86efac;
          border-radius: 6px;
          padding: 15px;
          margin-top: 20px;
          color: #166534;
        }
        
        .result-box h3 {
          margin-top: 0;
          margin-bottom: 10px;
          font-size: 1.2rem;
        }
        
        .session-details {
          background-color: rgba(255, 255, 255, 0.5);
          padding: 10px;
          border-radius: 4px;
          margin-top: 15px;
        }
        
        .session-details p {
          margin: 5px 0;
        }
      `}</style>
    </div>
  );
};

export default DirectTestPage;

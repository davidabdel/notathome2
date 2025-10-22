import React, { useState } from 'react';
import Link from 'next/link';

const SimpleFixPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState<boolean>(false);

  const createSimpleSearch = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/create-simple-search-function', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(`Error creating search function: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const testSessionId = async () => {
    if (!sessionId) {
      setError('Please enter a session ID');
      return;
    }

    setTestLoading(true);
    setTestResult(null);
    
    try {
      // Try to find the session using direct query
      const response = await fetch('/api/direct-session-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId })
      });
      
      const data = await response.json();
      setTestResult(data);
    } catch (err) {
      setError(`Error testing session ID: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="container">
      <header>
        <h1>Simple Session ID Fix</h1>
        <div className="nav-links">
          <Link href="/test-notification" className="nav-link">Test Notifications</Link>
          <Link href="/session-debug" className="nav-link">Session Debug</Link>
          <Link href="/" className="nav-link">Home</Link>
        </div>
      </header>
      
      <main>
        <div className="info-box">
          <h2>About This Fix</h2>
          <p>
            This page provides a simpler approach to fix the session ID issue without requiring
            special database functions.
          </p>
          <p>
            <strong>What this does:</strong>
          </p>
          <ol>
            <li>Creates a direct API endpoint to check sessions</li>
            <li>Uses simple string comparison for session IDs</li>
            <li>Provides a direct test to verify your session exists</li>
          </ol>
        </div>

        <div className="action-panel">
          <h3>Step 1: Create Simple Search Function</h3>
          <button
            onClick={createSimpleSearch}
            disabled={loading}
            className="action-button"
          >
            {loading ? 'Creating...' : 'Create Simple Search'}
          </button>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {result && (
            <div className={`result-box ${result.success ? 'success' : 'error'}`}>
              <p>{result.success ? '✓ ' : '✗ '}{result.message || result.error}</p>
              {result.details && <p className="details">{result.details}</p>}
            </div>
          )}
        </div>

        <div className="action-panel">
          <h3>Step 2: Test Your Session ID</h3>
          <div className="input-group">
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="Enter your session ID"
              className="text-input"
            />
            <button
              onClick={testSessionId}
              disabled={testLoading || !sessionId}
              className="action-button"
            >
              {testLoading ? 'Testing...' : 'Test Session ID'}
            </button>
          </div>

          {testResult && (
            <div className={`result-box ${testResult.exists ? 'success' : 'error'}`}>
              <h4>{testResult.exists ? 'Session Found!' : 'Session Not Found'}</h4>
              {testResult.exists ? (
                <div className="session-details">
                  <p><strong>Code:</strong> {testResult.session.code}</p>
                  <p><strong>Created:</strong> {new Date(testResult.session.created_at).toLocaleString()}</p>
                  <p><strong>Active:</strong> {testResult.session.is_active ? 'Yes' : 'No'}</p>
                </div>
              ) : (
                <p>{testResult.message}</p>
              )}
            </div>
          )}
        </div>

        <div className="action-panel">
          <h3>Step 3: Try the Test Notification</h3>
          <p>
            Now that you've verified your session exists, try the test notification again:
          </p>
          <Link href="/test-notification" className="nav-button">
            Go to Test Notification Page
          </Link>
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
        
        .action-panel {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
        }
        
        .action-panel h3 {
          margin-top: 0;
          margin-bottom: 15px;
          color: #334155;
          font-size: 1.2rem;
        }
        
        .action-button {
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 10px 16px;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .action-button:hover:not(:disabled) {
          background-color: #2563eb;
        }
        
        .action-button:disabled {
          background-color: #93c5fd;
          cursor: not-allowed;
        }
        
        .error-message {
          background-color: #fee2e2;
          color: #b91c1c;
          padding: 12px;
          border-radius: 6px;
          margin-top: 15px;
          font-size: 0.9rem;
        }
        
        .result-box {
          margin-top: 15px;
          padding: 12px;
          border-radius: 6px;
          font-size: 0.9rem;
        }
        
        .result-box.success {
          background-color: #f0fdf4;
          border: 1px solid #86efac;
          color: #166534;
        }
        
        .result-box.error {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
        }
        
        .result-box h4 {
          margin-top: 0;
          margin-bottom: 10px;
          font-size: 1.1rem;
        }
        
        .details {
          font-family: monospace;
          background-color: rgba(0, 0, 0, 0.05);
          padding: 8px;
          border-radius: 4px;
          margin-top: 10px;
          overflow-x: auto;
        }
        
        .input-group {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
        }
        
        .text-input {
          flex: 1;
          padding: 10px;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          font-size: 0.9rem;
          font-family: monospace;
        }
        
        .session-details {
          background-color: rgba(255, 255, 255, 0.5);
          padding: 10px;
          border-radius: 4px;
        }
        
        .session-details p {
          margin: 5px 0;
        }
        
        .nav-button {
          display: inline-block;
          background-color: #3b82f6;
          color: white;
          text-decoration: none;
          padding: 10px 16px;
          border-radius: 4px;
          font-size: 0.9rem;
          transition: background-color 0.2s;
        }
        
        .nav-button:hover {
          background-color: #2563eb;
        }
      `}</style>
    </div>
  );
};

export default SimpleFixPage;

import React, { useState } from 'react';
import Link from 'next/link';

const DebugSessionIdPage: React.FC = () => {
  const [sessionId, setSessionId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const debugSessionId = async () => {
    if (!sessionId) {
      setError('Please enter a session ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/debug-session-id?sessionId=${encodeURIComponent(sessionId)}`);
      const data = await response.json();
      
      setResult(data);
    } catch (err) {
      setError(`Error debugging session: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header>
        <h1>Advanced Session ID Debugger</h1>
        <div className="nav-links">
          <Link href="/check-session" className="nav-link">Session Checker</Link>
          <Link href="/session-debug" className="nav-link">Session Debug</Link>
          <Link href="/test-notification" className="nav-link">Test Notifications</Link>
          <Link href="/" className="nav-link">Home</Link>
        </div>
      </header>
      
      <main>
        <div className="info-box">
          <h2>About Advanced Session ID Debugging</h2>
          <p>
            This tool tries multiple approaches to find a session in the database:
          </p>
          <ul>
            <li><strong>Exact Match:</strong> Looks for the exact session ID</li>
            <li><strong>Normalized Match:</strong> If the ID is longer than 36 chars, tries with just the first 36</li>
            <li><strong>LIKE Match:</strong> Uses SQL LIKE to find sessions that start with the given ID</li>
            <li><strong>All Sessions:</strong> Lists all recent sessions for comparison</li>
          </ul>
        </div>

        <div className="debug-panel">
          <h2>Debug Session ID</h2>
          <div className="input-group">
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="Enter session ID to debug"
              className="session-id-input"
              disabled={loading}
            />
            <button
              onClick={debugSessionId}
              disabled={loading || !sessionId}
              className="debug-button"
            >
              {loading ? 'Debugging...' : 'Debug Session ID'}
            </button>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {result && (
            <div className="result-container">
              <h3>Debug Results</h3>
              
              <div className="debug-section">
                <h4>Session ID</h4>
                <pre className="session-id-display">{result.sessionId}</pre>
                <div className="id-info">
                  <div><strong>Length:</strong> {result.sessionId.length} characters</div>
                  {result.sessionId.length > 36 && (
                    <div className="warning">
                      This ID is longer than the standard 36 characters for a UUID.
                      The first 36 characters would be: <code>{result.sessionId.substring(0, 36)}</code>
                    </div>
                  )}
                </div>
              </div>

              <div className="debug-section">
                <h4>Exact Match</h4>
                {result.results.exactMatch?.data?.length > 0 ? (
                  <div className="success-message">
                    Found {result.results.exactMatch.data.length} session(s) with exact match!
                  </div>
                ) : (
                  <div className="neutral-message">
                    No sessions found with exact match.
                  </div>
                )}
                {result.results.errors.exactMatch && (
                  <div className="error-details">
                    Error: {JSON.stringify(result.results.errors.exactMatch)}
                  </div>
                )}
              </div>

              {result.results.normalizedMatch && (
                <div className="debug-section">
                  <h4>Normalized Match (first 36 chars)</h4>
                  {result.results.normalizedMatch?.data?.length > 0 ? (
                    <div className="success-message">
                      Found {result.results.normalizedMatch.data.length} session(s) with normalized ID: {result.results.normalizedMatch.normalizedId}
                    </div>
                  ) : (
                    <div className="neutral-message">
                      No sessions found with normalized ID: {result.results.normalizedMatch.normalizedId}
                    </div>
                  )}
                  {result.results.errors.normalizedMatch && (
                    <div className="error-details">
                      Error: {JSON.stringify(result.results.errors.normalizedMatch)}
                    </div>
                  )}
                </div>
              )}

              <div className="debug-section">
                <h4>LIKE Match (starts with)</h4>
                {result.results.likeMatch?.data?.length > 0 ? (
                  <div className="success-message">
                    Found {result.results.likeMatch.data.length} session(s) that start with this ID!
                  </div>
                ) : (
                  <div className="neutral-message">
                    No sessions found that start with this ID.
                  </div>
                )}
                {result.results.errors.likeMatch && (
                  <div className="error-details">
                    Error: {JSON.stringify(result.results.errors.likeMatch)}
                  </div>
                )}
              </div>

              <div className="debug-section">
                <h4>All Sessions ({result.results.allSessions.length})</h4>
                {result.results.allSessions.length > 0 ? (
                  <table className="sessions-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Created</th>
                        <th>Active</th>
                        <th>ID</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.results.allSessions.map((session: any) => (
                        <tr key={session.id}>
                          <td>{session.code}</td>
                          <td>{new Date(session.created_at).toLocaleString()}</td>
                          <td>{session.is_active ? 'Yes' : 'No'}</td>
                          <td className="id-cell">{session.id}</td>
                          <td>
                            <button 
                              className="copy-button"
                              onClick={() => {
                                setSessionId(session.id);
                                navigator.clipboard.writeText(session.id);
                              }}
                            >
                              Use This ID
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="neutral-message">No sessions found in the database.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      
      <style jsx>{`
        .container {
          max-width: 1200px;
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
        
        .info-box ul {
          margin: 0;
          padding-left: 20px;
        }
        
        .info-box li {
          color: #1e3a8a;
          margin-bottom: 5px;
        }
        
        .debug-panel {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
        }
        
        .debug-panel h2 {
          color: #334155;
          font-size: 1.5rem;
          margin-top: 0;
          margin-bottom: 20px;
        }
        
        .input-group {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }
        
        .session-id-input {
          flex: 1;
          padding: 10px;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          font-size: 0.9rem;
          font-family: monospace;
        }
        
        .debug-button {
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0 20px;
          font-size: 0.9rem;
          cursor: pointer;
        }
        
        .debug-button:disabled {
          background-color: #93c5fd;
          cursor: not-allowed;
        }
        
        .error-message {
          background-color: #fee2e2;
          color: #b91c1c;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
        }
        
        .result-container {
          margin-top: 20px;
        }
        
        .result-container h3 {
          color: #334155;
          font-size: 1.3rem;
          margin-bottom: 15px;
        }
        
        .debug-section {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 20px;
        }
        
        .debug-section h4 {
          color: #475569;
          font-size: 1.1rem;
          margin-top: 0;
          margin-bottom: 10px;
        }
        
        .session-id-display {
          background-color: #f1f5f9;
          padding: 10px;
          border-radius: 4px;
          font-family: monospace;
          overflow-wrap: break-word;
          white-space: pre-wrap;
          margin: 0 0 10px 0;
        }
        
        .id-info {
          font-size: 0.9rem;
          color: #475569;
          margin-bottom: 10px;
        }
        
        .warning {
          background-color: #fffbeb;
          color: #92400e;
          padding: 10px;
          border-radius: 4px;
          margin-top: 10px;
          font-size: 0.9rem;
        }
        
        .success-message {
          background-color: #f0fdf4;
          color: #166534;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 10px;
        }
        
        .neutral-message {
          background-color: #f1f5f9;
          color: #475569;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 10px;
        }
        
        .error-details {
          background-color: #fff1f2;
          color: #be123c;
          padding: 10px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.85rem;
          overflow-x: auto;
          margin-top: 10px;
        }
        
        .sessions-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }
        
        .sessions-table th {
          text-align: left;
          padding: 10px;
          background-color: #f1f5f9;
          color: #475569;
          font-weight: 600;
        }
        
        .sessions-table td {
          padding: 10px;
          border-top: 1px solid #e2e8f0;
          color: #334155;
        }
        
        .id-cell {
          font-family: monospace;
          word-break: break-all;
          max-width: 300px;
        }
        
        .copy-button {
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 5px 10px;
          font-size: 0.8rem;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default DebugSessionIdPage;

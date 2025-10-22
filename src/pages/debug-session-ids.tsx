import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const DebugSessionIdsPage: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [fixResult, setFixResult] = useState<{success: boolean; message: string} | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/debug-session-ids');
      const data = await response.json();
      
      if (response.ok) {
        setSessions(data.sessions || []);
      } else {
        setError(data.error || 'Failed to fetch session IDs');
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);
  
  const fixSessionId = async (sessionId: string) => {
    if (!sessionId) return;
    
    setFixingId(sessionId);
    setFixResult(null);
    
    try {
      const response = await fetch('/api/fix-session-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setFixResult({
          success: true,
          message: `Successfully fixed session ID: ${data.originalId} → ${data.fixedId}`
        });
        // Refresh the sessions list
        fetchSessions();
      } else {
        setFixResult({
          success: false,
          message: data.error || 'Failed to fix session ID'
        });
      }
    } catch (err) {
      setFixResult({
        success: false,
        message: `Error: ${err instanceof Error ? err.message : String(err)}`
      });
    } finally {
      setFixingId(null);
    }
  };
  }, []);

  return (
    <div className="container">
      <header>
        <h1>Debug Session IDs</h1>
        <div className="nav-links">
          <Link href="/session-debug" className="nav-link">Session Debug</Link>
          <Link href="/test-notification" className="nav-link">Test Notifications</Link>
          <Link href="/debug" className="nav-link">Debug</Link>
          <Link href="/" className="nav-link">Home</Link>
        </div>
      </header>
      
      <main>
        <div className="info-box">
          <h2>About Session ID Debugging</h2>
          <p>
            This page shows the raw session IDs from the database and analyzes their format.
            This helps identify if there are any issues with the session IDs that might be causing problems.
          </p>
          <p>
            <strong>Valid UUID format:</strong> xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 characters including hyphens)
          </p>
        </div>
        
        {fixResult && (
          <div className={`result-message ${fixResult.success ? 'success' : 'error'}`}>
            {fixResult.message}
          </div>
        )}
        
        {loading ? (
          <div className="loading">Loading session data...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <div className="sessions-container">
            <h2>Session IDs ({sessions.length})</h2>
            <table className="sessions-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Session ID</th>
                  <th>Length</th>
                  <th>Valid UUID?</th>
                  <th>Has Extra Chars?</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} className={!session.isValidUuid ? 'invalid-row' : ''}>
                    <td>{session.code}</td>
                    <td className="id-cell">{session.id}</td>
                    <td>{session.length}</td>
                    <td>{session.isValidUuid ? 'Yes' : 'No'}</td>
                    <td>{session.hasExtraChars ? 'Yes' : 'No'}</td>
                    <td>
                      <button 
                        className="copy-button"
                        onClick={() => {
                          navigator.clipboard.writeText(session.id);
                          alert('Session ID copied to clipboard!');
                        }}
                      >
                        Copy ID
                      </button>
                      {session.hasExtraChars && (
                        <>
                          <button
                            className="fix-button"
                            onClick={() => {
                              const fixedId = session.id.substring(0, 36);
                              navigator.clipboard.writeText(fixedId);
                              alert('Fixed Session ID (first 36 chars) copied to clipboard!');
                            }}
                          >
                            Copy Fixed ID
                          </button>
                          <button
                            className="repair-button"
                            onClick={() => fixSessionId(session.id)}
                            disabled={fixingId === session.id}
                          >
                            {fixingId === session.id ? 'Fixing...' : 'Fix in DB'}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
          margin-bottom: 0;
        }
        
        .loading {
          text-align: center;
          padding: 20px;
          color: #64748b;
          font-size: 1.1rem;
        }
        
        .error-message {
          background-color: #fee2e2;
          color: #b91c1c;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
        }
        
        .sessions-container {
          margin-top: 20px;
        }
        
        .sessions-container h2 {
          color: #334155;
          font-size: 1.5rem;
          margin-bottom: 15px;
        }
        
        .sessions-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          font-size: 0.9rem;
        }
        
        .sessions-table th {
          background-color: #f1f5f9;
          color: #475569;
          text-align: left;
          padding: 12px;
          font-weight: 600;
          border-bottom: 2px solid #e2e8f0;
        }
        
        .sessions-table td {
          padding: 12px;
          border-bottom: 1px solid #e2e8f0;
          color: #334155;
        }
        
        .id-cell {
          font-family: monospace;
          word-break: break-all;
          max-width: 300px;
        }
        
        .invalid-row {
          background-color: #fff1f2;
        }
        
        .copy-button, .fix-button {
          background-color: #e2e8f0;
          color: #475569;
          border: none;
          border-radius: 4px;
          padding: 6px 10px;
          font-size: 0.8rem;
          cursor: pointer;
          margin-right: 5px;
        }
        
        .copy-button:hover {
          background-color: #cbd5e1;
        }
        
        .fix-button {
          background-color: #dbeafe;
          color: #1e40af;
        }
        
        .fix-button:hover {
          background-color: #bfdbfe;
        }
      `}</style>
    </div>
  );
};

export default DebugSessionIdsPage;

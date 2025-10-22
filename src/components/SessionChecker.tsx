import React, { useState } from 'react';

const SessionChecker: React.FC = () => {
  const [sessionId, setSessionId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const checkSession = async () => {
    if (!sessionId) {
      setError('Please enter a session ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/check-session?sessionId=${encodeURIComponent(sessionId)}`);
      const data = await response.json();
      
      setResult(data);
    } catch (err) {
      setError(`Error checking session: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="session-checker">
      <h2>Session Existence Checker</h2>
      <p className="description">
        This tool checks if a session exists in the database and retrieves its details.
      </p>

      <div className="input-group">
        <input
          type="text"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          placeholder="Enter session ID"
          className="session-id-input"
          disabled={loading}
        />
        <button
          onClick={checkSession}
          disabled={loading || !sessionId}
          className="check-button"
        >
          {loading ? 'Checking...' : 'Check Session'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {result && (
        <div className={`result-box ${result.exists ? 'success' : 'error'}`}>
          <h3>{result.exists ? 'Session Found' : 'Session Not Found'}</h3>
          
          {result.exists ? (
            <div className="session-details">
              {result.wasNormalized && (
                <div className="info-message">
                  <p><strong>Note:</strong> The session ID was normalized from {result.originalId} to {result.normalizedId}</p>
                </div>
              )}
              <div className="detail-row">
                <div className="detail-label">Session ID:</div>
                <div className="detail-value">{result.session.id}</div>
              </div>
              <div className="detail-row">
                <div className="detail-label">Code:</div>
                <div className="detail-value">{result.session.code}</div>
              </div>
              <div className="detail-row">
                <div className="detail-label">Active:</div>
                <div className="detail-value">{result.session.is_active ? 'Yes' : 'No'}</div>
              </div>
              <div className="detail-row">
                <div className="detail-label">Created:</div>
                <div className="detail-value">{new Date(result.session.created_at).toLocaleString()}</div>
              </div>
              <div className="detail-row">
                <div className="detail-label">Expires:</div>
                <div className="detail-value">{new Date(result.session.expires_at).toLocaleString()}</div>
              </div>
              
              {result.congregation && (
                <>
                  <h4>Congregation</h4>
                  <div className="detail-row">
                    <div className="detail-label">Name:</div>
                    <div className="detail-value">{result.congregation.name}</div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-label">Notification Email:</div>
                    <div className="detail-value">
                      {result.congregation.notification_email || 'Not set'}
                    </div>
                  </div>
                </>
              )}
              
              {result.congregationError && (
                <div className="warning">
                  <strong>Warning:</strong> Could not fetch congregation details: {result.congregationError}
                </div>
              )}
              
              {result.multipleResults && (
                <div className="warning">
                  <strong>Warning:</strong> Multiple sessions found with this ID (unusual)
                </div>
              )}
            </div>
          ) : (
            <div>
              <p>{result.error}: {result.details}</p>
              
              {result.wasNormalized && (
                <div className="info-message">
                  <p><strong>Note:</strong> We tried both the original ID ({result.originalId}) and the normalized ID ({result.normalizedId}), but neither was found.</p>
                </div>
              )}
              
              {result.availableSessions && result.availableSessions.length > 0 && (
                <div className="available-sessions">
                  <h4>Available Sessions</h4>
                  <ul className="sessions-list">
                    {result.availableSessions.map((session: any) => (
                      <li key={session.id} className="session-item">
                        <div className="session-code">Code: {session.code}</div>
                        <div className="session-created">Created: {new Date(session.created_at).toLocaleString()}</div>
                        <div className="session-id">ID: {session.id}</div>
                        <button 
                          className="use-id-button"
                          onClick={() => setSessionId(session.id)}
                        >
                          Use this ID
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .session-checker {
          background-color: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          padding: 1.5rem;
          margin: 1.5rem 0;
        }
        
        h2 {
          margin-top: 0;
          margin-bottom: 1rem;
          color: #1e293b;
          font-size: 1.5rem;
        }
        
        .description {
          color: #64748b;
          margin-bottom: 1.5rem;
        }
        
        .input-group {
          display: flex;
          gap: 10px;
          margin-bottom: 1.5rem;
        }
        
        .session-id-input {
          flex: 1;
          padding: 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          font-size: 0.9rem;
          color: #1e293b;
          font-family: monospace;
        }
        
        .check-button {
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0 1.5rem;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .check-button:hover:not(:disabled) {
          background-color: #2563eb;
        }
        
        .check-button:disabled {
          background-color: #93c5fd;
          cursor: not-allowed;
        }
        
        .error-message {
          background-color: #fee2e2;
          color: #b91c1c;
          padding: 0.75rem;
          border-radius: 4px;
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
        }
        
        .result-box {
          padding: 1rem;
          border-radius: 6px;
          margin-top: 1.5rem;
        }
        
        .result-box.success {
          background-color: #f0fdf4;
          border: 1px solid #86efac;
        }
        
        .result-box.error {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
        }
        
        .result-box h3 {
          margin-top: 0;
          margin-bottom: 1rem;
          font-size: 1.25rem;
          color: #1e293b;
        }
        
        .session-details {
          margin-top: 1rem;
        }
        
        .detail-row {
          display: flex;
          margin-bottom: 0.5rem;
        }
        
        .detail-label {
          flex: 0 0 150px;
          font-weight: 500;
          color: #475569;
        }
        
        .detail-value {
          flex: 1;
          color: #1e293b;
        }
        
        h4 {
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          color: #334155;
          font-size: 1.1rem;
        }
        
        .warning {
          margin-top: 1rem;
          padding: 0.75rem;
          background-color: #fffbeb;
          border-radius: 4px;
          color: #92400e;
          font-size: 0.9rem;
        }
        
        .info-message {
          margin-bottom: 1rem;
          padding: 0.75rem;
          background-color: #eff6ff;
          border-radius: 4px;
          color: #1e40af;
          font-size: 0.9rem;
        }
        
        .info-message p {
          margin: 0;
        }
        
        .available-sessions {
          margin-top: 1rem;
        }
        
        .sessions-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .session-item {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          padding: 0.75rem;
          margin-bottom: 0.75rem;
        }
        
        .session-code {
          font-weight: 500;
          color: #1e293b;
          margin-bottom: 0.25rem;
        }
        
        .session-created {
          color: #64748b;
          font-size: 0.85rem;
          margin-bottom: 0.25rem;
        }
        
        .session-id {
          color: #64748b;
          font-size: 0.85rem;
          font-family: monospace;
          margin-bottom: 0.5rem;
        }
        
        .use-id-button {
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.25rem 0.75rem;
          font-size: 0.8rem;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default SessionChecker;

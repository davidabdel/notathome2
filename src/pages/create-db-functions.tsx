import React, { useState } from 'react';
import Link from 'next/link';

const CreateDbFunctionsPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const createFunctions = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/create-session-search-functions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(`Error creating functions: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header>
        <h1>Create Database Functions</h1>
        <div className="nav-links">
          <Link href="/debug-session-id" className="nav-link">Advanced Session Debug</Link>
          <Link href="/session-debug" className="nav-link">Session Debug</Link>
          <Link href="/test-notification" className="nav-link">Test Notifications</Link>
          <Link href="/" className="nav-link">Home</Link>
        </div>
      </header>
      
      <main>
        <div className="info-box">
          <h2>About Database Functions</h2>
          <p>
            This page creates stored procedures in the database to help with session ID searching.
            These functions are needed for the advanced session debugging tools to work properly.
          </p>
          <p>
            <strong>Functions to be created:</strong>
          </p>
          <ul>
            <li><code>find_sessions_by_id_prefix_text</code> - Finds sessions using ID prefix with text casting</li>
            <li><code>find_session_by_exact_id</code> - Finds a session by exact ID</li>
            <li><code>find_sessions_flexible</code> - Tries multiple approaches to find a session</li>
          </ul>
        </div>

        <div className="action-panel">
          <button
            onClick={createFunctions}
            disabled={loading}
            className="create-button"
          >
            {loading ? 'Creating Functions...' : 'Create Database Functions'}
          </button>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {result && (
            <div className={`result-box ${result.success ? 'success' : 'error'}`}>
              <h3>{result.success ? 'Functions Created Successfully' : 'Error Creating Functions'}</h3>
              
              {result.results && (
                <div className="results-list">
                  <h4>Results:</h4>
                  <ul>
                    {result.results.map((r: any, i: number) => (
                      <li key={i} className={r.success ? 'success-item' : 'error-item'}>
                        Function {i + 1}: {r.success ? 'Created successfully' : `Error: ${r.error}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="next-steps">
                <p>Next steps:</p>
                <ul>
                  <li>Go to <Link href="/debug-session-id" className="inline-link">Advanced Session Debugger</Link> to test the functions</li>
                  <li>Try the <Link href="/test-notification" className="inline-link">Test Notification</Link> page again</li>
                </ul>
              </div>
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
        
        .info-box ul {
          margin: 0;
          padding-left: 20px;
        }
        
        .info-box li {
          color: #1e3a8a;
          margin-bottom: 5px;
        }
        
        code {
          background-color: #dbeafe;
          padding: 2px 5px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.9em;
        }
        
        .action-panel {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
        }
        
        .create-button {
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 12px 20px;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .create-button:hover:not(:disabled) {
          background-color: #2563eb;
        }
        
        .create-button:disabled {
          background-color: #93c5fd;
          cursor: not-allowed;
        }
        
        .error-message {
          background-color: #fee2e2;
          color: #b91c1c;
          padding: 15px;
          border-radius: 6px;
          margin-top: 20px;
        }
        
        .result-box {
          margin-top: 20px;
          padding: 15px;
          border-radius: 6px;
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
          margin-bottom: 15px;
          color: #1e293b;
        }
        
        .results-list {
          margin-bottom: 20px;
        }
        
        .results-list h4 {
          margin-top: 0;
          margin-bottom: 10px;
          color: #475569;
        }
        
        .results-list ul {
          margin: 0;
          padding-left: 20px;
        }
        
        .success-item {
          color: #166534;
        }
        
        .error-item {
          color: #b91c1c;
        }
        
        .next-steps {
          margin-top: 20px;
          border-top: 1px solid #e2e8f0;
          padding-top: 15px;
        }
        
        .next-steps p {
          font-weight: 500;
          margin-top: 0;
          margin-bottom: 10px;
        }
        
        .next-steps ul {
          margin: 0;
          padding-left: 20px;
        }
        
        .inline-link {
          color: #3b82f6;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default CreateDbFunctionsPage;

import React, { useState, useEffect } from 'react';
import Head from 'next/head';

interface ConnectionStatus {
  success: boolean;
  message: string;
  error?: string;
  data?: any;
}

export default function TestConnection() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setStatus(null);
    
    try {
      const response = await fetch('/api/test-connection');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      setStatus({
        success: false,
        message: 'Failed to test connection',
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <Head>
        <title>Test Supabase Connection - Not At Home</title>
        <meta name="description" content="Test Supabase connection for Not At Home app" />
      </Head>

      <main>
        <h1 className="title">Test Supabase Connection</h1>
        
        <div className="card">
          <button 
            onClick={testConnection} 
            disabled={loading}
            className="test-button"
          >
            {loading ? 'Testing...' : 'Test Connection'}
          </button>
          
          {status && (
            <div className={`result ${status.success ? 'success' : 'error'}`}>
              <h3>{status.success ? '✅ Connection Successful' : '❌ Connection Failed'}</h3>
              <p>{status.message}</p>
              {status.error && (
                <div className="error-details">
                  <p><strong>Error:</strong> {status.error}</p>
                </div>
              )}
              {status.data && (
                <div className="data-details">
                  <p><strong>Details:</strong></p>
                  <pre>{JSON.stringify(status.data, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="back-link">
          <a href="/">← Back to Home</a>
        </div>
      </main>

      <style jsx>{`
        .container {
          min-height: 100vh;
          padding: 0 0.5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        main {
          padding: 5rem 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          width: 100%;
          max-width: 800px;
        }

        .title {
          margin: 0 0 2rem;
          line-height: 1.15;
          font-size: 2.5rem;
          text-align: center;
        }

        .card {
          margin: 1rem;
          padding: 1.5rem;
          text-align: left;
          color: inherit;
          text-decoration: none;
          border: 1px solid #eaeaea;
          border-radius: 10px;
          transition: color 0.15s ease, border-color 0.15s ease;
          width: 100%;
          max-width: 500px;
        }

        .test-button {
          background-color: #2196f3;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 12px 20px;
          font-size: 16px;
          cursor: pointer;
          transition: background-color 0.3s;
          width: 100%;
        }

        .test-button:hover:not(:disabled) {
          background-color: #1976d2;
        }

        .test-button:disabled {
          background-color: #90caf9;
          cursor: not-allowed;
        }

        .result {
          margin-top: 20px;
          padding: 15px;
          border-radius: 5px;
        }

        .success {
          background-color: #e8f5e9;
          border: 1px solid #a5d6a7;
        }

        .error {
          background-color: #ffebee;
          border: 1px solid #ef9a9a;
        }

        .error-details {
          margin-top: 10px;
          padding: 10px;
          background-color: #fff;
          border-radius: 4px;
        }

        .data-details {
          margin-top: 10px;
        }

        pre {
          background-color: #f5f5f5;
          padding: 10px;
          border-radius: 4px;
          overflow-x: auto;
        }

        .back-link {
          margin-top: 2rem;
        }

        .back-link a {
          color: #2196f3;
          text-decoration: none;
        }

        .back-link a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
} 
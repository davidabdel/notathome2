import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function DirectSetup() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSetup = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      
      const response = await fetch('/api/direct-insert');
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'An error occurred');
      }
    } catch (err: any) {
      console.error('Error setting up congregation:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <Head>
        <title>Direct Setup - Not At Home</title>
        <meta name="description" content="Direct setup for Not At Home app" />
      </Head>

      <main>
        <div className="header">
          <Link href="/" className="back-link">← Back to home</Link>
          <h1>Direct Setup</h1>
          <p className="description">Directly set up the Admin Congregation</p>
        </div>

        <div className="card">
          <p className="info">
            This page will directly insert the Admin Congregation into your database using the service role key to bypass RLS policies.
          </p>
          
          <div className="actions">
            <button 
              onClick={handleSetup} 
              disabled={loading}
              className="button primary"
            >
              {loading ? 'Setting up...' : 'Set Up Admin Congregation'}
            </button>
          </div>
          
          {error && (
            <div className="error-message">
              <h3>Error</h3>
              <p>{error}</p>
            </div>
          )}
          
          {result && (
            <div className="success-message">
              <h3>Success</h3>
              <p>{result.message}</p>
              
              {result.congregation && (
                <div className="congregation-details">
                  <h4>Congregation Details</h4>
                  <ul>
                    <li><strong>ID:</strong> {result.congregation.id}</li>
                    <li><strong>Name:</strong> {result.congregation.name}</li>
                    <li><strong>PIN Code:</strong> {result.congregation.pin_code}</li>
                    <li><strong>Status:</strong> {result.congregation.status}</li>
                  </ul>
                </div>
              )}
              
              <div className="next-steps">
                <h4>Next Steps</h4>
                <p>Now you can try logging in with:</p>
                <ul>
                  <li><strong>Congregation Name:</strong> Admin Congregation</li>
                  <li><strong>PIN Code:</strong> 123456</li>
                </ul>
                <Link href="/" className="button secondary">
                  Go to Login Page
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        .container {
          min-height: 100vh;
          padding: 2rem;
          max-width: 800px;
          margin: 0 auto;
        }
        
        .header {
          margin-bottom: 2rem;
        }
        
        .back-link {
          display: inline-block;
          margin-bottom: 1rem;
          color: #2563eb;
          text-decoration: none;
        }
        
        .back-link:hover {
          text-decoration: underline;
        }
        
        h1 {
          margin: 0 0 0.5rem;
          font-size: 2rem;
          color: #111827;
        }
        
        .description {
          color: #4b5563;
          margin: 0;
        }
        
        .card {
          background-color: white;
          border-radius: 0.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 1.5rem;
          border: 1px solid #e5e7eb;
        }
        
        .info {
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }
        
        .actions {
          margin-bottom: 1.5rem;
        }
        
        .button {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 0.375rem;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        
        .button.primary {
          background-color: #2563eb;
          color: white;
        }
        
        .button.primary:hover:not(:disabled) {
          background-color: #1d4ed8;
        }
        
        .button.primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .button.secondary {
          display: inline-block;
          background-color: #4b5563;
          color: white;
          text-decoration: none;
          margin-top: 1rem;
        }
        
        .button.secondary:hover {
          background-color: #374151;
        }
        
        .error-message {
          margin-top: 1.5rem;
          padding: 1rem;
          background-color: #fee2e2;
          border-radius: 0.375rem;
          color: #b91c1c;
        }
        
        .error-message h3 {
          margin-top: 0;
          margin-bottom: 0.5rem;
          font-size: 1.25rem;
        }
        
        .error-message p {
          margin: 0;
        }
        
        .success-message {
          margin-top: 1.5rem;
          padding: 1rem;
          background-color: #d1fae5;
          border-radius: 0.375rem;
          color: #065f46;
        }
        
        .success-message h3 {
          margin-top: 0;
          margin-bottom: 0.5rem;
          font-size: 1.25rem;
        }
        
        .success-message p {
          margin: 0 0 1rem;
        }
        
        .congregation-details {
          margin-top: 1rem;
          padding: 1rem;
          background-color: rgba(255, 255, 255, 0.5);
          border-radius: 0.375rem;
        }
        
        .congregation-details h4 {
          margin-top: 0;
          margin-bottom: 0.5rem;
          font-size: 1.125rem;
        }
        
        .congregation-details ul {
          margin: 0;
          padding-left: 1.5rem;
        }
        
        .congregation-details li {
          margin-bottom: 0.25rem;
        }
        
        .next-steps {
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(6, 95, 70, 0.2);
        }
        
        .next-steps h4 {
          margin-top: 0;
          margin-bottom: 0.5rem;
          font-size: 1.125rem;
        }
        
        .next-steps ul {
          margin-bottom: 1rem;
          padding-left: 1.5rem;
        }
        
        .next-steps li {
          margin-bottom: 0.25rem;
        }
      `}</style>
    </div>
  );
} 
import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function TestWebhook() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  const handleTestWebhook = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      // Create a test congregation request
      const testData = {
        name: 'Test Congregation',
        pin_code: '123456',
        contact_email: 'test@example.com'
      };
      
      // Send the request to the congregation-request API
      const response = await fetch('/api/congregation-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test webhook');
      }
      
      setResult({
        success: true,
        message: 'Test webhook sent successfully! Check server logs for details.'
      });
    } catch (error) {
      console.error('Error sending test webhook:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <Head>
        <title>Test Webhook - Not At Home</title>
        <meta name="description" content="Test the webhook functionality" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <main>
        <div className="content-container">
          <div className="header">
            <Link href="/" className="back-link">← Back to home</Link>
            <h1>Test Webhook</h1>
            <p className="description">Test the congregation request webhook functionality</p>
          </div>

          <div className="test-container">
            <p>
              This page allows you to test the webhook functionality for congregation requests.
              Clicking the button below will send a test congregation request to your webhook URL.
            </p>
            
            <div className="webhook-info">
              <h2>Webhook Configuration</h2>
              <p>
                Make sure you have set the <code>CONGREGATION_REQUEST_WEBHOOK_URL</code> environment variable
                in your <code>.env.local</code> file.
              </p>
              <p>
                Current webhook URL: <code>{process.env.CONGREGATION_REQUEST_WEBHOOK_URL || 'Not configured'}</code>
              </p>
            </div>
            
            <div className="test-actions">
              <button 
                onClick={handleTestWebhook} 
                disabled={loading}
                className="test-button"
              >
                {loading ? 'Sending...' : 'Send Test Webhook'}
              </button>
            </div>
            
            {result && (
              <div className={`result-container ${result.success ? 'success' : 'error'}`}>
                {result.success ? (
                  <>
                    <div className="success-icon">✓</div>
                    <h3>Success!</h3>
                    <p>{result.message}</p>
                  </>
                ) : (
                  <>
                    <div className="error-icon">✗</div>
                    <h3>Error</h3>
                    <p>{result.error}</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <style jsx>{`
        .container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        
        main {
          flex: 1;
          padding: 2rem 1rem;
        }
        
        .content-container {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .header {
          margin-bottom: 2rem;
          text-align: center;
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
          font-size: 2rem;
          font-weight: 700;
          margin: 0 0 0.5rem 0;
        }
        
        .description {
          color: #6b7280;
        }
        
        .test-container {
          background-color: white;
          border-radius: 0.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 2rem;
        }
        
        .webhook-info {
          background-color: #f3f4f6;
          border-radius: 0.375rem;
          padding: 1rem;
          margin: 1.5rem 0;
        }
        
        .webhook-info h2 {
          font-size: 1.25rem;
          margin-top: 0;
        }
        
        code {
          background-color: #e5e7eb;
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          font-family: monospace;
        }
        
        .test-actions {
          margin: 2rem 0;
          display: flex;
          justify-content: center;
        }
        
        .test-button {
          background-color: #2563eb;
          color: white;
          border: none;
          border-radius: 0.375rem;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .test-button:hover {
          background-color: #1d4ed8;
        }
        
        .test-button:disabled {
          background-color: #93c5fd;
          cursor: not-allowed;
        }
        
        .result-container {
          margin-top: 2rem;
          padding: 1.5rem;
          border-radius: 0.375rem;
          text-align: center;
        }
        
        .result-container.success {
          background-color: #ecfdf5;
          color: #065f46;
        }
        
        .result-container.error {
          background-color: #fef2f2;
          color: #b91c1c;
        }
        
        .success-icon, .error-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }
        
        h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.25rem;
        }
      `}</style>
    </div>
  );
}

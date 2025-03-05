import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface CongregationRequest {
  name: string;
  pin_code: string;
  contact_email: string;
}

export default function RequestCongregation() {
  const [formData, setFormData] = useState<CongregationRequest>({
    name: '',
    pin_code: '',
    contact_email: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // For PIN code, ensure it's only digits and max 10 characters
    if (name === 'pin_code') {
      const pinValue = value.replace(/\D/g, '').slice(0, 10);
      setFormData({ ...formData, [name]: pinValue });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const validateForm = (): boolean => {
    // Validate congregation name
    if (formData.name.trim().length < 3) {
      setError('Congregation name must be at least 3 characters');
      return false;
    }

    // Validate PIN code (must be 3-10 digits)
    if (!/^\d{3,10}$/.test(formData.pin_code)) {
      setError('PIN code must be between 3 and 10 digits');
      return false;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.contact_email)) {
      setError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const submitRequest = async (data: CongregationRequest) => {
    try {
      const response = await fetch('/api/congregation-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit request');
      }
      
      return true;
    } catch (err) {
      console.error('Error submitting request:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit request');
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    const result = await submitRequest(formData);
    
    if (result) {
      setSuccess(true);
      setFormData({
        name: '',
        pin_code: '',
        contact_email: '',
      });
    }
    
    setLoading(false);
  };

  return (
    <div className="container">
      <Head>
        <title>Request Congregation Access - Not At Home</title>
        <meta name="description" content="Request access for your congregation to use Not At Home" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <main>
        <div className="content-container">
          <div className="header">
            <Link href="/" className="back-link">← Back to home</Link>
            <h1>Request Congregation Access</h1>
            <p className="description">Fill out this form to request access for your congregation</p>
          </div>

          {success ? (
            <div className="success-container">
              <div className="success-icon">✓</div>
              <h2>Request Submitted</h2>
              <p>Thank you for your request. We'll notify you at your email when it's approved.</p>
              <button 
                onClick={() => setSuccess(false)} 
                className="submit-button"
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            <div className="form-container">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="name">Congregation Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Enter congregation name"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="pin_code">PIN Code</label>
                  <input
                    type="text"
                    id="pin_code"
                    name="pin_code"
                    value={formData.pin_code}
                    onChange={handleChange}
                    required
                    placeholder="Enter 3-10 digit PIN"
                    inputMode="numeric"
                  />
                  <div className="input-hint">This PIN will be used by congregation members to access the app</div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="contact_email">Contact Email</label>
                  <input
                    type="email"
                    id="contact_email"
                    name="contact_email"
                    value={formData.contact_email}
                    onChange={handleChange}
                    required
                    placeholder="Enter contact email"
                  />
                  <div className="input-hint">We'll notify you at this email when your request is approved</div>
                </div>
                
                {error && <div className="error-message">{error}</div>}
                
                <button 
                  type="submit" 
                  disabled={loading || !formData.name || !formData.pin_code || !formData.contact_email}
                  className="submit-button"
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      <footer>
        <div className="footer-content">
          <a href="/setup-database" className="footer-link">Database Setup</a>
          <span className="divider">•</span>
          <span className="copyright">© 2024 Not At Home</span>
        </div>
      </footer>

      <style jsx>{`
        :root {
          --primary-color: #2563eb;
          --primary-hover: #1d4ed8;
          --success-color: #10b981;
          --error-color: #ef4444;
          --text-color: #111827;
          --text-secondary: #4b5563;
          --background-color: #ffffff;
          --border-color: #e5e7eb;
          --spacing-xs: 0.5rem;
          --spacing-sm: 1rem;
          --spacing-md: 1.5rem;
          --spacing-lg: 2rem;
          --spacing-xl: 3rem;
        }

        .container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: var(--background-color);
          color: var(--text-color);
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        }

        main {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: var(--spacing-md);
          width: 100%;
        }

        .content-container {
          width: 100%;
          max-width: 600px;
        }

        .header {
          margin-bottom: var(--spacing-lg);
        }

        .back-link {
          display: inline-block;
          margin-bottom: var(--spacing-sm);
          color: var(--primary-color);
          text-decoration: none;
          font-size: 0.875rem;
        }

        .back-link:hover {
          text-decoration: underline;
        }

        h1 {
          margin: 0 0 var(--spacing-xs);
          font-size: 1.875rem;
          font-weight: 700;
          color: var(--text-color);
        }

        .description {
          margin: 0;
          color: var(--text-secondary);
          font-size: 1rem;
        }

        .form-container {
          background-color: white;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: var(--spacing-lg);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .form-group {
          margin-bottom: var(--spacing-md);
        }

        label {
          display: block;
          margin-bottom: var(--spacing-xs);
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-color);
        }

        input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          font-size: 1rem;
          background-color: white;
          color: var(--text-color);
          transition: border-color 0.15s ease;
        }

        input:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
        }

        .input-hint {
          margin-top: var(--spacing-xs);
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .error-message {
          margin-bottom: var(--spacing-md);
          padding: 0.75rem;
          background-color: rgba(239, 68, 68, 0.1);
          border-radius: 6px;
          font-size: 0.875rem;
          color: var(--error-color);
        }

        .button {
          display: inline-block;
          width: 100%;
          padding: 0.75rem 1rem;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.15s ease;
          text-align: center;
        }

        .button.primary {
          background-color: var(--primary-color);
          color: white;
        }

        .button.primary:hover:not(:disabled) {
          background-color: var(--primary-hover);
        }

        .button.primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .submit-button {
          display: block;
          width: 100%;
          padding: 0.75rem 1rem;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.15s ease;
          text-align: center;
          background-color: #2563eb;
          color: white;
          margin-top: var(--spacing-md);
        }

        .submit-button:hover:not(:disabled) {
          background-color: #1d4ed8;
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .success-container {
          text-align: center;
          background-color: white;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: var(--spacing-xl);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .success-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          background-color: var(--success-color);
          color: white;
          border-radius: 50%;
          font-size: 32px;
          margin: 0 auto var(--spacing-lg);
        }

        h2 {
          margin: 0 0 var(--spacing-sm);
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-color);
        }

        .success-container p {
          margin: 0 0 var(--spacing-lg);
          color: var(--text-secondary);
        }

        footer {
          width: 100%;
          padding: var(--spacing-md);
          border-top: 1px solid var(--border-color);
        }

        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .footer-link {
          color: var(--text-secondary);
          text-decoration: none;
        }

        .footer-link:hover {
          color: var(--text-color);
        }

        .divider {
          margin: 0 var(--spacing-xs);
        }

        .copyright {
          color: var(--text-secondary);
        }

        @media (min-width: 768px) {
          main {
            padding-top: var(--spacing-xl);
          }
          
          h1 {
            font-size: 2.25rem;
          }
        }
      `}</style>
    </div>
  );
} 
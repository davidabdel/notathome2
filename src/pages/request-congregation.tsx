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
          --background-color: #f3f4f6;
          --border-color: #e5e7eb;
          --input-background: #f9fafb;
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
          padding: var(--spacing-xl) var(--spacing-md);
          width: 100%;
        }

        .content-container {
          width: 100%;
          max-width: 600px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          padding: var(--spacing-xl) var(--spacing-xl);
          margin-top: var(--spacing-lg);
        }

        .header {
          margin-bottom: var(--spacing-xl);
          text-align: left;
          width: 100%;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          margin-bottom: var(--spacing-lg);
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 0.875rem;
          transition: color 0.2s;
        }

        .back-link:hover {
          color: var(--primary-color);
        }

        h1 {
          font-size: 2.25rem;
          font-weight: 700;
          color: var(--text-color);
          margin: 0 0 var(--spacing-sm);
          line-height: 1.2;
        }

        .description {
          color: var(--text-secondary);
          font-size: 1.125rem;
          margin: 0;
          line-height: 1.5;
        }

        .form-container {
          width: 100%;
          margin-top: var(--spacing-lg);
        }

        .form-group {
          margin-bottom: var(--spacing-xl);
        }

        label {
          display: block;
          font-weight: 600;
          margin-bottom: var(--spacing-sm);
          color: var(--text-color);
          font-size: 1rem;
        }

        input {
          width: 100%;
          padding: 1rem 1.25rem;
          border: 2px solid var(--border-color);
          border-radius: 10px;
          font-size: 1.125rem;
          transition: all 0.2s;
          background: var(--input-background);
          color: var(--text-color);
        }

        input::placeholder {
          color: #9ca3af;
        }

        input:hover {
          border-color: #cbd5e1;
          background: white;
        }

        input:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
          background: white;
        }

        .input-hint {
          margin-top: var(--spacing-sm);
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .error-message {
          color: var(--error-color);
          font-size: 0.875rem;
          margin: var(--spacing-md) 0;
          padding: 1rem 1.25rem;
          background-color: rgba(239, 68, 68, 0.1);
          border-radius: 8px;
          display: flex;
          align-items: center;
        }

        .submit-button {
          width: 100%;
          padding: 1rem 1.5rem;
          background-color: var(--primary-color);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 1.125rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: var(--spacing-lg);
        }

        .submit-button:hover:not(:disabled) {
          background-color: var(--primary-hover);
          transform: translateY(-1px);
        }

        .submit-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .success-container {
          text-align: center;
          padding: var(--spacing-xl) var(--spacing-lg);
        }

        .success-icon {
          width: 64px;
          height: 64px;
          background-color: var(--success-color);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          margin: 0 auto var(--spacing-lg);
          box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.1);
        }

        .success-container h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: var(--spacing-sm);
          color: var(--text-color);
        }

        .success-container p {
          color: var(--text-secondary);
          font-size: 1.125rem;
          margin-bottom: var(--spacing-xl);
          line-height: 1.5;
        }

        footer {
          padding: var(--spacing-lg);
          text-align: center;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .footer-content {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .footer-link {
          color: var(--primary-color);
          text-decoration: none;
        }

        .footer-link:hover {
          text-decoration: underline;
        }

        .divider {
          color: var(--border-color);
        }

        @media (max-width: 640px) {
          main {
            padding: var(--spacing-md);
          }

          .content-container {
            padding: var(--spacing-lg);
            margin-top: var(--spacing-sm);
            border-radius: 12px;
          }

          h1 {
            font-size: 1.875rem;
          }

          .description {
            font-size: 1rem;
          }

          input {
            font-size: 1rem;
            padding: 0.875rem 1rem;
          }

          .submit-button {
            font-size: 1rem;
            padding: 0.875rem 1.25rem;
          }
        }
      `}</style>
    </div>
  );
} 
import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2, AlertCircle, Building, Hash, Mail, ArrowRight } from 'lucide-react';

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
    <div className="page-wrapper">
      <Head>
        <title>Request Congregation Access - Not At Home</title>
        <meta name="description" content="Request access for your congregation to use Not At Home" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <main className="main-content">
        <div className="content-container">
          <div className="header">
            <Link href="/" className="back-link">
              <ArrowLeft size={16} className="mr-1" /> Back to home
            </Link>
            <h1 className="title">Request Congregation Access</h1>
            <p className="description">Fill out this form to request access for your congregation</p>
          </div>

          {success ? (
            <div className="card success-card">
              <div className="success-icon-wrapper">
                <Check size={32} className="success-icon" />
              </div>
              <h2 className="success-title">Request Submitted</h2>
              <p className="success-message">Thank you for your request. We'll notify you at your email when it's approved.</p>
              <button
                onClick={() => setSuccess(false)}
                className="btn btn-primary"
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            <div className="card form-card">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="name" className="input-label">Congregation Name</label>
                  <div className="input-wrapper">
                    <Building className="input-icon" size={20} />
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Enter congregation name"
                      className="input-field with-icon"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="pin_code" className="input-label">PIN Code</label>
                  <div className="input-wrapper">
                    <Hash className="input-icon" size={20} />
                    <input
                      type="text"
                      id="pin_code"
                      name="pin_code"
                      value={formData.pin_code}
                      onChange={handleChange}
                      required
                      placeholder="Enter 3-10 digit PIN"
                      inputMode="numeric"
                      className="input-field with-icon font-mono"
                    />
                  </div>
                  <div className="input-hint">This PIN will be used by congregation members to access the app</div>
                </div>

                <div className="form-group">
                  <label htmlFor="contact_email" className="input-label">Contact Email</label>
                  <div className="input-wrapper">
                    <Mail className="input-icon" size={20} />
                    <input
                      type="email"
                      id="contact_email"
                      name="contact_email"
                      value={formData.contact_email}
                      onChange={handleChange}
                      required
                      placeholder="Enter contact email"
                      className="input-field with-icon"
                    />
                  </div>
                  <div className="input-hint">We'll notify you at this email when your request is approved</div>
                </div>

                {error && (
                  <div className="error-alert">
                    <AlertCircle size={18} className="mr-2" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !formData.name || !formData.pin_code || !formData.contact_email}
                  className="btn btn-primary w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Request
                      <ArrowRight size={18} className="ml-2" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="footer-content">
          <a href="/setup-database" className="footer-link">Database Setup</a>
          <span className="divider">•</span>
          <span className="copyright">© 2024 Not At Home</span>
        </div>
      </footer>

      <style jsx>{`
        .page-wrapper {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: var(--color-bg-body);
          color: var(--color-text-main);
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: var(--space-8) var(--space-6);
          width: 100%;
        }

        .content-container {
          width: 100%;
          max-width: 600px;
        }

        .header {
          margin-bottom: var(--space-8);
          text-align: left;
          width: 100%;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          margin-bottom: var(--space-6);
          color: var(--color-text-secondary);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          transition: color 0.2s;
        }

        .back-link:hover {
          color: var(--color-primary);
        }

        .title {
          font-size: 2.25rem;
          font-weight: 800;
          color: var(--color-text-main);
          margin: 0 0 var(--space-2) 0;
          line-height: 1.2;
          letter-spacing: -0.025em;
        }

        .description {
          color: var(--color-text-secondary);
          font-size: 1.125rem;
          margin: 0;
          line-height: 1.5;
        }

        .card {
          background-color: var(--color-bg-card);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--color-border);
          overflow: hidden;
        }

        .form-card {
          padding: var(--space-8);
        }

        .form-group {
          margin-bottom: var(--space-6);
        }

        .input-label {
          display: block;
          font-weight: 600;
          margin-bottom: var(--space-2);
          color: var(--color-text-main);
          font-size: 0.95rem;
        }

        .input-wrapper {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: var(--space-3);
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-text-tertiary);
          pointer-events: none;
        }

        .input-field {
          width: 100%;
          padding: var(--space-3);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          font-size: 1rem;
          transition: all 0.2s;
          background: var(--color-bg-input);
          color: var(--color-text-main);
        }

        .input-field.with-icon {
          padding-left: var(--space-10);
        }

        .input-field:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 4px var(--color-primary-light);
          background: var(--color-bg-card);
        }

        .input-hint {
          margin-top: var(--space-2);
          font-size: 0.875rem;
          color: var(--color-text-tertiary);
          line-height: 1.5;
        }
        
        .font-mono {
          font-family: monospace;
          letter-spacing: 0.05em;
        }

        .error-alert {
          color: var(--color-error);
          font-size: 0.875rem;
          margin-bottom: var(--space-6);
          padding: var(--space-3);
          background-color: var(--color-error-bg);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius-lg);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          font-size: 1rem;
        }

        .btn-primary {
          background-color: var(--color-primary);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: var(--color-primary-hover);
          transform: translateY(-1px);
        }

        .btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .w-full { width: 100%; }

        .success-card {
          text-align: center;
          padding: var(--space-10) var(--space-8);
        }

        .success-icon-wrapper {
          width: 64px;
          height: 64px;
          background-color: var(--color-success-bg);
          color: var(--color-success);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto var(--space-6);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .success-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 var(--space-2) 0;
          color: var(--color-text-main);
        }

        .success-message {
          color: var(--color-text-secondary);
          font-size: 1.125rem;
          margin: 0 0 var(--space-8) 0;
          line-height: 1.5;
        }

        .footer {
          padding: var(--space-8);
          text-align: center;
          font-size: 0.875rem;
          color: var(--color-text-tertiary);
          margin-top: auto;
        }

        .footer-content {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: var(--space-3);
        }

        .footer-link {
          color: var(--color-primary);
          text-decoration: none;
          font-weight: 500;
        }

        .footer-link:hover {
          text-decoration: underline;
        }

        .divider {
          color: var(--color-border);
        }
        
        .mr-1 { margin-right: var(--space-1); }
        .mr-2 { margin-right: var(--space-2); }
        .ml-2 { margin-left: var(--space-2); }
        
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .main-content {
            padding: var(--space-4);
          }

          .form-card, .success-card {
            padding: var(--space-6);
          }

          .title {
            font-size: 1.75rem;
          }
        }
      `}</style>
    </div>
  );
} 
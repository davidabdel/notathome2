import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/config';

export default function ConfigureEmail() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user is logged in
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/login');
          return;
        }
        
        // Check if user is an admin
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id);
        
        if (rolesError) {
          console.error('Error fetching user roles:', rolesError);
          setError('Failed to verify admin status');
          setCheckingAuth(false);
          return;
        }
        
        const adminRole = userRoles?.find(role => role.role === 'admin');
        
        if (!adminRole) {
          setError('You do not have permission to access this page');
          setCheckingAuth(false);
          setTimeout(() => {
            router.push('/');
          }, 3000);
          return;
        }
        
        setIsAdmin(true);
        
        // Get the current site URL
        setSiteUrl(process.env.NEXT_PUBLIC_APP_URL || window.location.origin);
      } catch (err) {
        console.error('Error checking auth:', err);
        setError('Failed to verify authentication');
      } finally {
        setCheckingAuth(false);
      }
    };
    
    checkAuth();
  }, [router]);

  const handleConfigureEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/configure-supabase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ siteUrl }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to configure email templates');
      }
      
      setMessage('Email templates configured successfully');
    } catch (err: any) {
      console.error('Error configuring email templates:', err);
      setError(err.message || 'Failed to configure email templates');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="container">
        <div className="loading-spinner"></div>
        <p>Checking authentication...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container">
        <div className="error-message">{error}</div>
        <p>Redirecting to home page...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <Head>
        <title>Configure Email Templates - Not At Home</title>
        <meta name="description" content="Configure email templates for Not At Home" />
      </Head>
      
      <h1>Configure Email Templates</h1>
      
      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleConfigureEmail} className="config-form">
        <div className="form-group">
          <label htmlFor="siteUrl">Site URL</label>
          <input
            type="text"
            id="siteUrl"
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            placeholder="https://yourdomain.com"
            required
          />
          <p className="form-help">
            This URL will be used in email templates for links
          </p>
        </div>
        
        <button 
          type="submit" 
          className="submit-button"
          disabled={loading}
        >
          {loading ? 'Configuring...' : 'Configure Email Templates'}
        </button>
      </form>
      
      <div className="info-section">
        <h2>Email Template Preview</h2>
        <div className="template-preview">
          <h3>Password Reset Email</h3>
          <div className="email-preview">
            <h2>Reset Your Password</h2>
            <p>Hello,</p>
            <p>Someone has requested a password reset for your Not At Home account.</p>
            <p>If this was you, please click the button below to reset your password:</p>
            <a href="#" style={{display: 'inline-block', backgroundColor: '#4f46e5', color: 'white', padding: '10px 20px', textDecoration: 'none', borderRadius: '5px', margin: '20px 0'}}>Reset Password</a>
            <p>If you didn't request this change, you can safely ignore this email.</p>
            <p>This link will expire in 24 hours.</p>
            <p>Thank you,<br/>The Not At Home Team</p>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        h1 {
          font-size: 2rem;
          margin-bottom: 2rem;
          color: #333;
        }
        
        .success-message {
          background-color: #d1fae5;
          color: #065f46;
          padding: 1rem;
          border-radius: 0.375rem;
          margin-bottom: 1.5rem;
        }
        
        .error-message {
          background-color: #fee2e2;
          color: #b91c1c;
          padding: 1rem;
          border-radius: 0.375rem;
          margin-bottom: 1.5rem;
        }
        
        .config-form {
          background-color: #f9fafb;
          padding: 1.5rem;
          border-radius: 0.5rem;
          margin-bottom: 2rem;
        }
        
        .form-group {
          margin-bottom: 1.5rem;
        }
        
        label {
          display: block;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }
        
        input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 1rem;
        }
        
        .form-help {
          font-size: 0.875rem;
          color: #6b7280;
          margin-top: 0.5rem;
        }
        
        .submit-button {
          background-color: #4f46e5;
          color: white;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 0.375rem;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.15s;
        }
        
        .submit-button:hover {
          background-color: #4338ca;
        }
        
        .submit-button:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }
        
        .info-section {
          margin-top: 3rem;
        }
        
        h2 {
          font-size: 1.5rem;
          margin-bottom: 1rem;
          color: #333;
        }
        
        .template-preview {
          background-color: #f9fafb;
          padding: 1.5rem;
          border-radius: 0.5rem;
        }
        
        h3 {
          font-size: 1.25rem;
          margin-bottom: 1rem;
          color: #333;
        }
        
        .email-preview {
          background-color: white;
          padding: 1.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
        }
        
        .loading-spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #4f46e5;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
} 
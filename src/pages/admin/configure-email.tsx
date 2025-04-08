import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/config';

interface EmailConfig {
  email_host: string;
  email_port: string;
  email_user: string;
  email_pass: string;
  email_from: string;
  email_secure: boolean;
  admin_email: string;
}

export default function ConfigureEmail() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [creatingTable, setCreatingTable] = useState(false);
  
  // Email configuration state
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    email_host: '',
    email_port: '',
    email_user: '',
    email_pass: '',
    email_from: '',
    email_secure: false,
    admin_email: ''
  });

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
        
        // Fetch email configuration
        fetchEmailConfig();
      } catch (err) {
        console.error('Error checking auth:', err);
        setError('Failed to verify authentication');
      } finally {
        setCheckingAuth(false);
      }
    };
    
    checkAuth();
  }, [router]);
  
  const fetchEmailConfig = async () => {
    try {
      const response = await fetch('/api/admin/get-email-config');
      const data = await response.json();
      
      if (response.ok && data.success) {
        setEmailConfig(data.data);
      } else {
        console.error('Error fetching email config:', data.error);
      }
    } catch (err) {
      console.error('Error fetching email config:', err);
    }
  };

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
  
  const handleSaveEmailConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      // First create table if needed
      if (!creatingTable) {
        setCreatingTable(true);
        try {
          await fetch('/api/admin/create-system-settings-table', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          });
        } catch (tableErr) {
          console.error('Error creating system settings table:', tableErr);
          // Continue anyway, as the table might already exist
        }
      }
      
      // Save email config
      const response = await fetch('/api/admin/save-email-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailConfig),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save email configuration');
      }
      
      setMessage('Email configuration saved successfully');
    } catch (err: any) {
      console.error('Error saving email config:', err);
      setError(err.message || 'Failed to save email configuration');
    } finally {
      setLoading(false);
    }
  };
  
  const handleEmailConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    setEmailConfig({
      ...emailConfig,
      [name]: type === 'checkbox' ? checked : value
    });
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
        <title>Configure Email Settings - Not At Home</title>
        <meta name="description" content="Configure email settings for Not At Home" />
      </Head>
      
      <h1>Configure Email Settings</h1>
      
      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}
      
      <div className="settings-container">
        <div className="settings-section">
          <h2>Email Templates</h2>
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
        </div>
        
        <div className="settings-section">
          <h2>Email Notifications</h2>
          <form onSubmit={handleSaveEmailConfig} className="config-form">
            <div className="form-group">
              <label htmlFor="email_host">SMTP Host</label>
              <input
                type="text"
                id="email_host"
                name="email_host"
                value={emailConfig.email_host}
                onChange={handleEmailConfigChange}
                placeholder="smtp.example.com"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email_port">SMTP Port</label>
              <input
                type="text"
                id="email_port"
                name="email_port"
                value={emailConfig.email_port}
                onChange={handleEmailConfigChange}
                placeholder="587"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email_user">SMTP Username</label>
              <input
                type="text"
                id="email_user"
                name="email_user"
                value={emailConfig.email_user}
                onChange={handleEmailConfigChange}
                placeholder="user@example.com"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email_pass">SMTP Password</label>
              <input
                type="password"
                id="email_pass"
                name="email_pass"
                value={emailConfig.email_pass}
                onChange={handleEmailConfigChange}
                placeholder={emailConfig.email_pass ? '••••••••' : 'Enter password'}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email_from">From Email</label>
              <input
                type="email"
                id="email_from"
                name="email_from"
                value={emailConfig.email_from}
                onChange={handleEmailConfigChange}
                placeholder="noreply@example.com"
              />
              <p className="form-help">
                This will be the sender's email address. If left blank, SMTP Username will be used.
              </p>
            </div>
            
            <div className="form-group checkbox-group">
              <input
                type="checkbox"
                id="email_secure"
                name="email_secure"
                checked={emailConfig.email_secure}
                onChange={handleEmailConfigChange}
              />
              <label htmlFor="email_secure">Use Secure Connection (TLS/SSL)</label>
            </div>
            
            <div className="form-group">
              <label htmlFor="admin_email">Admin Notification Email</label>
              <input
                type="email"
                id="admin_email"
                name="admin_email"
                value={emailConfig.admin_email}
                onChange={handleEmailConfigChange}
                placeholder="admin@example.com"
                required
              />
              <p className="form-help">
                This email will receive notifications for new congregation requests and other important alerts.
              </p>
            </div>
            
            <button 
              type="submit" 
              className="submit-button"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Email Settings'}
            </button>
          </form>
        </div>
      </div>
      
      <div className="info-section">
        <h2>Email Notification Preview</h2>
        <div className="template-preview">
          <h3>New Congregation Request</h3>
          <div className="email-preview">
            <h2 style={{color: '#2563eb'}}>New Congregation Request</h2>
            <p>A new congregation has requested access to Not At Home:</p>
            <div style={{backgroundColor: '#f3f4f6', padding: '16px', borderRadius: '8px', margin: '20px 0'}}>
              <p><strong>Congregation Name:</strong> Example Congregation</p>
              <p><strong>Contact Email:</strong> contact@example.com</p>
              <p><strong>PIN Code:</strong> 123456</p>
            </div>
            <p>Please review this request in the <a href="#" style={{color: '#2563eb', textDecoration: 'underline'}}>admin dashboard</a>.</p>
            <p style={{marginTop: '30px', fontSize: '14px', color: '#6b7280'}}>
              This is an automated email from Not At Home.
            </p>
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
        
        h2 {
          font-size: 1.5rem;
          margin-bottom: 1rem;
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
        
        .settings-container {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
          margin-bottom: 2rem;
        }
        
        .settings-section {
          background-color: white;
          border-radius: 0.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 1.5rem;
        }
        
        .config-form {
          background-color: #f9fafb;
          padding: 1.5rem;
          border-radius: 0.5rem;
        }
        
        .form-group {
          margin-bottom: 1.5rem;
        }
        
        .checkbox-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .checkbox-group input {
          width: auto;
        }
        
        .checkbox-group label {
          margin-bottom: 0;
        }
        
        label {
          display: block;
          font-weight: 500;
          margin-bottom: 0.5rem;
          color: #111827;
        }
        
        input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 1rem;
          background-color: white;
        }
        
        input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
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
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.15s;
        }
        
        .submit-button:hover:not(:disabled) {
          background-color: #4338ca;
        }
        
        .submit-button:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }
        
        .info-section {
          margin-top: 3rem;
        }
        
        .template-preview {
          background-color: white;
          padding: 1.5rem;
          border-radius: 0.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
        
        @media (min-width: 768px) {
          .settings-container {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}
      </style>
    </div>
  );
} 
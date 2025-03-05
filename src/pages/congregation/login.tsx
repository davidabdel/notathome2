import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/config';
import { FaEnvelope, FaLock, FaArrowRight } from 'react-icons/fa';

export default function CongregationAdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [tempPasswordLoading, setTempPasswordLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Check if the user has admin role
          const { data: userRoles, error: rolesError } = await supabase
            .from('user_roles')
            .select('congregation_id, role')
            .eq('user_id', session.user.id);
          
          if (!rolesError && userRoles && userRoles.length > 0) {
            const isAdmin = userRoles.some(role => 
              role.role === 'congregation_admin' || role.role === 'admin'
            );
            
            if (isAdmin) {
              // User is already logged in and is an admin, redirect to dashboard
              router.push('/congregation');
              return;
            }
          }
          
          // User is logged in but not an admin, sign them out
          await supabase.auth.signOut();
        }
      } catch (err) {
        console.error('Error checking session:', err);
      } finally {
        setCheckingSession(false);
      }
    };
    
    checkExistingSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }
    
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      // Sign in with email and password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      
      if (signInError) {
        throw signInError;
      }
      
      // Check if the user has admin role
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Failed to create session');
      }
      
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('congregation_id, role')
        .eq('user_id', session.user.id);
      
      if (rolesError) {
        throw rolesError;
      }
      
      const isAdmin = userRoles && userRoles.some(role => 
        role.role === 'congregation_admin' || role.role === 'admin'
      );
      
      if (!isAdmin) {
        // Sign out if not an admin
        await supabase.auth.signOut();
        throw new Error('You do not have admin privileges');
      }
      
      // Redirect to congregation dashboard
      router.push('/congregation');
    } catch (err: any) {
      console.error('Error signing in:', err);
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestTempPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email address to reset your password');
      return;
    }
    
    setTempPasswordLoading(true);
    setError('');
    setMessage('');
    
    try {
      // Request password reset
      const response = await fetch('/api/send-temp-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }
      
      // For development, show the temp password directly
      if (data.tempPassword) {
        setTempPassword(data.tempPassword);
      }
      
      setMessage('A password reset link has been sent to your email');
    } catch (err: any) {
      console.error('Error requesting password reset:', err);
      setError(err.message || 'Failed to reset password');
    } finally {
      setTempPasswordLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="login-container">
        <div className="loading-spinner"></div>
        <p>Checking authentication status...</p>
      </div>
    );
  }

  return (
    <div className="login-container">
      <Head>
        <title>Congregation Admin Login - Not At Home</title>
        <meta name="description" content="Login to manage your congregation's territory maps" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      
      <div className="login-card">
        <div className="login-header">
          <h1>Congregation Admin</h1>
          <p className="login-subtitle">Login to manage territory maps</p>
        </div>
        
        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}
        
        {tempPassword && (
          <div className="temp-password-display">
            <p>Your temporary password:</p>
            <div className="password-box">{tempPassword}</div>
            <p className="password-note">This is only shown in development mode</p>
          </div>
        )}
        
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-with-icon">
              <FaEnvelope className="input-icon" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={loading || tempPasswordLoading}
                required
              />
            </div>
            <p className="form-help">
              Enter the email address you used to set up your congregation
            </p>
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-with-icon">
              <FaLock className="input-icon" />
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loading || tempPasswordLoading}
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            className="login-button"
            disabled={loading || tempPasswordLoading}
          >
            {loading ? 'Logging in...' : 'Login'}
            {!loading && <FaArrowRight className="button-icon" />}
          </button>
          
          <button 
            type="button" 
            className="temp-password-button"
            onClick={handleRequestTempPassword}
            disabled={loading || tempPasswordLoading}
          >
            {tempPasswordLoading ? 'Sending...' : 'Forgot Password'}
          </button>
        </form>
        
        <div className="login-footer">
          <p>Not a congregation admin?</p>
          <a href="/" className="login-link">Return to Home</a>
        </div>
      </div>
      
      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          background-color: #f9fafb;
        }
        
        .login-card {
          width: 100%;
          max-width: 450px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          padding: 2rem;
        }
        
        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        
        .login-header h1 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 0.5rem;
        }
        
        .login-subtitle {
          color: #6b7280;
          font-size: 1rem;
        }
        
        .login-form {
          margin-bottom: 2rem;
        }
        
        .form-group {
          margin-bottom: 1.5rem;
        }
        
        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.5rem;
        }
        
        .input-with-icon {
          position: relative;
        }
        
        .input-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
        }
        
        input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 1rem;
          transition: border-color 0.15s ease;
        }
        
        input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        input:disabled {
          background-color: #f3f4f6;
          cursor: not-allowed;
        }
        
        .form-help {
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 0.5rem;
        }
        
        .login-button {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.75rem 1rem;
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        
        .login-button:hover {
          background-color: #2563eb;
        }
        
        .login-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .temp-password-button {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.75rem 1rem;
          background-color: transparent;
          color: #6b7280;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          margin-top: 1rem;
          transition: all 0.15s ease;
        }
        
        .temp-password-button:hover {
          background-color: #f3f4f6;
          color: #111827;
        }
        
        .temp-password-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .button-icon {
          margin-left: 0.5rem;
        }
        
        .login-footer {
          text-align: center;
          font-size: 0.875rem;
          color: #6b7280;
        }
        
        .login-link {
          color: #3b82f6;
          text-decoration: none;
          font-weight: 500;
          margin-left: 0.5rem;
        }
        
        .login-link:hover {
          text-decoration: underline;
        }
        
        .success-message {
          background-color: #d1fae5;
          color: #065f46;
          padding: 0.75rem 1rem;
          border-radius: 6px;
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
        }
        
        .error-message {
          background-color: #fee2e2;
          color: #b91c1c;
          padding: 0.75rem 1rem;
          border-radius: 6px;
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
        }
        
        .loading-spinner {
          border: 3px solid rgba(0, 0, 0, 0.1);
          border-radius: 50%;
          border-top: 3px solid #3b82f6;
          width: 24px;
          height: 24px;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }
        
        .temp-password-display {
          background-color: #f3f4f6;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1.5rem;
          text-align: center;
        }
        
        .password-box {
          background-color: #e5e7eb;
          padding: 0.75rem;
          border-radius: 4px;
          font-family: monospace;
          font-size: 1.25rem;
          margin: 0.5rem 0;
          letter-spacing: 1px;
        }
        
        .password-note {
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 0.5rem;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
} 
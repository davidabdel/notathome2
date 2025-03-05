import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/config';
import { FaLock, FaArrowRight } from 'react-icons/fa';

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // If no session or no access token in URL, redirect to login
        if (!session && !window.location.hash.includes('access_token')) {
          router.push('/congregation/login');
          return;
        }
        
        // If we have a hash with access_token, Supabase will handle it automatically
        // We just need to wait for the session to be established
      } catch (err) {
        console.error('Error checking session:', err);
      } finally {
        setCheckingSession(false);
      }
    };
    
    checkSession();
  }, [router]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Please enter a new password');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });
      
      if (updateError) {
        throw updateError;
      }
      
      setMessage('Password has been reset successfully. You will be redirected to login...');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/congregation/login');
      }, 3000);
    } catch (err: any) {
      console.error('Error resetting password:', err);
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="reset-container">
        <div className="loading-spinner"></div>
        <p>Checking authentication status...</p>
      </div>
    );
  }

  return (
    <div className="reset-container">
      <Head>
        <title>Reset Password - Not At Home</title>
        <meta name="description" content="Reset your password for Not At Home" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      
      <div className="reset-card">
        <div className="reset-header">
          <h1>Reset Password</h1>
          <p className="reset-subtitle">Enter your new password</p>
        </div>
        
        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleResetPassword} className="reset-form">
          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <div className="input-with-icon">
              <FaLock className="input-icon" />
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                disabled={loading}
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-with-icon">
              <FaLock className="input-icon" />
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={loading}
                required
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            className="reset-button"
            disabled={loading}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
            {!loading && <FaArrowRight className="button-icon" />}
          </button>
        </form>
        
        <div className="reset-footer">
          <a href="/congregation/login" className="reset-link">Return to Login</a>
        </div>
      </div>
      
      <style jsx>{`
        .reset-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          background-color: #f9fafb;
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        }
        
        .reset-card {
          width: 100%;
          max-width: 480px;
          background-color: white;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          padding: 2rem;
        }
        
        .reset-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        
        .reset-header h1 {
          font-size: 1.875rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 0.5rem;
        }
        
        .reset-subtitle {
          color: #6b7280;
          font-size: 1rem;
        }
        
        .success-message {
          background-color: #d1fae5;
          color: #065f46;
          padding: 1rem;
          border-radius: 0.375rem;
          margin-bottom: 1.5rem;
          text-align: center;
        }
        
        .error-message {
          background-color: #fee2e2;
          color: #b91c1c;
          padding: 1rem;
          border-radius: 0.375rem;
          margin-bottom: 1.5rem;
          text-align: center;
        }
        
        .reset-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .form-group label {
          font-weight: 500;
          color: #374151;
        }
        
        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }
        
        .input-icon {
          position: absolute;
          left: 1rem;
          color: #9ca3af;
        }
        
        .form-group input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 1rem;
          transition: border-color 0.15s ease-in-out;
        }
        
        .form-group input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        
        .reset-button {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background-color: #2563eb;
          color: white;
          border: none;
          border-radius: 0.375rem;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.15s ease-in-out;
        }
        
        .reset-button:hover {
          background-color: #1d4ed8;
        }
        
        .reset-button:disabled {
          background-color: #93c5fd;
          cursor: not-allowed;
        }
        
        .button-icon {
          font-size: 0.875rem;
        }
        
        .reset-footer {
          margin-top: 2rem;
          text-align: center;
        }
        
        .reset-link {
          color: #2563eb;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.15s ease-in-out;
        }
        
        .reset-link:hover {
          color: #1d4ed8;
          text-decoration: underline;
        }
        
        .loading-spinner {
          border: 4px solid rgba(0, 0, 0, 0.1);
          border-left-color: #2563eb;
          border-radius: 50%;
          width: 2rem;
          height: 2rem;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }
        
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
} 
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/config';
import { Mail, Lock, ArrowRight } from 'lucide-react';

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
      const response = await fetch('/api/reset-password', {
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
      <div className="loading-container">
        <div className="spinner"></div>
        <p className="loading-text">Checking authentication status...</p>
        <style jsx>{`
          .loading-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background-color: var(--color-bg-body);
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(37, 99, 235, 0.1);
            border-radius: 50%;
            border-top-color: var(--color-primary);
            animation: spin 1s linear infinite;
            margin-bottom: var(--space-4);
          }
          .loading-text {
            font-weight: 600;
            color: var(--color-text-main);
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <Head>
        <title>Congregation Admin Login - Not At Home</title>
        <meta name="description" content="Login to manage your congregation's territory maps" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">Congregation Admin</h1>
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
          <div className="input-group">
            <label htmlFor="email" className="input-label">Email Address</label>
            <div className="input-with-icon">
              <Mail className="input-icon" size={18} />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={loading || tempPasswordLoading}
                required
                className="input-field pl-10"
              />
            </div>
            <p className="form-help">
              Enter the email address you used to set up your congregation
            </p>
          </div>

          <div className="input-group">
            <label htmlFor="password" className="input-label">Password</label>
            <div className="input-with-icon">
              <Lock className="input-icon" size={18} />
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loading || tempPasswordLoading}
                className="input-field pl-10"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full mb-4"
            disabled={loading || tempPasswordLoading}
          >
            {loading ? 'Logging in...' : 'Login'}
            {!loading && <ArrowRight className="ml-2" size={18} />}
          </button>

          <button
            type="button"
            className="btn btn-ghost w-full"
            onClick={handleRequestTempPassword}
            disabled={loading || tempPasswordLoading}
          >
            {tempPasswordLoading ? 'Sending reset link...' : 'Forgot Password?'}
          </button>
        </form>

        <div className="login-footer">
          <p>Not a congregation admin?</p>
          <a href="/" className="login-link">Return to Home</a>
        </div>
      </div>

      <style jsx>{`
        .page-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-4);
          background-color: var(--color-bg-body);
          background-image: radial-gradient(circle at 50% 0%, #eff6ff 0%, transparent 70%);
        }
        
        .login-card {
          width: 100%;
          max-width: 450px;
          background-color: var(--color-bg-card);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-lg);
          padding: var(--space-8);
          border: 1px solid var(--color-border);
        }
        
        .login-header {
          text-align: center;
          margin-bottom: var(--space-8);
        }
        
        .login-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--color-text-main);
          margin: 0 0 var(--space-2) 0;
          letter-spacing: -0.025em;
        }
        
        .login-subtitle {
          color: var(--color-text-secondary);
          font-size: 1rem;
          margin: 0;
        }
        
        .input-with-icon {
          position: relative;
        }
        
        .input-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-text-tertiary);
          pointer-events: none;
        }
        
        /* Custom padding for icon inputs */
        .pl-10 {
          padding-left: 2.75rem !important;
        }
        
        .form-help {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          margin-top: var(--space-2);
        }
        
        .mb-4 { margin-bottom: var(--space-4); }
        .ml-2 { margin-left: var(--space-2); }
        
        .login-footer {
          text-align: center;
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          margin-top: var(--space-6);
          padding-top: var(--space-6);
          border-top: 1px solid var(--color-border);
        }
        
        .login-footer p {
          margin: 0 0 var(--space-2) 0;
        }
        
        .login-link {
          color: var(--color-primary);
          text-decoration: none;
          font-weight: 600;
        }
        
        .login-link:hover {
          text-decoration: underline;
          color: var(--color-primary-hover);
        }
        
        .success-message {
          background-color: var(--color-success-bg);
          color: var(--color-success);
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-6);
          font-size: 0.875rem;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        
        .error-message {
          background-color: var(--color-error-bg);
          color: var(--color-error);
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-6);
          font-size: 0.875rem;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        
        .temp-password-display {
          background-color: var(--color-bg-input);
          padding: var(--space-4);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-6);
          text-align: center;
          border: 1px solid var(--color-border);
        }
        
        .password-box {
          background-color: var(--color-bg-card);
          padding: var(--space-3);
          border-radius: var(--radius-sm);
          font-family: monospace;
          font-size: 1.25rem;
          margin: var(--space-2) 0;
          letter-spacing: 1px;
          border: 1px solid var(--color-border);
          color: var(--color-text-main);
        }
        
        .password-note {
          font-size: 0.75rem;
          color: var(--color-text-tertiary);
          margin-top: var(--space-2);
        }
      `}</style>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../../../supabase/config';
import Link from 'next/link';
import { FaLock, FaArrowLeft } from 'react-icons/fa';

export default function SetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  
  // Check for hash in URL which contains the access token
  useEffect(() => {
    // Get hash from URL
    const hash = window.location.hash;
    
    if (hash) {
      try {
        // Try to parse the hash to extract error and access_token 
        const hashParams = new URLSearchParams(hash.substring(1));
        
        // Check if there's an error
        const errorParam = hashParams.get('error');
        if (errorParam) {
          setError(`Error: ${errorParam}`);
          return;
        }
        
        // Extract and store the access_token for later use
        const token = hashParams.get('access_token');
        if (token) {
          // Set the session with the token
          const setSession = async () => {
            await supabase.auth.setSession({
              access_token: token,
              refresh_token: '',
            });
            
            // Try to get the user's email
            const { data, error } = await supabase.auth.getUser();
            if (!error && data?.user) {
              setEmail(data.user.email || '');
            }
          };
          
          setSession();
        }
      } catch (err) {
        console.error('Error parsing hash params:', err);
        setError('Invalid invitation link. Please contact your administrator.');
      }
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset messages
    setError('');
    setMessage('');
    
    // Validate passwords
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    setLoading(true);
    
    try {
      // Validate that we have a session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session. Please use a valid invitation link.');
      }
      
      // Update the password
      const { error } = await supabase.auth.updateUser({ 
        password 
      });
      
      if (error) {
        throw error;
      }
      
      // Password updated successfully
      setMessage('Password set successfully! You will be redirected to login.');
      
      // Redirect to login page after a short delay
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      console.error('Error setting password:', err);
      setError(err instanceof Error ? err.message : 'Failed to set password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <Head>
        <title>Set Your Password - Not At Home</title>
        <meta name="description" content="Set your password for Not At Home" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
        <meta name="theme-color" content="#1e293b" />
      </Head>

      <div className="auth-container">
        <div className="auth-card">
          <div className="app-logo">
            <FaLock />
            <h1>Set Your Password</h1>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {message && (
            <div className="success-message">
              {message}
            </div>
          )}

          <div className="welcome-message">
            {email ? (
              <p>Hi {email}, please set a password for your account.</p>
            ) : (
              <p>Welcome to Not At Home. Please set a password for your account.</p>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="password">New Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter new password"
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm new password"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading ? 'Setting Password...' : 'Set Password'}
            </button>
          </form>

          <div className="auth-links">
            <Link href="/login" className="back-link">
              <FaArrowLeft /> Back to Login
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 1rem;
          background-color: #1e293b;
          box-sizing: border-box;
        }
        .auth-container {
          width: 100%;
          max-width: 400px;
        }
        .auth-card {
          background-color: white;
          border-radius: 8px;
          padding: 2rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .app-logo {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 1.5rem;
          color: #4f46e5;
        }
        .app-logo svg {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }
        .app-logo h1 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0;
          color: #1e293b;
        }
        .welcome-message {
          text-align: center;
          margin-bottom: 1.5rem;
          color: #4b5563;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #374151;
        }
        .form-group input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 1rem;
        }
        .submit-button {
          width: 100%;
          padding: 0.75rem;
          background-color: #4f46e5;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          margin-top: 1rem;
        }
        .submit-button:hover {
          background-color: #4338ca;
        }
        .submit-button:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }
        .auth-links {
          margin-top: 1.5rem;
          display: flex;
          justify-content: center;
        }
        .back-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #4f46e5;
          text-decoration: none;
          font-weight: 500;
        }
        .back-link:hover {
          text-decoration: underline;
        }
        .error-message {
          background-color: #fee2e2;
          color: #b91c1c;
          padding: 0.75rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }
        .success-message {
          background-color: #dcfce7;
          color: #166534;
          padding: 0.75rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
} 
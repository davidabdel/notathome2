import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/config';
import { FaEnvelope, FaPlaceOfWorship, FaArrowRight } from 'react-icons/fa';

export default function CongregationAdminSignup() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [congregationName, setCongregationName] = useState('');
  const [congregations, setCongregations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCongregations, setLoadingCongregations] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
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
    
    const fetchCongregations = async () => {
      try {
        // Call the API to get active congregations
        const response = await fetch('/api/direct-insert');
        await response.json(); // Ensure Admin Congregation exists
        
        // Now fetch all active congregations
        const { data, error } = await supabase
          .from('congregations')
          .select('id, name')
          .eq('status', 'active')
          .order('name');
        
        if (error) {
          throw error;
        }
        
        setCongregations(data || []);
      } catch (err) {
        console.error('Error fetching congregations:', err);
        setError('Failed to load congregations');
      } finally {
        setLoadingCongregations(false);
      }
    };
    
    checkExistingSession();
    fetchCongregations();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    
    if (!congregationName) {
      setError('Please select your congregation');
      return;
    }
    
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      // First sign up the user with email
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
        options: {
          emailRedirectTo: `${window.location.origin}/congregation`,
        },
      });
      
      if (signUpError) {
        throw signUpError;
      }
      
      if (!signUpData.user) {
        throw new Error('Failed to create user');
      }
      
      // Now assign the user as a congregation admin
      const response = await fetch('/api/assign-congregation-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          congregationName,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to assign admin role');
      }
      
      setMessage('Check your email to confirm your account and access your congregation dashboard!');
      setEmail('');
      setCongregationName('');
    } catch (err: any) {
      console.error('Error signing up:', err);
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="signup-container">
        <div className="loading-spinner"></div>
        <p>Checking authentication status...</p>
      </div>
    );
  }

  return (
    <div className="signup-container">
      <Head>
        <title>Congregation Admin Signup - Not At Home</title>
        <meta name="description" content="Sign up to manage your congregation's territory maps" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      
      <div className="signup-card">
        <div className="signup-header">
          <h1>Congregation Admin Signup</h1>
          <p className="signup-subtitle">Create an account to manage territory maps</p>
        </div>
        
        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="signup-form">
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
                disabled={loading}
                required
              />
            </div>
            <p className="form-help">
              We'll send a confirmation link to this email
            </p>
          </div>
          
          <div className="form-group">
            <label htmlFor="congregation">Congregation</label>
            <div className="input-with-icon">
              <FaPlaceOfWorship className="input-icon" />
              <select
                id="congregation"
                value={congregationName}
                onChange={(e) => setCongregationName(e.target.value)}
                disabled={loading || loadingCongregations}
                required
              >
                <option value="">Select your congregation</option>
                {congregations.map(cong => (
                  <option key={cong.id} value={cong.name}>
                    {cong.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="form-help">
              Select the congregation you want to manage
            </p>
          </div>
          
          <button 
            type="submit" 
            className="signup-button"
            disabled={loading || loadingCongregations}
          >
            {loading ? 'Signing up...' : 'Sign Up'}
            {!loading && <FaArrowRight className="button-icon" />}
          </button>
        </form>
        
        <div className="signup-footer">
          <p>Already have an account?</p>
          <a href="/congregation/login" className="signup-link">Login</a>
        </div>
      </div>
      
      <style jsx>{`
        .signup-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          background-color: #f9fafb;
        }
        
        .signup-card {
          width: 100%;
          max-width: 450px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          padding: 2rem;
        }
        
        .signup-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        
        .signup-header h1 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 0.5rem;
        }
        
        .signup-subtitle {
          color: #6b7280;
          font-size: 1rem;
        }
        
        .signup-form {
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
        
        input, select {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 1rem;
          transition: border-color 0.15s ease;
        }
        
        input:focus, select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        input:disabled, select:disabled {
          background-color: #f3f4f6;
          cursor: not-allowed;
        }
        
        .form-help {
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 0.5rem;
        }
        
        .signup-button {
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
        
        .signup-button:hover {
          background-color: #2563eb;
        }
        
        .signup-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .button-icon {
          margin-left: 0.5rem;
        }
        
        .signup-footer {
          text-align: center;
          font-size: 0.875rem;
          color: #6b7280;
        }
        
        .signup-link {
          color: #3b82f6;
          text-decoration: none;
          font-weight: 500;
          margin-left: 0.5rem;
        }
        
        .signup-link:hover {
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
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
} 
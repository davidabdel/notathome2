import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../supabase/config';

export default function RoleSelection() {
  const router = useRouter();
  const [congregationName, setCongregationName] = useState('');
  const [congregationLocation, setCongregationLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        
        // Check if user is logged in
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // Redirect to login if not logged in
          router.push('/');
          return;
        }
        
        // Get congregation info
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('congregation_id')
          .eq('user_id', session.user.id)
          .single();
        
        if (userRole) {
          const { data: congregation } = await supabase
            .from('congregations')
            .select('name, location')
            .eq('id', userRole.congregation_id)
            .single();
          
          if (congregation) {
            setCongregationName(congregation.name);
            setCongregationLocation(congregation.location || '');
          }
        }
      } catch (err) {
        console.error('Error checking auth status:', err);
        setError('Error loading congregation information');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);
  
  const handleRoleSelect = (role: 'group_overseer' | 'publisher') => {
    // Store the selected role in localStorage
    localStorage.setItem('userRole', role);
    
    // Redirect to the appropriate page based on role
    if (role === 'group_overseer') {
      router.push('/dashboard');
    } else {
      router.push('/join-session');
    }
  };
  
  const handleChangeCongregation = () => {
    // Sign out and redirect to login
    supabase.auth.signOut().then(() => {
      router.push('/');
    });
  };
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }
  
  return (
    <div className="container">
      <Head>
        <title>Select Role - Not At Home</title>
        <meta name="description" content="Select your role to continue" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <header className="header">
        <div className="congregation-info">
          <h2>{congregationName}</h2>
          {congregationLocation && <p>{congregationLocation}</p>}
        </div>
        <button onClick={handleChangeCongregation} className="change-congregation-btn">
          Change Congregation
        </button>
      </header>
      
      <main>
        <div className="content-container">
          <h1 className="title">Not at Home</h1>
          <p className="subtitle">Select your role to continue</p>
          
          <div className="role-buttons">
            <button 
              className="role-button overseer"
              onClick={() => handleRoleSelect('group_overseer')}
            >
              <span className="icon">👤</span>
              Group Overseer
            </button>
            
            <button 
              className="role-button publisher"
              onClick={() => handleRoleSelect('publisher')}
            >
              <span className="icon">💬</span>
              Publisher
            </button>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="privacy-disclaimer">
            <h3>Privacy Disclaimer</h3>
            <p>
              The use of this app and the data recorded within it is solely at
              the discretion of the user. As the app developer, we do not
              influence or control how the app is utilised and accept no
              responsibility for its usage or the data collected by users. It is
              the user's responsibility to ensure compliance with any
              applicable laws and regulations of the applicable country.
            </p>
          </div>
        </div>
      </main>
      
      <style jsx>{`
        .container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: #f9fafb;
          color: #111827;
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
          background-color: white;
        }
        
        .congregation-info {
          display: flex;
          flex-direction: column;
        }
        
        .congregation-info h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
        }
        
        .congregation-info p {
          margin: 0;
          color: #6b7280;
          font-size: 0.875rem;
        }
        
        .change-congregation-btn {
          background: none;
          border: none;
          color: #2563eb;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          padding: 0.5rem;
          transition: color 0.2s;
        }
        
        .change-congregation-btn:hover {
          color: #1d4ed8;
          text-decoration: underline;
        }
        
        main {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
        }
        
        .content-container {
          width: 100%;
          max-width: 640px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .title {
          margin: 0;
          font-size: 2.5rem;
          font-weight: 700;
          text-align: center;
          letter-spacing: -0.025em;
          margin-bottom: 0.5rem;
        }
        
        .subtitle {
          margin-top: 0;
          margin-bottom: 2.5rem;
          color: #6b7280;
          font-size: 1.125rem;
          text-align: center;
        }
        
        .role-buttons {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          width: 100%;
          max-width: 480px;
          margin-bottom: 2rem;
        }
        
        .role-button {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.25rem;
          border: none;
          border-radius: 0.5rem;
          font-size: 1.125rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .role-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .role-button.overseer {
          background-color: #d9f99d;
          color: #365314;
        }
        
        .role-button.overseer:hover {
          background-color: #bef264;
        }
        
        .role-button.publisher {
          background-color: #d9f99d;
          color: #365314;
        }
        
        .role-button.publisher:hover {
          background-color: #bef264;
        }
        
        .icon {
          margin-right: 0.75rem;
          font-size: 1.25rem;
        }
        
        .error-message {
          color: #ef4444;
          background-color: #fee2e2;
          padding: 0.75rem;
          border-radius: 0.375rem;
          margin-bottom: 1.5rem;
          width: 100%;
          max-width: 480px;
          text-align: center;
        }
        
        .privacy-disclaimer {
          background-color: #f3f4f6;
          padding: 1.5rem;
          border-radius: 0.5rem;
          margin-top: 2rem;
          width: 100%;
          max-width: 480px;
        }
        
        .privacy-disclaimer h3 {
          margin-top: 0;
          margin-bottom: 0.75rem;
          font-size: 1.125rem;
          font-weight: 600;
        }
        
        .privacy-disclaimer p {
          margin: 0;
          font-size: 0.875rem;
          color: #4b5563;
          line-height: 1.5;
        }
        
        .loading-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-color: #f9fafb;
        }
        
        .spinner {
          width: 2.5rem;
          height: 2.5rem;
          border: 3px solid rgba(0, 0, 0, 0.1);
          border-top-color: #2563eb;
          border-radius: 50%;
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
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import LoginForm from '../components/auth/LoginForm';
import { supabase } from '../../supabase/config';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCongregationAdmin, setIsCongregationAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in and has congregation admin role
    const checkUserStatus = async () => {
      try {
        setLoading(true);
        
        // Get the current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setIsLoggedIn(false);
          setLoading(false);
          return;
        }
        
        const userId = session.user.id;
        setIsLoggedIn(true);
        
        // Check if user has congregation_admin role
        const { data: congregationAdminRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'congregation_admin');
        
        setIsCongregationAdmin(!!congregationAdminRoles && congregationAdminRoles.length > 0);
        
        // Check if user has admin role
        const { data: adminRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'admin');
        
        setIsAdmin(!!adminRoles && adminRoles.length > 0);
        
        // Redirect to role selection page if user is logged in but not an admin
        if (!adminRoles || adminRoles.length === 0) {
          window.location.href = '/role-selection';
        }
      } catch (error) {
        console.error('Error checking user status:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkUserStatus();
    
    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setIsLoggedIn(true);
          checkUserStatus();
        } else if (event === 'SIGNED_OUT') {
          setIsLoggedIn(false);
          setIsCongregationAdmin(false);
          setIsAdmin(false);
        }
      }
    );
    
    // Clean up the listener
    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const handleLoginSuccess = () => {
    // Update login status when login is successful
    setIsLoggedIn(true);
    // Redirect to role selection page
    window.location.href = '/role-selection';
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setIsLoggedIn(false);
      setIsCongregationAdmin(false);
      setIsAdmin(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="container">
      <Head>
        <title>Not At Home - Missionary Tracking</title>
        <meta name="description" content="Track not-at-home locations during door-to-door outreach" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <div className="content-container">
          <div className="header">
            <h1 className="title">Not At Home</h1>
            <p className="description">
              Track locations during outreach activities
            </p>
          </div>

          {isLoggedIn ? (
            <div className="logged-in-container">
              <p className="welcome-message">Welcome! You are signed in.</p>
              <button onClick={handleSignOut} className="sign-out-button">
                Sign Out
              </button>
            </div>
          ) : (
            <div className="login-container">
              <LoginForm onSuccess={handleLoginSuccess} />
            </div>
          )}

          <div className="quick-actions">
            {isLoggedIn && isCongregationAdmin && (
              <Link href="/dashboard/sessions" className="action-button secondary">
                Manage Sessions
              </Link>
            )}
            
            {isLoggedIn && isAdmin && (
              <Link href="/admin" className="action-button admin">
                Admin Dashboard
              </Link>
            )}
          </div>

          <div className="info-container">
            {/* Removed "Don't have an account yet? Request access" text */}
          </div>
        </div>
        
        <div className="admin-login-container">
          <Link href="/congregation/login" className="admin-login-bottom">
            Congregation Admin Login
          </Link>
        </div>
      </main>

      <footer>
        <div className="footer-content">
          <span className="copyright">© 2025 UConnect (International) Pty Ltd t/as nhjw.org</span>
        </div>
      </footer>

      <style jsx>{`
        :root {
          --primary-color: #2563eb;
          --primary-hover: #1d4ed8;
          --secondary-color: #4b5563;
          --secondary-hover: #374151;
          --text-color: #111827;
          --text-secondary: #4b5563;
          --background-color: #f9fafb;
          --border-color: #e5e7eb;
          --link-color: #2563eb;
          --card-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          --spacing-xs: 0.5rem;
          --spacing-sm: 1rem;
          --spacing-md: 1.5rem;
          --spacing-lg: 2rem;
          --spacing-xl: 3rem;
          --font-size-sm: 0.875rem;
          --font-size-md: 1rem;
          --font-size-lg: 1.125rem;
          --font-size-xl: 1.5rem;
          --font-size-xxl: 2.5rem;
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
          justify-content: center;
          padding: var(--spacing-md);
          width: 100%;
        }

        .content-container {
          width: 100%;
          max-width: 480px;
        }

        .header {
          text-align: center;
          margin-bottom: var(--spacing-lg);
        }

        .title {
          margin: 0;
          font-size: var(--font-size-xxl);
          font-weight: 700;
          line-height: 1.2;
          color: var(--text-color);
          letter-spacing: -0.025em;
        }

        .description {
          margin-top: var(--spacing-xs);
          color: var(--text-secondary);
          font-size: var(--font-size-lg);
          font-weight: 400;
        }

        .login-container {
          margin-bottom: var(--spacing-md);
          background-color: white;
          border-radius: 12px;
          box-shadow: var(--card-shadow);
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .button-container {
          margin-top: var(--spacing-md);
          text-align: center;
        }
        
        .admin-login-link {
          display: inline-block;
          color: var(--link-color);
          font-weight: 500;
          text-decoration: none;
          padding: 0.5rem;
          transition: color 0.2s;
        }
        
        .admin-login-link:hover {
          text-decoration: underline;
          color: var(--primary-hover);
        }

        .quick-actions {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
          width: 100%;
          margin-bottom: var(--spacing-lg);
        }

        .action-button {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: var(--spacing-sm) var(--spacing-md);
          border-radius: 8px;
          font-size: var(--font-size-md);
          font-weight: 500;
          text-decoration: none;
          text-align: center;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .action-button.primary {
          background-color: var(--primary-color);
          color: white;
        }

        .action-button.primary:hover {
          background-color: var(--primary-hover);
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .action-button.secondary {
          background-color: var(--secondary-color);
          color: white;
        }

        .action-button.secondary:hover {
          background-color: var(--secondary-hover);
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .action-button.admin {
          background-color: #8b5cf6;
          color: white;
        }
        
        .action-button.admin:hover {
          background-color: #7c3aed;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .info-container {
          text-align: center;
          margin-top: var(--spacing-md);
        }

        .info-text {
          color: var(--text-secondary);
          font-size: var(--font-size-md);
        }

        .link {
          color: var(--link-color);
          text-decoration: none;
          font-weight: 500;
        }

        .link:hover {
          text-decoration: underline;
        }

        footer {
          width: 100%;
          padding: var(--spacing-md);
          border-top: 1px solid var(--border-color);
          margin-top: auto;
        }

        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: var(--font-size-sm);
          color: var(--text-secondary);
        }

        .copyright {
          color: var(--text-secondary);
        }

        @media (min-width: 768px) {
          .title {
            font-size: 3rem;
          }
        }

        .logged-in-container {
          width: 100%;
          background-color: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: var(--card-shadow);
          margin-bottom: var(--spacing-md);
          text-align: center;
        }
        
        .welcome-message {
          margin-bottom: 1.5rem;
          font-size: 1.125rem;
          color: var(--text-color);
        }
        
        .sign-out-button {
          padding: 0.75rem 1.5rem;
          background-color: #ef4444;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
        
        .sign-out-button:hover {
          background-color: #dc2626;
          transform: translateY(-1px);
          box-shadow: 0 3px 5px rgba(0, 0, 0, 0.1);
        }

        .admin-login-container {
          width: 100%;
          text-align: center;
          margin-top: var(--spacing-md);
          margin-bottom: var(--spacing-lg);
        }
        
        .admin-login-bottom {
          color: var(--link-color);
          font-weight: 500;
          text-decoration: none;
          padding: 0.75rem 1.5rem;
          transition: all 0.2s;
          border-radius: 8px;
          display: inline-block;
        }
        
        .admin-login-bottom:hover {
          color: var(--primary-hover);
          background-color: rgba(37, 99, 235, 0.05);
        }
      `}</style>

      <style jsx global>{`
        html,
        body {
          padding: 0;
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto,
            Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue,
            sans-serif;
          background-color: #f9fafb;
        }

        * {
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
} 
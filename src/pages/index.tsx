import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import LoginForm from '../components/auth/LoginForm';
import { supabase } from '../../supabase/config';
import { useRouter } from 'next/router';
import { LogIn, Shield, LayoutDashboard, LogOut, ArrowRight, CheckCircle2 } from 'lucide-react';


export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCongregationAdmin, setIsCongregationAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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

        // Check if user is the superadmin (david@uconnect.com.au)
        if (session.user.email === 'david@uconnect.com.au') {
          // Redirect superadmin directly to admin dashboard
          window.location.href = '/admin';
          return;
        }

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

          // Check if user is the superadmin (david@uconnect.com.au)
          if (session.user.email === 'david@uconnect.com.au') {
            // Redirect superadmin directly to admin dashboard
            window.location.href = '/admin';
            return;
          }

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
    <div className="page-wrapper">
      <Head>
        <title>Not At Home - Missionary Tracking</title>
        <meta name="description" content="Track not-at-home locations during door-to-door outreach" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="main-content">
        <div className="brand-section">
          <div className="logo-container">
            <div className="logo-icon">
              <CheckCircle2 size={48} strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="brand-title">Not At Home</h1>
          <p className="brand-subtitle">Bearing thorough witness</p>
        </div>

        <div className="card login-card">
          {isLoggedIn ? (
            <div className="logged-in-state">
              <div className="welcome-header">
                <div className="avatar-placeholder">
                  <span className="avatar-text">👋</span>
                </div>
                <h2 className="welcome-title">Welcome Back</h2>
                <p className="welcome-text">You are currently signed in.</p>
              </div>

              <div className="action-buttons">
                {isCongregationAdmin && (
                  <Link href="/dashboard/sessions" className="btn btn-primary w-full">
                    <LayoutDashboard size={18} className="mr-2" />
                    Manage Sessions
                  </Link>
                )}

                {isAdmin && (
                  <Link href="/admin" className="btn btn-secondary w-full">
                    <Shield size={18} className="mr-2" />
                    Admin Dashboard
                  </Link>
                )}

                <button onClick={handleSignOut} className="btn btn-outline w-full">
                  <LogOut size={18} className="mr-2" />
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <LoginForm onSuccess={handleLoginSuccess} />
          )}
        </div>

        <div className="footer-actions">
          <button
            onClick={() => window.location.href = '/congregation/login'}
            className="admin-link"
          >
            Congregation Admin Login <ArrowRight size={14} className="ml-1" />
          </button>
        </div>
      </main>

      <footer className="site-footer">
        <p>© 2025 UConnect (International) Pty Ltd t/as nothome.app</p>
      </footer>

      <style jsx>{`
        .page-wrapper {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: var(--color-bg-body);
          background-image: radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.1) 0%, transparent 70%);
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-6);
          width: 100%;
        }

        .brand-section {
          text-align: center;
          margin-bottom: var(--space-8);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .logo-container {
          margin-bottom: var(--space-4);
        }

        .logo-icon {
          color: var(--color-primary);
          filter: drop-shadow(0 4px 6px rgba(37, 99, 235, 0.2));
        }

        .brand-title {
          font-size: 3.5rem;
          font-weight: 800;
          letter-spacing: -0.04em;
          margin: 0;
          background: linear-gradient(135deg, var(--color-primary) 0%, #1e40af 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          line-height: 1.1;
        }

        .brand-subtitle {
          margin-top: var(--space-2);
          color: var(--color-text-secondary);
          font-size: 1.25rem;
          font-weight: 500;
        }

        .card {
          background-color: var(--color-bg-card);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--color-border);
          overflow: hidden;
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          padding: var(--space-8);
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(12px);
        }

        .logged-in-state {
          text-align: center;
        }

        .welcome-header {
          margin-bottom: var(--space-8);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .avatar-placeholder {
          width: 64px;
          height: 64px;
          background-color: var(--color-bg-surface);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: var(--space-4);
          border: 2px solid var(--color-border);
        }

        .avatar-text {
          font-size: 2rem;
        }

        .welcome-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 var(--space-2) 0;
          color: var(--color-text-main);
        }

        .welcome-text {
          color: var(--color-text-secondary);
          margin: 0;
        }

        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .footer-actions {
          margin-top: var(--space-8);
        }

        .admin-link {
          background: none;
          border: none;
          color: var(--color-text-tertiary);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
          display: flex;
          align-items: center;
        }

        .admin-link:hover {
          color: var(--color-primary);
        }

        .site-footer {
          padding: var(--space-6);
          text-align: center;
          color: var(--color-text-tertiary);
          font-size: 0.75rem;
        }
        
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius-lg);
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
          border: 1px solid transparent;
          cursor: pointer;
        }
        
        .btn-primary {
          background-color: var(--color-primary);
          color: white;
        }
        
        .btn-primary:hover {
          background-color: var(--color-primary-hover);
          transform: translateY(-1px);
        }
        
        .btn-secondary {
          background-color: var(--color-bg-surface);
          color: var(--color-text-main);
          border-color: var(--color-border);
        }
        
        .btn-secondary:hover {
          background-color: var(--color-bg-input);
          border-color: var(--color-border-hover);
        }
        
        .btn-outline {
          background-color: transparent;
          border-color: var(--color-border);
          color: var(--color-text-secondary);
        }
        
        .btn-outline:hover {
          border-color: var(--color-text-secondary);
          color: var(--color-text-main);
        }
        
        .w-full { width: 100%; }
        .mr-2 { margin-right: var(--space-2); }
        .ml-1 { margin-left: var(--space-1); }

        @media (max-width: 640px) {
          .brand-title { font-size: 2.5rem; }
          .login-card { padding: var(--space-6); }
        }
      `}</style>
      {/* Hidden admin link (clickable area) */}
      <div
        onClick={() => router.push('/admin')}
        style={{ position: 'fixed', bottom: 0, right: 0, width: '40px', height: '40px', opacity: 0, zIndex: 1000, cursor: 'pointer' }}
      ></div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../supabase/config';
import { Home, Settings, HelpCircle, Shield, User, Users, LogOut, CheckCircle2 } from 'lucide-react';
import SettingsModal from '../components/SettingsModal';

export default function RoleSelection() {
  const router = useRouter();
  const [congregationName, setCongregationName] = useState('');
  const [congregationLocation, setCongregationLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        console.log("Role selection: Starting auth check");

        // Check if user is logged in
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Role selection: Session error", sessionError);
          setError(`Session error: ${sessionError.message}`);
          setLoading(false);
          return;
        }

        if (!session) {
          console.log("Role selection: No session found, redirecting to login");
          // Redirect to login if not logged in
          router.push('/');
          return;
        }

        console.log("Role selection: Session found", {
          userId: session.user.id,
          email: session.user.email
        });

        // Check if user is the superadmin (david@uconnect.com.au)
        if (session.user.email === 'david@uconnect.com.au') {
          setIsSuperAdmin(true);
        }

        // Get congregation info
        const { data: userRole, error: userRoleError } = await supabase
          .from('user_roles')
          .select('congregation_id, role')
          .eq('user_id', session.user.id)
          .single();

        if (userRoleError) {
          // Check if it's a "No rows found" error, which is common right after login
          if (userRoleError.code === 'PGRST116') {
            console.log("Role selection: No user role found yet, checking local storage");

            // Try to get congregation info from localStorage
            const congregationData = localStorage.getItem('congregationData');
            if (congregationData) {
              try {
                const parsedData = JSON.parse(congregationData);
                if (parsedData.name) {
                  console.log("Role selection: Using congregation data from localStorage", parsedData);
                  setCongregationName(parsedData.name);
                  setCongregationLocation(parsedData.location || '');
                  setLoading(false);
                  return;
                }
              } catch (e) {
                console.error("Role selection: Error parsing localStorage data", e);
              }
            }

            // If we still don't have congregation info, try to fetch it from the session
            // This is a fallback for when the user role might not be immediately available
            console.log("Role selection: Waiting for user role to be available...");

            // Set a timeout to check again in 2 seconds
            setTimeout(() => {
              checkAuth();
            }, 2000);
            return;
          }

          console.error("Role selection: User role error", userRoleError);
          setError(`Error fetching user role: ${userRoleError.message}`);
          setLoading(false);
          return;
        }

        if (!userRole) {
          console.error("Role selection: No user role found");
          setError("No congregation role found for your account");
          setLoading(false);
          return;
        }

        console.log("Role selection: User role found", userRole);

        const { data: congregation, error: congregationError } = await supabase
          .from('congregations')
          .select('name')
          .eq('id', userRole.congregation_id)
          .single();

        if (congregationError) {
          console.error("Role selection: Congregation error", congregationError);
          setError(`Error fetching congregation: ${congregationError.message}`);
          setLoading(false);
          return;
        }

        if (congregation) {
          console.log("Role selection: Congregation found", congregation);
          setCongregationName(congregation.name);
          setCongregationLocation('');

          // Store congregation data in localStorage for future use
          localStorage.setItem('congregationData', JSON.stringify({
            name: congregation.name,
            location: ''
          }));
        } else {
          console.error("Role selection: No congregation found");
          setError("Congregation not found");
          setLoading(false);
        }
      } catch (err) {
        console.error('Role selection: Unexpected error:', err);
        setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
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

  // Define tabs for the quick action buttons
  const quickActions = [
    {
      title: "Home",
      icon: Home,
      action: () => router.push('/')
    },
    { divider: true },
    {
      title: "Settings",
      icon: Settings,
      action: () => setShowSettings(true)
    },
    {
      title: "Help",
      icon: HelpCircle,
      action: () => router.push('/help')
    },
    {
      title: "Privacy",
      icon: Shield,
      action: () => router.push('/privacy')
    },
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p className="loading-text">Loading...</p>
        <p className="loading-subtext">Checking authentication status...</p>
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
            margin-bottom: var(--space-2);
          }
          .loading-subtext {
            color: var(--color-text-secondary);
            font-size: 0.875rem;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <Head>
        <title>Select Role - Not At Home</title>
        <meta name="description" content="Select your role to continue" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="site-header">
        <div className="header-content">
          <div className="congregation-info">
            <h2 className="congregation-name">{congregationName || 'No Congregation'}</h2>
            {congregationLocation && <p className="congregation-location">{congregationLocation}</p>}
          </div>
          <div className="header-actions">
            {isSuperAdmin && (
              <Link href="/admin" className="btn btn-primary btn-sm">
                Admin Dashboard
              </Link>
            )}
            <button onClick={handleChangeCongregation} className="btn btn-ghost btn-sm icon-btn">
              <LogOut size={18} />
              <span className="btn-text">Change Congregation</span>
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="content-container">
          <div className="brand-section">
            <div className="logo-container">
              <div className="logo-icon">
                <CheckCircle2 size={48} strokeWidth={2.5} />
              </div>
            </div>
            <h1 className="brand-title">Not At Home</h1>
            <p className="brand-subtitle">Select your role to continue</p>
          </div>

          {error && (
            <div className="error-card">
              <h3>Error</h3>
              <p>{error}</p>
              <button
                onClick={handleChangeCongregation}
                className="btn btn-primary btn-sm"
              >
                Return to Login
              </button>
            </div>
          )}

          {!error && (
            <div className="role-selection-grid">
              <button
                className="role-card overseer"
                onClick={() => handleRoleSelect('group_overseer')}
              >
                <div className="role-icon-wrapper">
                  <User size={32} />
                </div>
                <div className="role-content">
                  <h3 className="role-title">Group Overseer</h3>
                  <p className="role-description">Open or end group sessions</p>
                </div>
              </button>

              <button
                className="role-card publisher"
                onClick={() => handleRoleSelect('publisher')}
              >
                <div className="role-icon-wrapper">
                  <Users size={32} />
                </div>
                <div className="role-content">
                  <h3 className="role-title">Publisher</h3>
                  <p className="role-description">Join sessions and record data</p>
                </div>
              </button>
            </div>
          )}

          <div className="quick-actions-wrapper">
            <h3 className="quick-actions-title">Quick Actions</h3>
            <div className="quick-actions-bar">
              {quickActions.map((action, index) => {
                if (action.divider) {
                  return <div key={`divider-${index}`} className="divider"></div>;
                }

                const Icon = action.icon;
                if (!Icon) return null;
                return (
                  <button
                    key={action.title}
                    className="quick-action-btn"
                    onClick={action.action}
                    title={action.title}
                  >
                    <Icon size={20} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <style jsx>{`
        .page-wrapper {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: var(--color-bg-body);
        }
        
        .site-header {
          background-color: var(--color-bg-card);
          border-bottom: 1px solid var(--color-border);
          padding: var(--space-4) 0;
          box-shadow: var(--shadow-sm);
        }
        
        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 var(--space-6);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .congregation-name {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-text-main);
        }
        
        .congregation-location {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: 0.875rem;
        }
        
        .header-actions {
          display: flex;
          align-items: center;
          gap: var(--space-4);
        }
        
        .btn-sm {
          padding: var(--space-2) var(--space-4);
          font-size: 0.875rem;
        }
        
        .icon-btn {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        
        .main-content {
          flex: 1;
          padding: var(--space-8) var(--space-4);
          display: flex;
          justify-content: center;
        }
        
        .content-container {
          width: 100%;
          max-width: 600px;
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
          font-size: 3rem;
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
          font-size: 1.125rem;
          font-weight: 500;
        }
        
        .role-selection-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--space-4);
          margin-bottom: var(--space-8);
        }
        
        .role-card {
          display: flex;
          align-items: center;
          padding: var(--space-6);
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          width: 100%;
        }
        
        .role-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--color-primary);
        }
        
        .role-icon-wrapper {
          width: 64px;
          height: 64px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: var(--space-6);
          flex-shrink: 0;
        }
        
        .role-card.overseer .role-icon-wrapper {
          background-color: #eff6ff;
          color: #2563eb;
        }
        
        .role-card.publisher .role-icon-wrapper {
          background-color: #f0fdf4;
          color: #16a34a;
        }
        
        .role-title {
          margin: 0 0 var(--space-1) 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-text-main);
        }
        
        .role-description {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: 0.95rem;
        }
        
        .error-card {
          background-color: var(--color-error-bg);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: var(--radius-md);
          padding: var(--space-6);
          margin-bottom: var(--space-8);
          text-align: center;
        }
        
        .error-card h3 {
          color: var(--color-error);
          margin-top: 0;
        }
        
        .quick-actions-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .quick-actions-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: var(--space-4);
        }
        
        .quick-actions-bar {
          display: flex;
          align-items: center;
          background: var(--color-bg-card);
          padding: var(--space-2);
          border-radius: 9999px;
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--color-border);
        }
        
        .quick-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: transparent;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .quick-action-btn:hover {
          background-color: var(--color-bg-body);
          color: var(--color-primary);
        }
        
        .divider {
          width: 1px;
          height: 24px;
          background-color: var(--color-border);
          margin: 0 var(--space-2);
        }
        
        @media (min-width: 640px) {
          .role-selection-grid {
            grid-template-columns: 1fr 1fr;
          }
          .role-card {
            flex-direction: column;
            text-align: center;
            padding: var(--space-8) var(--space-6);
          }
          .role-icon-wrapper {
            margin-right: 0;
            margin-bottom: var(--space-4);
          }
        }
        
        @media (max-width: 640px) {
          .header-content {
            flex-direction: column;
            gap: var(--space-4);
            text-align: center;
          }
          .btn-text {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

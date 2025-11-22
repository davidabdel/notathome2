import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../../supabase/config';
import { SupabaseClient } from '@supabase/supabase-js';
import AdminLayout from '../../components/layouts/AdminLayout';
import LoginForm from '../../components/auth/LoginForm';
import { Users, Church, ClipboardList, Activity, Settings, Shield } from 'lucide-react';

interface DashboardStats {
  congregationCount: number;
  userCount: number;
  sessionCount: number;
  pendingRequestCount: number;
}

// Rename this function to avoid naming conflict
const fetchDashboardStatsHelper = async (supabaseClient: SupabaseClient) => {
  try {
    // Get congregation count
    const { count: congregationCount, error: congregationError } = await supabaseClient
      .from('congregations')
      .select('id', { count: 'exact' });

    if (congregationError) {
      console.error('Error fetching congregation count:', congregationError);
    }

    // Get user count
    const { count: userCount, error: userError } = await supabaseClient
      .from('user_roles')
      .select('id', { count: 'exact' });

    if (userError) {
      console.error('Error fetching user count:', userError);
    }

    // Get session count from API endpoint
    let sessionCount = 0;
    try {
      const response = await fetch('/api/admin/active-sessions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        sessionCount = data.activeSessionsCount || 0;
        console.log(`Active sessions from API: ${sessionCount}`);
      } else {
        console.error('Error fetching active sessions from API:', await response.text());
      }
    } catch (err) {
      console.error('Exception fetching active sessions:', err);
    }

    // Get pending request count using a server-side API endpoint to bypass RLS
    let pendingRequestCount = 0;
    try {
      const response = await fetch('/api/admin/pending-request-count', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        pendingRequestCount = data.count || 0;
      } else {
        console.error('Error fetching pending request count from API:', await response.text());
      }
    } catch (err) {
      console.error('Exception fetching pending request count:', err);
    }

    console.log('Pending request count:', pendingRequestCount);

    return {
      congregationCount: congregationCount || 0,
      userCount: userCount || 0,
      sessionCount: sessionCount,
      pendingRequestCount: pendingRequestCount
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      congregationCount: 0,
      userCount: 0,
      sessionCount: 0,
      pendingRequestCount: 0
    };
  }
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    congregationCount: 0,
    userCount: 0,
    sessionCount: 0,
    pendingRequestCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check if user is admin and fetch stats
  useEffect(() => {
    checkAdminAndFetchStats();
  }, []);

  const checkAdminAndFetchStats = async () => {
    setLoading(true);
    setError('');

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);

      // Check if user is admin
      const { data: userRoles, error: userRolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (userRolesError || !userRoles) {
        setError('You do not have permission to access this page');
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      // Fetch dashboard stats
      await fetchDashboardStats(supabase);
    } catch (err) {
      console.error('Error checking admin status:', err);
      setError('Failed to verify admin status');
    } finally {
      setLoading(false);
    }
  };

  // Fetch dashboard stats
  const fetchDashboardStats = async (supabaseClient: SupabaseClient) => {
    try {
      console.log('Fetching dashboard stats...');

      // Fetch stats
      const stats = await fetchDashboardStatsHelper(supabaseClient);

      console.log('Stats being set:', stats);

      setStats(stats);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to load dashboard statistics');
    }
  };

  const handleLoginSuccess = () => {
    // Re-check admin status after successful login
    checkAdminAndFetchStats();
  };

  return (
    <AdminLayout>
      <Head>
        <title>Admin Dashboard - Not At Home</title>
        <meta name="description" content="Admin dashboard for Not At Home" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
        <meta name="theme-color" content="#1e293b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </Head>

      <div className="content-container">
        <div className="header">
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="description">Manage congregations, users, and system settings</p>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p className="loading-text">Loading dashboard...</p>
          </div>
        ) : !isLoggedIn ? (
          <div className="login-container">
            <div className="login-card">
              <div className="login-header">
                <Shield size={48} className="login-icon" />
                <h2>Admin Access Required</h2>
                <p>Please log in with your admin credentials to continue.</p>
              </div>
              <LoginForm onSuccess={handleLoginSuccess} />
            </div>
          </div>
        ) : error ? (
          <div className="error-alert">{error}</div>
        ) : !isAdmin ? (
          <div className="error-alert">You do not have permission to access this page</div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon-wrapper blue">
                  <Church size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.congregationCount}</div>
                  <div className="stat-label">Congregations</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon-wrapper green">
                  <Users size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.userCount}</div>
                  <div className="stat-label">Users</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon-wrapper purple">
                  <Activity size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.sessionCount}</div>
                  <div className="stat-label">Active Sessions</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon-wrapper orange">
                  <ClipboardList size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.pendingRequestCount}</div>
                  <div className="stat-label">Pending Requests</div>
                </div>
              </div>
            </div>

            <div className="section-header">
              <h2 className="section-title">Admin Actions</h2>
            </div>

            <div className="admin-actions-grid">
              <Link href="/admin/requests" className="action-card">
                <div className="action-icon-wrapper">
                  <ClipboardList size={28} />
                </div>
                <div className="action-content">
                  <h3 className="action-title">Congregation Requests</h3>
                  <p className="action-description">Approve or reject congregation registration requests</p>
                  {stats.pendingRequestCount > 0 && (
                    <div className="action-badge">{stats.pendingRequestCount} pending</div>
                  )}
                </div>
              </Link>

              <Link href="/admin/congregations" className="action-card">
                <div className="action-icon-wrapper">
                  <Church size={28} />
                </div>
                <div className="action-content">
                  <h3 className="action-title">Manage Congregations</h3>
                  <p className="action-description">View and manage all congregations in the system</p>
                </div>
              </Link>

              <Link href="/admin/users" className="action-card">
                <div className="action-icon-wrapper">
                  <Users size={28} />
                </div>
                <div className="action-content">
                  <h3 className="action-title">Manage Users</h3>
                  <p className="action-description">View and manage user accounts and permissions</p>
                </div>
              </Link>

              <Link href="/admin/settings" className="action-card">
                <div className="action-icon-wrapper">
                  <Settings size={28} />
                </div>
                <div className="action-content">
                  <h3 className="action-title">System Settings</h3>
                  <p className="action-description">Configure global system settings and preferences</p>
                </div>
              </Link>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .content-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: var(--space-6);
        }
        
        .header {
          margin-bottom: var(--space-8);
        }
        
        .page-title {
          font-size: 2rem;
          font-weight: 800;
          color: var(--color-text-main);
          margin: 0 0 var(--space-2) 0;
          letter-spacing: -0.025em;
        }
        
        .description {
          color: var(--color-text-secondary);
          font-size: 1.125rem;
        }
        
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-12) 0;
          min-height: 400px;
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
          color: var(--color-text-secondary);
        }
        
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .error-alert {
          background-color: var(--color-error-bg);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: var(--color-error);
          padding: var(--space-4);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-6);
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: var(--space-6);
          margin-bottom: var(--space-12);
        }
        
        .stat-card {
          background-color: var(--color-bg-card);
          border-radius: var(--radius-lg);
          padding: var(--space-6);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          gap: var(--space-4);
          transition: transform 0.2s ease;
        }
        
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        
        .stat-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .stat-icon-wrapper.blue {
          background-color: #eff6ff;
          color: #2563eb;
        }
        
        .stat-icon-wrapper.green {
          background-color: #f0fdf4;
          color: #16a34a;
        }
        
        .stat-icon-wrapper.purple {
          background-color: #f5f3ff;
          color: #7c3aed;
        }
        
        .stat-icon-wrapper.orange {
          background-color: #fff7ed;
          color: #ea580c;
        }
        
        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text-main);
          line-height: 1;
          margin-bottom: var(--space-1);
        }
        
        .stat-label {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          font-weight: 500;
        }
        
        .section-header {
          margin-bottom: var(--space-6);
          border-bottom: 1px solid var(--color-border);
          padding-bottom: var(--space-4);
        }
        
        .section-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text-main);
          margin: 0;
        }
        
        .admin-actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: var(--space-6);
        }
        
        .action-card {
          background-color: var(--color-bg-card);
          border-radius: var(--radius-lg);
          padding: var(--space-6);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--color-border);
          display: flex;
          gap: var(--space-4);
          transition: all 0.2s ease;
          text-decoration: none;
          position: relative;
          overflow: hidden;
        }
        
        .action-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--color-primary);
        }
        
        .action-icon-wrapper {
          width: 56px;
          height: 56px;
          background-color: var(--color-bg-body);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-primary);
          flex-shrink: 0;
        }
        
        .action-card:hover .action-icon-wrapper {
          background-color: var(--color-primary);
          color: white;
        }
        
        .action-content {
          flex: 1;
        }
        
        .action-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text-main);
          margin: 0 0 var(--space-2) 0;
        }
        
        .action-description {
          font-size: 0.95rem;
          color: var(--color-text-secondary);
          margin: 0;
          line-height: 1.5;
        }
        
        .action-badge {
          display: inline-block;
          background-color: var(--color-error);
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 9999px;
          margin-top: var(--space-3);
        }

        .login-container {
          display: flex;
          justify-content: center;
          padding: var(--space-8) 0;
        }

        .login-card {
          width: 100%;
          max-width: 450px;
          background-color: var(--color-bg-card);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--color-border);
          padding: var(--space-8);
        }

        .login-header {
          text-align: center;
          margin-bottom: var(--space-8);
        }

        .login-icon {
          color: var(--color-primary);
          margin-bottom: var(--space-4);
        }

        .login-header h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text-main);
          margin: 0 0 var(--space-2) 0;
        }

        .login-header p {
          color: var(--color-text-secondary);
          margin: 0;
        }
      `}</style>
    </AdminLayout>
  );
} 
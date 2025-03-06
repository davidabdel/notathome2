import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../../supabase/config';
import { SupabaseClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/layouts/AdminLayout';
import { FaUsers, FaChurch, FaClipboardList, FaSignInAlt, FaCog, FaPlaceOfWorship } from 'react-icons/fa';

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

    // Get session count
    const { count: sessionCount, error: sessionError } = await supabaseClient
      .from('sessions')
      .select('id', { count: 'exact' });

    if (sessionError) {
      console.error('Error fetching session count:', sessionError);
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
      sessionCount: sessionCount || 0,
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

  // Check if user is admin and fetch stats
  useEffect(() => {
    const checkAdminAndFetchStats = async () => {
      setLoading(true);
      
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setError('You must be logged in to view this page');
          setLoading(false);
          return;
        }
        
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
    
    checkAdminAndFetchStats();
  }, []);

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
          <h1>Admin Dashboard</h1>
          <p className="description">Manage congregations, users, and system settings</p>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading dashboard...</p>
          </div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : !isAdmin ? (
          <div className="error-message">You do not have permission to access this page</div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon"><FaPlaceOfWorship /></div>
                <div className="stat-content">
                  <div className="stat-value">{stats.congregationCount}</div>
                  <div className="stat-label">Congregations</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><FaUsers /></div>
                <div className="stat-content">
                  <div className="stat-value">{stats.userCount}</div>
                  <div className="stat-label">Users</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><FaSignInAlt /></div>
                <div className="stat-content">
                  <div className="stat-value">{stats.sessionCount}</div>
                  <div className="stat-label">Sessions</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><FaClipboardList /></div>
                <div className="stat-content">
                  <div className="stat-value">{stats.pendingRequestCount}</div>
                  <div className="stat-label">Pending Requests</div>
                </div>
              </div>
            </div>

            <div className="section-header">
              <h2>Admin Actions</h2>
            </div>
            
            <div className="admin-actions-grid">
              <Link href="/admin/requests" className="action-card">
                <div className="action-icon"><FaClipboardList /></div>
                <div className="action-content">
                  <h3>Congregation Requests</h3>
                  <p>Approve or reject congregation registration requests</p>
                  {stats.pendingRequestCount > 0 && (
                    <div className="action-badge">{stats.pendingRequestCount} pending</div>
                  )}
                </div>
              </Link>
              
              <Link href="/admin/congregations" className="action-card">
                <div className="action-icon"><FaPlaceOfWorship /></div>
                <div className="action-content">
                  <h3>Manage Congregations</h3>
                  <p>View and manage all congregations in the system</p>
                </div>
              </Link>
              
              <Link href="/admin/users" className="action-card">
                <div className="action-icon"><FaUsers /></div>
                <div className="action-content">
                  <h3>Manage Users</h3>
                  <p>View and manage user accounts and permissions</p>
                </div>
              </Link>
              
              <Link href="/admin/settings" className="action-card">
                <div className="action-icon"><FaCog /></div>
                <div className="action-content">
                  <h3>System Settings</h3>
                  <p>Configure global system settings and preferences</p>
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
        }
        
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 0;
        }
        
        .loading-spinner {
          border: 3px solid rgba(0, 0, 0, 0.1);
          border-radius: 50%;
          border-top: 3px solid #2563eb;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .error-message {
          background-color: #fee2e2;
          color: #b91c1c;
          padding: 1rem;
          border-radius: 0.375rem;
          margin-bottom: 1.5rem;
        }
        
        @media (max-width: 480px) {
          .loading-spinner {
            width: 32px;
            height: 32px;
          }
        }
      `}</style>
    </AdminLayout>
  );
} 
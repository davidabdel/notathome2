import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';
import Link from 'next/link';
import TerritoryMapsManager from '../../components/congregation/TerritoryMapsManager';
import CongregationInfo from '../../components/congregation/CongregationInfo';
import { Map, Info, AlertCircle } from 'lucide-react';

interface Congregation {
  id: string;
  name: string;
  status: string;
  contact_email?: string;
  notification_email?: string;
  created_at?: string;
}

export default function CongregationDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [congregation, setCongregation] = useState<Congregation | null>(null);
  const [activeTab, setActiveTab] = useState('maps');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get the current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          console.log("No user found, redirecting to login");
          router.push('/login');
          return;
        }

        // Get user's congregation
        const { data: userRolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('congregation_id, role')
          .eq('user_id', user.id);

        if (rolesError) {
          setError('Failed to load user roles');
          setLoading(false);
          return;
        }

        if (!userRolesData || userRolesData.length === 0) {
          console.log("No user roles found, redirecting to congregation login");
          // Sign out the user since they don't have any roles
          await supabase.auth.signOut();
          router.push('/login');
          return;
        }

        // Check if user is a congregation admin
        const isUserAdmin = userRolesData.some(role => role.role === 'congregation_admin' || role.role === 'admin');

        if (!isUserAdmin) {
          setError('You do not have permission to access this page');
          setLoading(false);
          return;
        }

        // Get the congregation ID (use the first one if multiple)
        const congregationId = userRolesData[0].congregation_id;

        // Get congregation details
        const { data: congregationData, error: congregationError } = await supabase
          .from('congregations')
          .select('*')
          .eq('id', congregationId)
          .single();

        if (congregationError) {
          setError('Failed to load congregation data');
          setLoading(false);
          return;
        }

        setCongregation(congregationData);
        setLoading(false);
      } catch (err) {
        console.error("Error in fetchData:", err);
        setError('An unexpected error occurred');
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleMapError = (errorMessage: string) => {
    setError(errorMessage);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p className="loading-text">Loading dashboard...</p>
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

  if (error && !congregation) {
    return (
      <div className="error-container">
        <div className="error-card">
          <AlertCircle size={48} className="error-icon" />
          <h2 className="error-title">Access Error</h2>
          <p className="error-message">{error}</p>
          <Link href="/fix-database" className="btn btn-primary">
            Go to Fix Database Page
          </Link>
        </div>
        <style jsx>{`
          .error-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: var(--color-bg-body);
            padding: var(--space-4);
          }
          .error-card {
            background-color: var(--color-bg-card);
            padding: var(--space-8);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-lg);
            text-align: center;
            max-width: 400px;
            width: 100%;
            border: 1px solid var(--color-border);
          }
          .error-icon {
            color: var(--color-error);
            margin-bottom: var(--space-4);
          }
          .error-title {
            margin: 0 0 var(--space-2) 0;
            color: var(--color-text-main);
          }
          .error-message {
            color: var(--color-text-secondary);
            margin-bottom: var(--space-6);
          }
        `}</style>
      </div>
    );
  }

  if (!congregation) {
    return (
      <div className="error-container">
        <div className="error-card">
          <AlertCircle size={48} className="error-icon" />
          <h2 className="error-title">Congregation Not Found</h2>
          <p className="error-message">We couldn't find the congregation details.</p>
          <Link href="/fix-database" className="btn btn-primary">
            Go to Fix Database Page
          </Link>
        </div>
        <style jsx>{`
          .error-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: var(--color-bg-body);
            padding: var(--space-4);
          }
          .error-card {
            background-color: var(--color-bg-card);
            padding: var(--space-8);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-lg);
            text-align: center;
            max-width: 400px;
            width: 100%;
            border: 1px solid var(--color-border);
          }
          .error-icon {
            color: var(--color-error);
            margin-bottom: var(--space-4);
          }
          .error-title {
            margin: 0 0 var(--space-2) 0;
            color: var(--color-text-main);
          }
          .error-message {
            color: var(--color-text-secondary);
            margin-bottom: var(--space-6);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div>
            <h1 className="page-title">Congregation Dashboard</h1>
            <div className="congregation-name">{congregation.name}</div>
          </div>
        </header>

        <div className="tabs-container">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'info' ? 'active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              <Info size={18} />
              <span>Information</span>
            </button>
            <button
              className={`tab ${activeTab === 'maps' ? 'active' : ''}`}
              onClick={() => setActiveTab('maps')}
            >
              <Map size={18} />
              <span>Territory Maps</span>
            </button>
          </div>
        </div>

        <main className="dashboard-content">
          {success && <div className="success-alert">{success}</div>}
          {error && <div className="error-alert">{error}</div>}

          {activeTab === 'info' && (
            <div className="tab-content fade-in">
              <CongregationInfo congregation={congregation} />
            </div>
          )}

          {activeTab === 'maps' && (
            <div className="tab-content fade-in">
              <TerritoryMapsManager
                congregationId={congregation.id}
                onError={handleMapError}
              />
            </div>
          )}
        </main>
      </div>

      <style jsx>{`
        .page-wrapper {
          min-height: 100vh;
          background-color: var(--color-bg-body);
          padding: var(--space-6);
        }
        
        .dashboard-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .dashboard-header {
          margin-bottom: var(--space-6);
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        
        .page-title {
          font-size: 2rem;
          font-weight: 800;
          color: var(--color-text-main);
          margin: 0 0 var(--space-2) 0;
          letter-spacing: -0.025em;
        }
        
        .congregation-name {
          font-size: 1.125rem;
          color: var(--color-text-secondary);
          font-weight: 500;
        }
        
        .tabs-container {
          margin-bottom: var(--space-6);
          border-bottom: 1px solid var(--color-border);
        }
        
        .tabs {
          display: flex;
          gap: var(--space-6);
        }
        
        .tab {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3) 0;
          background: none;
          border: none;
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--color-text-secondary);
          cursor: pointer;
          position: relative;
          transition: all 0.2s;
        }
        
        .tab:hover {
          color: var(--color-text-main);
        }
        
        .tab.active {
          color: var(--color-primary);
        }
        
        .tab.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background-color: var(--color-primary);
          border-radius: 2px 2px 0 0;
        }
        
        .dashboard-content {
          background-color: var(--color-bg-card);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          padding: var(--space-6);
          border: 1px solid var(--color-border);
          min-height: 400px;
        }
        
        .success-alert {
          background-color: var(--color-success-bg);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: var(--color-success);
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-6);
        }
        
        .error-alert {
          background-color: var(--color-error-bg);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: var(--color-error);
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-6);
        }
        
        .fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
} 
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import TerritoryMapsManager from '../../components/congregation/TerritoryMapsManager';
import CongregationInfo from '../../components/congregation/CongregationInfo';
import { FaMap, FaInfoCircle } from 'react-icons/fa';

interface Congregation {
  id: string;
  name: string;
  status: string;
  contact_email?: string;
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
        // Create a Supabase client
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          process.env.NEXT_PUBLIC_SUPABASE_KEY || ''
        );
        
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
    return <div className="loading">Loading...</div>;
  }

  if (error && !congregation) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <Link href="/fix-database">
          <div className="fix-database-link">Go to Fix Database Page</div>
        </Link>
      </div>
    );
  }

  if (!congregation) {
    return (
      <div className="error-container">
        <div className="error-message">Congregation not found</div>
        <Link href="/fix-database">
          <div className="fix-database-link">Go to Fix Database Page</div>
        </Link>
      </div>
    );
  }

  return (
    <div className="congregation-dashboard">
      <div className="dashboard-header">
        <h1>Congregation Dashboard</h1>
        <div className="congregation-name">{congregation.name}</div>
        
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <FaInfoCircle /> Information
          </button>
          <button 
            className={`tab ${activeTab === 'maps' ? 'active' : ''}`}
            onClick={() => setActiveTab('maps')}
          >
            <FaMap /> Territory Maps
          </button>
        </div>
      </div>
      
      <div className="dashboard-content">
        {success && <div className="success-message">{success}</div>}
        {error && <div className="error-message">{error}</div>}
        
        {activeTab === 'info' && (
          <div className="info-container">
            <CongregationInfo congregation={congregation} />
          </div>
        )}
        
        {activeTab === 'maps' && (
          <div className="maps-container">
            <TerritoryMapsManager 
              congregationId={congregation.id} 
              onError={handleMapError}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        .congregation-dashboard {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        .dashboard-header {
          margin-bottom: 2rem;
        }
        
        h1 {
          font-size: 2rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }
        
        .congregation-name {
          font-size: 1.25rem;
          color: #64748b;
          margin-bottom: 1.5rem;
        }
        
        .tabs {
          display: flex;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 1.5rem;
        }
        
        .tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: none;
          border: none;
          font-size: 1rem;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .tab:hover {
          color: #1e293b;
        }
        
        .tab.active {
          color: #3b82f6;
          border-bottom: 2px solid #3b82f6;
        }
        
        .dashboard-content {
          background-color: white;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          padding: 1.5rem;
        }
        
        h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 1rem;
        }
        
        h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #334155;
          margin: 1.5rem 0 0.75rem;
        }
        
        .info-container,
        .maps-container {
          padding: 1rem 0;
        }
        
        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          font-size: 1.25rem;
          color: #64748b;
        }
        
        .success-message {
          background-color: #f0fdf4;
          border: 1px solid #86efac;
          color: #166534;
          padding: 1rem;
          border-radius: 0.375rem;
          margin-bottom: 1.5rem;
        }
        
        .error-message {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          padding: 1rem;
          border-radius: 0.375rem;
          margin-bottom: 1.5rem;
        }
        
        .error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          gap: 1rem;
        }
        
        .fix-database-link {
          display: inline-block;
          margin-top: 1rem;
          padding: 0.75rem 1.5rem;
          background-color: #3b82f6;
          color: white;
          border-radius: 0.375rem;
          text-decoration: none;
          font-weight: 500;
          cursor: pointer;
        }
        
        .fix-database-link:hover {
          color: #1d4ed8;
        }
      `}</style>
    </div>
  );
} 
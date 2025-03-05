import React, { useState } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { supabase } from '../../../supabase/config';
import TerritoryMapsManager from '../../components/congregation/TerritoryMapsManager';
import { FaMap, FaHome, FaUsers, FaCog, FaSignOutAlt } from 'react-icons/fa';
import Link from 'next/link';
import FixDatabaseButton from '../../components/FixDatabaseButton';

interface CongregationData {
  id: string;
  name: string;
  status: string;
}

interface TerritoryMapsPageProps {
  congregationId: string;
  congregationName: string;
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  // Get the user using the new Supabase JS client
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  // Check if user has a congregation and is a congregation admin
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', user.id)
    .eq('role', 'congregation_admin');

  if (!userRoles || userRoles.length === 0) {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    };
  }

  // Get congregation data
  const { data: congregationData, error: congregationError } = await supabase
    .from('congregations')
    .select('id, name, status')
    .eq('id', userRoles[0].congregation_id)
    .single();

  if (congregationError || !congregationData) {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    };
  }

  return {
    props: {
      congregationId: congregationData.id,
      congregationName: congregationData.name,
    },
  };
};

const TerritoryMapsPage: React.FC<TerritoryMapsPageProps> = ({ 
  congregationId, 
  congregationName 
}) => {
  const [showFixButton, setShowFixButton] = useState(false);
  const [error, setError] = useState('');

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setShowFixButton(true);
  };

  const handleFixSuccess = () => {
    setShowFixButton(false);
    setError('');
    window.location.reload();
  };

  return (
    <div className="congregation-layout">
      <Head>
        <title>{congregationName} Territory Maps | Not At Home</title>
        <meta name="description" content="Manage your congregation's territory maps" />
      </Head>

      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Congregation</h2>
        </div>
        <nav className="sidebar-nav">
          <Link href="/congregation">
            <div className="nav-item">
              <FaHome className="icon" />
              <span>Dashboard</span>
            </div>
          </Link>
          <Link href="/congregation/territory-maps">
            <div className="nav-item active">
              <FaMap className="icon" />
              <span>Territory Maps</span>
            </div>
          </Link>
          <Link href="/congregation/publishers">
            <div className="nav-item">
              <FaUsers className="icon" />
              <span>Publishers</span>
            </div>
          </Link>
          <Link href="/congregation/settings">
            <div className="nav-item">
              <FaCog className="icon" />
              <span>Settings</span>
            </div>
          </Link>
          <button 
            className="nav-item sign-out"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/login';
            }}
          >
            <FaSignOutAlt className="icon" />
            <span>Sign Out</span>
          </button>
        </nav>
      </div>

      <div className="main-content">
        <div className="territory-maps-page">
          <div className="page-header">
            <h1>{congregationName} Territory Maps</h1>
            <p className="subtitle">
              Manage your congregation's territory maps
            </p>
          </div>

          {error && (
            <div className="error-alert">
              <p>{error}</p>
              {showFixButton && (
                <FixDatabaseButton 
                  buttonText="Fix Database Schema" 
                  onSuccess={handleFixSuccess} 
                />
              )}
            </div>
          )}

          <TerritoryMapsManager 
            congregationId={congregationId} 
            onError={handleError}
          />
        </div>
      </div>

      <style jsx>{`
        .congregation-layout {
          display: flex;
          min-height: 100vh;
        }

        .sidebar {
          width: 250px;
          background-color: #1e293b;
          color: white;
          padding: 1.5rem;
          flex-shrink: 0;
        }

        .sidebar-header {
          margin-bottom: 2rem;
        }

        .sidebar-header h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .nav-item {
          display: flex;
          align-items: center;
          padding: 0.75rem 1rem;
          border-radius: 0.375rem;
          color: #cbd5e1;
          text-decoration: none;
          transition: background-color 0.2s;
          cursor: pointer;
          border: none;
          background: none;
          width: 100%;
          text-align: left;
          font-size: 1rem;
        }

        .nav-item:hover {
          background-color: #334155;
          color: white;
        }

        .nav-item.active {
          background-color: #2563eb;
          color: white;
        }

        .icon {
          margin-right: 0.75rem;
          font-size: 1.125rem;
        }

        .sign-out {
          margin-top: auto;
          color: #f87171;
        }

        .main-content {
          flex-grow: 1;
          background-color: #f8fafc;
        }

        .territory-maps-page {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        h1 {
          font-size: 2rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 0.5rem 0;
        }

        .subtitle {
          color: #64748b;
          font-size: 1.125rem;
        }

        .error-alert {
          background-color: #fee2e2;
          border: 1px solid #fca5a5;
          border-radius: 0.5rem;
          padding: 1rem;
          margin-bottom: 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .error-alert p {
          color: #b91c1c;
          margin: 0;
          text-align: center;
        }
      `}</style>
    </div>
  );
};

export default TerritoryMapsPage; 
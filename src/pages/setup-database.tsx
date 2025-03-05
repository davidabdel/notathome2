import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../supabase/config';

interface TableStatus {
  exists: boolean;
  error: string | null;
}

interface TablesStatus {
  congregations: TableStatus;
  congregation_requests: TableStatus;
  user_roles: TableStatus;
}

export default function SetupDatabase() {
  const [tablesStatus, setTablesStatus] = useState<TablesStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [congregations, setCongregations] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const checkTables = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/check-tables');
      const data = await response.json();
      setTablesStatus(data.tables);
      fetchCongregations();
    } catch (err) {
      console.error('Error checking tables:', err);
      setError('Failed to check database tables');
    } finally {
      setLoading(false);
    }
  };

  const fetchCongregations = async () => {
    try {
      const { data, error } = await supabase
        .from('congregations')
        .select('*');
      
      if (error) throw error;
      setCongregations(data || []);
    } catch (err) {
      console.error('Error fetching congregations:', err);
    }
  };

  const createAdminCongregation = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Call our API endpoint to insert the congregation
      const response = await fetch('/api/insert-congregation');
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setSuccess(data.message || 'Admin Congregation created successfully');
      fetchCongregations();
    } catch (err: any) {
      console.error('Error creating congregation:', err);
      setError(err.message || 'Failed to create Admin Congregation');
    } finally {
      setLoading(false);
    }
  };

  const createRpcFunction = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Create an RPC function to disable RLS for congregations
      const { error } = await supabase.rpc('create_disable_rls_function');
      
      if (error) throw error;
      
      setSuccess('RPC function created successfully');
    } catch (err: any) {
      console.error('Error creating RPC function:', err);
      setError(err.message || 'Failed to create RPC function');
    } finally {
      setLoading(false);
    }
  };

  const copyMigrationToClipboard = () => {
    const migrationSql = `-- Step 1: Create the congregations table first (from 20240510_initial.sql)
CREATE TABLE congregations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  pin_code VARCHAR(10) NOT NULL,
  status TEXT DEFAULT 'pending'
);

-- Step 2: Enable RLS and create additional tables (from 20240511_rls.sql)
ALTER TABLE congregations ENABLE ROW LEVEL SECURITY;

-- Create user_roles table for role-based access control
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  congregation_id UUID REFERENCES congregations(id),
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, congregation_id, role)
);

-- Create congregation_requests table
CREATE TABLE congregation_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  pin_code VARCHAR(10) NOT NULL,
  contact_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Policy for congregation admins to view their congregation
CREATE POLICY congregation_admins ON congregations
  FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'congregation_admin' AND congregation_id = id
  ));

-- Policy for viewing congregation requests (admin only)
ALTER TABLE congregation_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_view_requests ON congregation_requests
  FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'super_admin'
  ));

-- Policy for creating congregation requests (public)
CREATE POLICY create_congregation_request ON congregation_requests
  FOR INSERT WITH CHECK (true);  -- Anyone can submit a request`;

    navigator.clipboard.writeText(migrationSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="container">
      <Head>
        <title>Setup Database - Not At Home</title>
        <meta name="description" content="Setup database tables for Not At Home app" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <main>
        <div className="content-container">
          <div className="header">
            <Link href="/" className="back-link">← Back to home</Link>
            <h1>Database Setup</h1>
            <p className="description">Check and configure your database tables</p>
          </div>

          <div className="card">
            <h2>Table Status</h2>
            
            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Checking tables...</p>
              </div>
            ) : tablesStatus ? (
              <div className="table-status">
                <div className="status-item">
                  <span className="table-name">congregations</span>
                  <span className={`status-badge ${tablesStatus.congregations.exists ? 'exists' : 'missing'}`}>
                    {tablesStatus.congregations.exists ? 'Exists' : 'Missing'}
                  </span>
                </div>
                
                <div className="status-item">
                  <span className="table-name">congregation_requests</span>
                  <span className={`status-badge ${tablesStatus.congregation_requests.exists ? 'exists' : 'missing'}`}>
                    {tablesStatus.congregation_requests.exists ? 'Exists' : 'Missing'}
                  </span>
                </div>
                
                <div className="status-item">
                  <span className="table-name">user_roles</span>
                  <span className={`status-badge ${tablesStatus.user_roles.exists ? 'exists' : 'missing'}`}>
                    {tablesStatus.user_roles.exists ? 'Exists' : 'Missing'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="error-text">Failed to check table status</p>
            )}
            
            <div className="card-footer">
              <button 
                onClick={checkTables} 
                disabled={loading}
                className="button primary"
              >
                {loading ? 'Checking...' : 'Refresh Status'}
              </button>
            </div>
          </div>
          
          {tablesStatus && (!tablesStatus.congregations.exists || !tablesStatus.congregation_requests.exists || !tablesStatus.user_roles.exists) && (
            <div className="card">
              <h2>Setup Instructions</h2>
              
              <div className="alert-box">
                <div className="alert-icon">⚠️</div>
                <p>One or more required tables are missing. Follow the steps below to create them.</p>
              </div>
              
              <ol className="instructions">
                <li>Go to your Supabase project dashboard</li>
                <li>Navigate to the SQL Editor</li>
                <li>Create a new query</li>
                <li>Copy the SQL below and paste it into the query editor</li>
                <li>Run the query to create all required tables and policies</li>
              </ol>
              
              <div className="code-container">
                <button 
                  onClick={copyMigrationToClipboard}
                  className="copy-button"
                >
                  {copied ? 'Copied!' : 'Copy SQL'}
                </button>
                <pre className="code-block">
                  {`-- Step 1: Create the congregations table first (from 20240510_initial.sql)
CREATE TABLE congregations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  pin_code VARCHAR(10) NOT NULL,
  status TEXT DEFAULT 'pending'
);

-- Step 2: Enable RLS and create additional tables (from 20240511_rls.sql)
ALTER TABLE congregations ENABLE ROW LEVEL SECURITY;

-- Create user_roles table for role-based access control
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  congregation_id UUID REFERENCES congregations(id),
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, congregation_id, role)
);

-- Create congregation_requests table
CREATE TABLE congregation_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  pin_code VARCHAR(10) NOT NULL,
  contact_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Policy for congregation admins to view their congregation
CREATE POLICY congregation_admins ON congregations
  FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'congregation_admin' AND congregation_id = id
  ));

-- Policy for viewing congregation requests (admin only)
ALTER TABLE congregation_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_view_requests ON congregation_requests
  FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'super_admin'
  ));

-- Policy for creating congregation requests (public)
CREATE POLICY create_congregation_request ON congregation_requests
  FOR INSERT WITH CHECK (true);  -- Anyone can submit a request`}
                </pre>
              </div>
              
              <p className="note">After running the SQL, come back to this page and click "Refresh Status" to verify that all tables were created successfully.</p>
            </div>
          )}
        </div>

        <div className="actions">
          <h2>Actions</h2>
          
          <button 
            onClick={createRpcFunction} 
            disabled={loading}
            className="action-button"
          >
            Create RPC Function
          </button>
          
          <button 
            onClick={createAdminCongregation} 
            disabled={loading}
            className="action-button"
          >
            Create Admin Congregation
          </button>
          
          <button 
            onClick={checkTables} 
            disabled={loading}
            className="action-button secondary"
          >
            Refresh Tables Status
          </button>
        </div>
        
        {congregations.length > 0 && (
          <div className="congregations">
            <h2>Existing Congregations</h2>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>PIN Code</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {congregations.map((congregation) => (
                  <tr key={congregation.id}>
                    <td>{congregation.id}</td>
                    <td>{congregation.name}</td>
                    <td>{congregation.pin_code}</td>
                    <td>{congregation.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <footer>
        <div className="footer-content">
          <Link href="/" className="footer-link">Home</Link>
          <span className="divider">•</span>
          <span className="copyright">© 2024 Not At Home</span>
        </div>
      </footer>

      <style jsx>{`
        :root {
          --primary-color: #2563eb;
          --primary-hover: #1d4ed8;
          --success-color: #10b981;
          --error-color: #ef4444;
          --warning-color: #f59e0b;
          --text-color: #111827;
          --text-secondary: #4b5563;
          --background-color: #ffffff;
          --border-color: #e5e7eb;
          --spacing-xs: 0.5rem;
          --spacing-sm: 1rem;
          --spacing-md: 1.5rem;
          --spacing-lg: 2rem;
          --spacing-xl: 3rem;
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
          padding: var(--spacing-md);
          width: 100%;
        }

        .content-container {
          width: 100%;
          max-width: 800px;
        }

        .header {
          margin-bottom: var(--spacing-lg);
        }

        .back-link {
          display: inline-block;
          margin-bottom: var(--spacing-sm);
          color: var(--primary-color);
          text-decoration: none;
          font-size: 0.875rem;
        }

        .back-link:hover {
          text-decoration: underline;
        }

        h1 {
          margin: 0 0 var(--spacing-xs);
          font-size: 1.875rem;
          font-weight: 700;
          color: var(--text-color);
        }

        .description {
          margin: 0;
          color: var(--text-secondary);
          font-size: 1rem;
        }

        .card {
          background-color: white;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: var(--spacing-lg);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          margin-bottom: var(--spacing-lg);
        }

        h2 {
          margin: 0 0 var(--spacing-md);
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-color);
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-lg) 0;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(37, 99, 235, 0.1);
          border-radius: 50%;
          border-top-color: var(--primary-color);
          animation: spin 1s linear infinite;
          margin-bottom: var(--spacing-md);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-container p {
          color: var(--text-secondary);
          margin: 0;
        }

        .table-status {
          margin-bottom: var(--spacing-lg);
        }

        .status-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-sm) 0;
          border-bottom: 1px solid var(--border-color);
        }

        .status-item:last-child {
          border-bottom: none;
        }

        .table-name {
          font-weight: 500;
          font-size: 1rem;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .exists {
          background-color: rgba(16, 185, 129, 0.1);
          color: var(--success-color);
        }

        .missing {
          background-color: rgba(239, 68, 68, 0.1);
          color: var(--error-color);
        }

        .error-text {
          color: var(--error-color);
          text-align: center;
          padding: var(--spacing-lg);
          margin: 0;
        }

        .card-footer {
          margin-top: var(--spacing-md);
          padding-top: var(--spacing-md);
          border-top: 1px solid var(--border-color);
        }

        .alert-box {
          display: flex;
          align-items: flex-start;
          padding: var(--spacing-md);
          background-color: rgba(245, 158, 11, 0.1);
          border-radius: 8px;
          margin-bottom: var(--spacing-lg);
        }

        .alert-icon {
          font-size: 1.25rem;
          margin-right: var(--spacing-md);
        }

        .alert-box p {
          margin: 0;
          font-size: 0.875rem;
        }

        .instructions {
          margin: var(--spacing-lg) 0;
          padding-left: var(--spacing-xl);
        }

        .instructions li {
          margin-bottom: var(--spacing-sm);
          font-size: 0.875rem;
        }

        .code-container {
          position: relative;
          margin: var(--spacing-lg) 0;
        }

        .code-block {
          background-color: #f8fafc;
          padding: var(--spacing-lg);
          border-radius: 8px;
          overflow-x: auto;
          font-size: 0.875rem;
          line-height: 1.5;
          max-height: 400px;
          overflow-y: auto;
          margin: 0;
          border: 1px solid var(--border-color);
        }

        .copy-button {
          position: absolute;
          top: var(--spacing-sm);
          right: var(--spacing-sm);
          background-color: var(--primary-color);
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.25rem 0.75rem;
          font-size: 0.75rem;
          cursor: pointer;
          transition: background-color 0.15s;
        }

        .copy-button:hover {
          background-color: var(--primary-hover);
        }

        .note {
          font-style: italic;
          margin-top: var(--spacing-lg);
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .button {
          padding: 0.75rem 1rem;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }

        .button.primary {
          background-color: var(--primary-color);
          color: white;
          width: 100%;
        }

        .button.primary:hover:not(:disabled) {
          background-color: var(--primary-hover);
        }

        .button.primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        footer {
          width: 100%;
          padding: var(--spacing-md);
          border-top: 1px solid var(--border-color);
        }

        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .footer-link {
          color: var(--text-secondary);
          text-decoration: none;
        }

        .footer-link:hover {
          color: var(--text-color);
        }

        .divider {
          margin: 0 var(--spacing-xs);
        }

        .copyright {
          color: var(--text-secondary);
        }

        @media (min-width: 768px) {
          main {
            padding-top: var(--spacing-xl);
          }
          
          h1 {
            font-size: 2.25rem;
          }
        }

        .actions {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .action-button {
          padding: 0.75rem 1rem;
          background-color: #2563eb;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        
        .action-button:hover:not(:disabled) {
          background-color: #1d4ed8;
        }
        
        .action-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .action-button.secondary {
          background-color: #4b5563;
        }
        
        .action-button.secondary:hover:not(:disabled) {
          background-color: #374151;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
        }
        
        th, td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        
        th {
          background-color: #f9fafb;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
} 
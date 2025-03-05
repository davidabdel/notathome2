import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../supabase/config';

export default function CheckTables() {
  const [congregations, setCongregations] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch congregations
        const { data: congregationsData, error: congregationsError } = await supabase
          .from('congregations')
          .select('*');
        
        if (congregationsError) {
          console.error('Error fetching congregations:', congregationsError);
          setError(`Error fetching congregations: ${congregationsError.message}`);
        } else {
          setCongregations(congregationsData || []);
        }
        
        // Fetch user roles
        const { data: userRolesData, error: userRolesError } = await supabase
          .from('user_roles')
          .select('*');
        
        if (userRolesError) {
          console.error('Error fetching user roles:', userRolesError);
          setError(`Error fetching user roles: ${userRolesError.message}`);
        } else {
          setUserRoles(userRolesData || []);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  return (
    <div className="container">
      <Head>
        <title>Check Database Tables - Not At Home</title>
        <meta name="description" content="Check database tables for Not At Home app" />
      </Head>

      <main>
        <div className="header">
          <Link href="/" className="back-link">← Back to home</Link>
          <h1>Database Tables</h1>
          <p className="description">View the contents of database tables</p>
        </div>

        {loading ? (
          <div className="loading">Loading data...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <div className="tables-container">
            <div className="table-section">
              <h2>Congregations Table</h2>
              {congregations.length === 0 ? (
                <p className="empty-message">No congregations found</p>
              ) : (
                <table className="data-table">
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
              )}
            </div>

            <div className="table-section">
              <h2>User Roles Table</h2>
              {userRoles.length === 0 ? (
                <p className="empty-message">No user roles found</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>User ID</th>
                      <th>Congregation ID</th>
                      <th>Role</th>
                      <th>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userRoles.map((role) => (
                      <tr key={role.id}>
                        <td>{role.id}</td>
                        <td>{role.user_id}</td>
                        <td>{role.congregation_id}</td>
                        <td>{role.role}</td>
                        <td>{new Date(role.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .container {
          min-height: 100vh;
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .header {
          margin-bottom: 2rem;
        }
        
        .back-link {
          display: inline-block;
          margin-bottom: 1rem;
          color: #2563eb;
          text-decoration: none;
        }
        
        .back-link:hover {
          text-decoration: underline;
        }
        
        h1 {
          margin: 0 0 0.5rem;
          font-size: 2rem;
          color: #111827;
        }
        
        .description {
          color: #4b5563;
          margin: 0;
        }
        
        .loading {
          padding: 2rem;
          text-align: center;
          color: #4b5563;
        }
        
        .error {
          padding: 1rem;
          background-color: #fee2e2;
          border-radius: 0.5rem;
          color: #ef4444;
          margin-bottom: 1rem;
        }
        
        .tables-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        
        .table-section {
          background-color: white;
          border-radius: 0.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 1.5rem;
          border: 1px solid #e5e7eb;
        }
        
        h2 {
          margin-top: 0;
          margin-bottom: 1rem;
          font-size: 1.5rem;
          color: #111827;
        }
        
        .empty-message {
          color: #6b7280;
          font-style: italic;
        }
        
        .data-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .data-table th,
        .data-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .data-table th {
          background-color: #f9fafb;
          font-weight: 600;
        }
        
        .data-table tr:last-child td {
          border-bottom: none;
        }
        
        @media (max-width: 768px) {
          .data-table {
            display: block;
            overflow-x: auto;
          }
        }
      `}</style>
    </div>
  );
} 
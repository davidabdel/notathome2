import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../../../supabase/config';

interface CongregationDetails {
  id: string;
  name: string;
  pin_code: string;
  status: string;
  created_at: string;
  admin_count: number;
  user_count: number;
  session_count: number;
}

export default function CongregationDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [congregation, setCongregation] = useState<CongregationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const checkAdminAndFetchDetails = async () => {
      if (!id) return;
      
      setLoading(true);
      setError('');
      
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
        
        // Fetch congregation details
        const { data: congregationData, error: congregationError } = await supabase
          .from('congregations')
          .select('*')
          .eq('id', id)
          .single();
        
        if (congregationError) {
          throw congregationError;
        }
        
        if (!congregationData) {
          setError('Congregation not found');
          setLoading(false);
          return;
        }
        
        // Get counts
        const { count: adminCount } = await supabase
          .from('user_roles')
          .select('id', { count: 'exact' })
          .eq('congregation_id', id)
          .eq('role', 'congregation_admin');
        
        const { count: userCount } = await supabase
          .from('user_roles')
          .select('id', { count: 'exact' })
          .eq('congregation_id', id);
        
        const { count: sessionCount } = await supabase
          .from('sessions')
          .select('id', { count: 'exact' })
          .eq('congregation_id', id);
        
        setCongregation({
          ...congregationData,
          admin_count: adminCount || 0,
          user_count: userCount || 0,
          session_count: sessionCount || 0
        });
      } catch (err) {
        console.error('Error fetching congregation details:', err);
        setError('Failed to load congregation details');
      } finally {
        setLoading(false);
      }
    };
    
    checkAdminAndFetchDetails();
  }, [id]);

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleConfirmDelete = async () => {
    if (!id || !congregation) return;
    
    setIsDeleting(true);
    setError('');
    
    try {
      // Get the current session for the auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session found');
      }
      
      // Call the API endpoint to delete the congregation
      const response = await fetch(`/api/admin/congregations/${id}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to delete congregation');
      }
      
      // Redirect back to the congregations list
      router.push('/admin/congregations');
    } catch (err) {
      console.error('Error deleting congregation:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete congregation. Please try again.');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container">
      <Head>
        <title>Congregation Details - Admin - Not At Home</title>
        <meta name="description" content="View congregation details" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <main>
        <div className="content-container">
          <div className="header">
            <Link href="/admin/congregations" className="back-link">← Back to Congregations</Link>
            <h1>Congregation Details</h1>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading congregation details...</p>
            </div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : !isAdmin ? (
            <div className="error-message">You do not have permission to access this page</div>
          ) : congregation ? (
            <div className="details-container">
              <div className="detail-section">
                <h2>Basic Information</h2>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Name</label>
                    <div>{congregation.name}</div>
                  </div>
                  <div className="detail-item">
                    <label>Status</label>
                    <div className={`status-badge ${congregation.status}`}>
                      {congregation.status.charAt(0).toUpperCase() + congregation.status.slice(1)}
                    </div>
                  </div>
                  <div className="detail-item">
                    <label>PIN Code</label>
                    <div>{congregation.pin_code}</div>
                  </div>
                  <div className="detail-item">
                    <label>Created</label>
                    <div>{congregation.created_at ? new Date(congregation.created_at).toLocaleString() : 'N/A'}</div>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h2>Statistics</h2>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{congregation.admin_count}</div>
                    <div className="stat-label">Administrators</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{congregation.user_count}</div>
                    <div className="stat-label">Total Users</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{congregation.session_count}</div>
                    <div className="stat-label">Sessions</div>
                  </div>
                </div>
              </div>

              <div className="detail-section danger-zone">
                <h2>Danger Zone</h2>
                <p className="danger-description">
                  Deleting a congregation will permanently remove all associated data, including user roles and sessions.
                  This action cannot be undone.
                </p>
                <button 
                  onClick={handleDeleteClick}
                  className="delete-button"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Congregation'}
                </button>
              </div>

              {showDeleteConfirm && (
                <div className="delete-confirmation-overlay">
                  <div className="delete-confirmation-modal">
                    <h3>Confirm Deletion</h3>
                    <p>Are you sure you want to delete <strong>{congregation.name}</strong>?</p>
                    <p>This will permanently remove all associated data and cannot be undone.</p>
                    <div className="confirmation-actions">
                      <button 
                        onClick={handleCancelDelete}
                        className="cancel-button"
                        disabled={isDeleting}
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleConfirmDelete}
                        className="confirm-delete-button"
                        disabled={isDeleting}
                      >
                        {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="error-message">Congregation not found</div>
          )}
        </div>
      </main>

      <style jsx>{`
        .container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: var(--background-color, #f9fafb);
        }

        main {
          flex: 1;
          padding: var(--spacing-md, 1.5rem);
        }

        .content-container {
          max-width: 1000px;
          margin: 0 auto;
        }

        .header {
          margin-bottom: var(--spacing-lg, 2rem);
        }

        .back-link {
          display: inline-block;
          margin-bottom: var(--spacing-sm, 1rem);
          color: var(--primary-color, #2563eb);
          text-decoration: none;
          font-size: 0.875rem;
        }

        .back-link:hover {
          text-decoration: underline;
        }

        h1 {
          margin: 0;
          font-size: 1.875rem;
          font-weight: 700;
          color: var(--text-color, #111827);
        }

        h2 {
          margin: 0 0 var(--spacing-md, 1.5rem);
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-color, #111827);
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-xl, 3rem) 0;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(37, 99, 235, 0.1);
          border-radius: 50%;
          border-top-color: var(--primary-color, #2563eb);
          animation: spin 1s linear infinite;
          margin-bottom: var(--spacing-md, 1.5rem);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-message {
          padding: var(--spacing-md, 1.5rem);
          background-color: rgba(239, 68, 68, 0.1);
          border-radius: 8px;
          color: var(--danger-color, #ef4444);
        }

        .details-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg, 2rem);
        }

        .detail-section {
          background-color: white;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 8px;
          padding: var(--spacing-lg, 2rem);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--spacing-md, 1.5rem);
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .detail-item label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary, #4b5563);
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .status-badge.active {
          background-color: rgba(16, 185, 129, 0.1);
          color: var(--success-color, #10b981);
        }

        .status-badge.pending {
          background-color: rgba(245, 158, 11, 0.1);
          color: var(--warning-color, #f59e0b);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: var(--spacing-md, 1.5rem);
        }

        .stat-card {
          padding: var(--spacing-md, 1.5rem);
          background-color: rgba(37, 99, 235, 0.05);
          border-radius: 8px;
          text-align: center;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: var(--primary-color, #2563eb);
          line-height: 1;
          margin-bottom: 0.5rem;
        }

        .stat-label {
          font-size: 0.875rem;
          color: var(--text-secondary, #4b5563);
        }

        .danger-zone {
          border-color: rgba(239, 68, 68, 0.3);
        }

        .danger-description {
          margin-bottom: var(--spacing-md, 1.5rem);
          color: var(--text-secondary, #4b5563);
        }

        .delete-button {
          padding: 0.75rem 1.5rem;
          background-color: var(--danger-color, #ef4444);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }

        .delete-button:hover:not(:disabled) {
          background-color: #dc2626;
        }

        .delete-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .delete-confirmation-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .delete-confirmation-modal {
          background-color: white;
          border-radius: 8px;
          padding: var(--spacing-lg, 2rem);
          max-width: 500px;
          width: 90%;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .delete-confirmation-modal h3 {
          margin-top: 0;
          margin-bottom: var(--spacing-md, 1.5rem);
          font-size: 1.25rem;
          color: var(--danger-color, #ef4444);
        }

        .confirmation-actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--spacing-sm, 1rem);
          margin-top: var(--spacing-lg, 2rem);
        }

        .cancel-button {
          padding: 0.75rem 1.5rem;
          background-color: var(--background-color, #f9fafb);
          color: var(--text-color, #111827);
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }

        .cancel-button:hover:not(:disabled) {
          background-color: #e5e7eb;
        }

        .confirm-delete-button {
          padding: 0.75rem 1.5rem;
          background-color: var(--danger-color, #ef4444);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }

        .confirm-delete-button:hover:not(:disabled) {
          background-color: #dc2626;
        }

        .confirm-delete-button:disabled,
        .cancel-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (min-width: 768px) {
          main {
            padding-top: var(--spacing-xl, 3rem);
          }
          
          h1 {
            font-size: 2.25rem;
          }
        }
      `}</style>
    </div>
  );
} 
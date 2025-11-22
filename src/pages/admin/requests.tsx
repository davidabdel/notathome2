import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../../supabase/config';
import AdminLayout from '../../components/layouts/AdminLayout';
import { Check, X, ArrowLeft, AlertCircle, Clock, Mail, Key } from 'lucide-react';

interface CongregationRequest {
  id: string;
  name: string;
  pin_code: string;
  contact_email: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<CongregationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | React.ReactNode>('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Check if user is admin and fetch requests
  useEffect(() => {
    const checkAdminAndFetchRequests = async () => {
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

        // Fetch congregation requests
        await fetchRequests();
      } catch (err) {
        console.error('Error checking admin status:', err);
        setError('Failed to verify admin status');
      } finally {
        setLoading(false);
      }
    };

    checkAdminAndFetchRequests();
  }, []);

  // Fetch congregation requests
  const fetchRequests = async () => {
    try {
      console.log('Fetching congregation requests...');

      // Use our server-side API endpoint to bypass RLS
      const response = await fetch('/api/admin/congregation-requests');

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${await response.text()}`);
      }

      const data = await response.json();

      console.log('Congregation requests data:', data);

      // Normalize status values to lowercase for consistent UI handling
      const normalizedData = data?.map((request: any) => ({
        ...request,
        status: request.status.toLowerCase()
      })) || [];

      setRequests(normalizedData);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError('Failed to load congregation requests');
    }
  };

  // Handle approving a request
  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    setError('');

    try {
      console.log(`Approving request ${requestId}...`);

      // Use our server-side API endpoint to approve the request
      const response = await fetch('/api/admin/congregation-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: requestId, action: 'approve' }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error: ${response.status} ${errorText}`);

        // Check if this is the contact_email column error
        if (errorText.includes('contact_email') && errorText.includes('column')) {
          setError(
            <div className="error-message-with-fix">
              <p>Failed to approve congregation request: Missing 'contact_email' column in database.</p>
              <div className="fix-options">
                <a href="/admin/fix-database" className="fix-link">Fix Database Schema</a>
                <button onClick={() => fixDatabaseDirectly(requestId)} className="direct-fix-button">
                  Fix Directly
                </button>
              </div>
            </div>
          );
        } else {
          throw new Error(`API error: ${response.status} ${errorText}`);
        }
        return;
      }

      // Refresh the requests list
      await fetchRequests();

      console.log(`Request ${requestId} approved successfully`);
    } catch (err) {
      console.error('Error approving request:', err);
      setError('Failed to approve congregation request');
    } finally {
      setProcessingId(null);
    }
  };

  // Direct fix function
  const fixDatabaseDirectly = async (requestId: string) => {
    setError('Fixing database schema...');

    try {
      // Call the direct SQL fix endpoint
      const fixResponse = await fetch('/api/admin/direct-sql-fix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!fixResponse.ok) {
        const fixData = await fixResponse.json();
        setError(`Failed to fix database: ${fixData.error || 'Unknown error'}`);
        return;
      }

      // If fix was successful, try approving the request again
      setError('Database fixed successfully. Approving request...');

      // Wait a moment for the schema cache to reload
      setTimeout(async () => {
        await handleApprove(requestId);
      }, 2000);
    } catch (err: any) {
      setError(`Error fixing database: ${err.message}`);
    }
  };

  // Handle rejecting a request
  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);

    try {
      console.log(`Rejecting request ${requestId}...`);

      // Use our server-side API endpoint to reject the request
      const response = await fetch('/api/admin/congregation-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: requestId, action: 'reject' }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${await response.text()}`);
      }

      // Refresh the requests list
      await fetchRequests();

      console.log(`Request ${requestId} rejected successfully`);
    } catch (err) {
      console.error('Error rejecting request:', err);
      setError('Failed to reject congregation request');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <AdminLayout>
      <Head>
        <title>Congregation Requests - Admin - Not At Home</title>
        <meta name="description" content="Manage congregation requests" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="content-container">
        <div className="header">
          <Link href="/admin" className="back-link">
            <ArrowLeft size={16} className="mr-2" />
            Admin Dashboard
          </Link>
          <h1 className="page-title">Congregation Requests</h1>
          <p className="description">Approve or reject congregation registration requests</p>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p className="loading-text">Loading requests...</p>
          </div>
        ) : error ? (
          <div className="error-alert">{error}</div>
        ) : !isAdmin ? (
          <div className="error-alert">You do not have permission to access this page</div>
        ) : (
          <div className="requests-container">
            {requests.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon-wrapper">
                  <AlertCircle size={32} />
                </div>
                <h3 className="empty-title">No Requests</h3>
                <p className="empty-description">No congregation requests found</p>
              </div>
            ) : (
              <div className="requests-list">
                {requests.map(request => (
                  <div key={request.id} className="request-card">
                    <div className="request-header">
                      <h2 className="request-title">{request.name}</h2>
                      <span className={`status-badge ${request.status}`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>

                    <div className="request-details">
                      <div className="detail-item">
                        <Mail size={16} className="detail-icon" />
                        <span className="label">Email:</span>
                        <span className="value">{request.contact_email}</span>
                      </div>
                      <div className="detail-item">
                        <Key size={16} className="detail-icon" />
                        <span className="label">PIN Code:</span>
                        <span className="value font-mono">{request.pin_code}</span>
                      </div>
                      <div className="detail-item">
                        <Clock size={16} className="detail-icon" />
                        <span className="label">Requested:</span>
                        <span className="value">{new Date(request.created_at).toLocaleString()}</span>
                      </div>
                    </div>

                    {request.status === 'pending' && (
                      <div className="request-actions">
                        <button
                          onClick={() => handleApprove(request.id)}
                          disabled={processingId === request.id}
                          className="btn btn-success"
                        >
                          {processingId === request.id ? (
                            <div className="spinner-sm"></div>
                          ) : (
                            <Check size={18} className="mr-2" />
                          )}
                          {processingId === request.id ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          disabled={processingId === request.id}
                          className="btn btn-danger"
                        >
                          {processingId === request.id ? (
                            <div className="spinner-sm"></div>
                          ) : (
                            <X size={18} className="mr-2" />
                          )}
                          {processingId === request.id ? 'Processing...' : 'Reject'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
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
        
        .back-link {
          display: inline-flex;
          align-items: center;
          color: var(--color-text-secondary);
          text-decoration: none;
          margin-bottom: var(--space-4);
          font-weight: 500;
          transition: color 0.2s;
        }
        
        .back-link:hover {
          color: var(--color-primary);
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
        
        .spinner-sm {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s linear infinite;
          margin-right: var(--space-2);
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
        
        .error-message-with-fix {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        
        .fix-options {
          display: flex;
          gap: var(--space-4);
          margin-top: var(--space-2);
        }
        
        .fix-link, .direct-fix-button {
          display: inline-flex;
          align-items: center;
          padding: var(--space-2) var(--space-4);
          border-radius: var(--radius-md);
          font-weight: 500;
          font-size: 0.875rem;
          transition: all 0.2s;
          text-decoration: none;
          border: none;
          cursor: pointer;
        }
        
        .fix-link {
          background-color: var(--color-error);
          color: white;
        }
        
        .fix-link:hover {
          background-color: #dc2626;
        }
        
        .direct-fix-button {
          background-color: var(--color-primary);
          color: white;
        }
        
        .direct-fix-button:hover {
          background-color: var(--color-primary-hover);
        }
        
        .requests-list {
          display: grid;
          gap: var(--space-6);
        }
        
        .request-card {
          background-color: var(--color-bg-card);
          border-radius: var(--radius-lg);
          padding: var(--space-6);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--color-border);
          transition: all 0.2s ease;
        }
        
        .request-card:hover {
          box-shadow: var(--shadow-md);
          border-color: var(--color-primary);
        }
        
        .request-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-4);
          border-bottom: 1px solid var(--color-border);
          padding-bottom: var(--space-4);
        }
        
        .request-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-text-main);
          margin: 0;
        }
        
        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .status-badge.pending {
          background-color: #fef3c7;
          color: #92400e;
          border: 1px solid #fcd34d;
        }
        
        .status-badge.approved {
          background-color: var(--color-success-bg);
          color: var(--color-success);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        
        .status-badge.rejected {
          background-color: var(--color-error-bg);
          color: var(--color-error);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        
        .request-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--space-4);
          margin-bottom: var(--space-6);
        }
        
        .detail-item {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        
        .detail-icon {
          color: var(--color-text-tertiary);
        }
        
        .label {
          font-weight: 500;
          color: var(--color-text-secondary);
          font-size: 0.875rem;
        }
        
        .value {
          color: var(--color-text-main);
          font-weight: 500;
        }
        
        .font-mono {
          font-family: monospace;
          letter-spacing: 0.05em;
        }
        
        .request-actions {
          display: flex;
          gap: var(--space-4);
          justify-content: flex-end;
          border-top: 1px solid var(--color-border);
          padding-top: var(--space-4);
        }
        
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-md);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          font-size: 0.875rem;
        }
        
        .btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .btn-success {
          background-color: var(--color-success);
          color: white;
        }
        
        .btn-success:hover:not(:disabled) {
          background-color: #059669;
        }
        
        .btn-danger {
          background-color: var(--color-error);
          color: white;
        }
        
        .btn-danger:hover:not(:disabled) {
          background-color: #dc2626;
        }
        
        .mr-2 { margin-right: var(--space-2); }
        
        .empty-state {
          background-color: var(--color-bg-card);
          border-radius: var(--radius-lg);
          padding: var(--space-12);
          text-align: center;
          color: var(--color-text-secondary);
          border: 1px dashed var(--color-border);
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .empty-icon-wrapper {
          width: 64px;
          height: 64px;
          background-color: var(--color-bg-input);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: var(--space-4);
          color: var(--color-text-tertiary);
        }
        
        .empty-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-text-main);
          margin: 0 0 var(--space-2) 0;
        }
        
        .empty-description {
          margin: 0;
          color: var(--color-text-secondary);
        }
      `}</style>
    </AdminLayout>
  );
}
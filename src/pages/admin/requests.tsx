import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../../supabase/config';
import AdminLayout from '../../components/layouts/AdminLayout';
import { FaCheck, FaTimes } from 'react-icons/fa';

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
          <Link href="/admin" className="back-link">← Admin Dashboard</Link>
          <h1>Congregation Requests</h1>
          <p className="description">Approve or reject congregation registration requests</p>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading requests...</p>
          </div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : !isAdmin ? (
          <div className="error-message">You do not have permission to access this page</div>
        ) : (
          <div className="requests-container">
            {requests.length === 0 ? (
              <div className="empty-state">
                <p>No congregation requests found</p>
              </div>
            ) : (
              <div className="requests-list">
                {requests.map(request => (
                  <div key={request.id} className="request-card">
                    <div className="request-header">
                      <h2>{request.name}</h2>
                      <span className={`status-badge ${request.status}`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>
                    
                    <div className="request-details">
                      <div className="detail-item">
                        <span className="label">Email:</span>
                        <span className="value">{request.contact_email}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">PIN Code:</span>
                        <span className="value">{request.pin_code}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Requested:</span>
                        <span className="value">{new Date(request.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                    
                    {request.status === 'pending' && (
                      <div className="request-actions">
                        <button 
                          onClick={() => handleApprove(request.id)}
                          disabled={processingId === request.id}
                          className="approve-button"
                        >
                          <FaCheck className="icon" />
                          {processingId === request.id ? 'Processing...' : 'Approve'}
                        </button>
                        <button 
                          onClick={() => handleReject(request.id)}
                          disabled={processingId === request.id}
                          className="reject-button"
                        >
                          <FaTimes className="icon" />
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
        .error-message-with-fix {
          background-color: #fee2e2;
          color: #b91c1c;
          padding: 1rem;
          border-radius: 0.375rem;
          margin-bottom: 1.5rem;
        }
        
        .fix-options {
          display: flex;
          gap: 1rem;
          margin-top: 0.5rem;
        }
        
        .fix-link {
          display: inline-block;
          padding: 0.5rem 1rem;
          background-color: #ef4444;
          color: white;
          border-radius: 0.25rem;
          text-decoration: none;
          font-weight: 500;
          transition: background-color 0.2s;
        }
        
        .fix-link:hover {
          background-color: #dc2626;
        }
        
        .direct-fix-button {
          padding: 0.5rem 1rem;
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.25rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .direct-fix-button:hover {
          background-color: #2563eb;
        }
      `}</style>
    </AdminLayout>
  );
} 
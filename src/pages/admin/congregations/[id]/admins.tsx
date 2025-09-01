import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../../../../supabase/config';
import AdminLayout from '../../../../components/layouts/AdminLayout';
import { FaUserPlus, FaKey, FaArrowLeft, FaTrash, FaEnvelope } from 'react-icons/fa';

interface CongregationAdmin {
  id: string;
  email: string;
  created_at: string;
  last_sign_in: string | null;
}

interface Congregation {
  id: string;
  name: string;
  pin_code: string;
}

export default function ManageCongregationAdminsPage() {
  const router = useRouter();
  const { id } = router.query;

  const [congregation, setCongregation] = useState<Congregation | null>(null);
  const [admins, setAdmins] = useState<CongregationAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [addError, setAddError] = useState('');
  
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetAdminId, setResetAdminId] = useState('');
  const [resetAdminEmail, setResetAdminEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState('');

  // Check if user is admin and fetch data
  useEffect(() => {
    if (!id) return;
    
    const checkAdminAndFetchData = async () => {
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
        
        // Fetch congregation details
        const { data: congregationData, error: congregationError } = await supabase
          .from('congregations')
          .select('*')
          .eq('id', id)
          .single();
          
        if (congregationError) {
          console.error('Error fetching congregation:', congregationError);
          setError('Congregation not found');
          setLoading(false);
          return;
        }
        
        setCongregation(congregationData);
        
        // Fetch congregation admins
        await fetchCongregationAdmins();
      } catch (err) {
        console.error('Error checking admin status:', err);
        setError('Failed to verify admin status');
      } finally {
        setLoading(false);
      }
    };
    
    checkAdminAndFetchData();
  }, [id]);

  // Fetch congregation admins
  const fetchCongregationAdmins = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }
      
      // Fetch users with congregation_admin role for this congregation
      const response = await fetch(`/api/admin/congregations/${id}/admins`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to fetch congregation admins';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          console.error('Error parsing error response:', jsonError);
          errorMessage = `${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      setAdmins(data.admins || []);
    } catch (err) {
      console.error('Error fetching congregation admins:', err);
      setError(err instanceof Error ? err.message : 'Failed to load congregation admins');
    }
  };

  // Handle adding a new admin
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newAdminEmail.trim()) {
      setAddError('Email is required');
      return;
    }
    
    setIsAddingAdmin(true);
    setAddError('');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }
      
      // Add new admin via API
      const response = await fetch(`/api/admin/congregations/${id}/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email: newAdminEmail
        })
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to add congregation admin';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          console.error('Error parsing error response:', jsonError);
          errorMessage = `${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      // Refresh admin list
      await fetchCongregationAdmins();
      
      // Close modal and reset state
      setIsAddModalOpen(false);
      setNewAdminEmail('');
      setSuccess('Invitation sent to the new congregation admin');
    } catch (err) {
      console.error('Error adding congregation admin:', err);
      setAddError(err instanceof Error ? err.message : 'Failed to add congregation admin');
    } finally {
      setIsAddingAdmin(false);
    }
  };

  // Open reset password modal
  const openResetModal = (adminId: string, adminEmail: string) => {
    setResetAdminId(adminId);
    setResetAdminEmail(adminEmail);
    setResetError('');
    setIsResetModalOpen(true);
  };

  // Handle resetting admin password
  const handleResetPassword = async () => {
    if (!resetAdminId) return;
    
    setIsResetting(true);
    setResetError('');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }
      
      // Reset password via API
      const response = await fetch(`/api/admin/users/${resetAdminId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to reset password';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          console.error('Error parsing error response:', jsonError);
          errorMessage = `${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      // Close modal and show success message
      setIsResetModalOpen(false);
      setSuccess(`Password reset email sent to ${resetAdminEmail}`);
    } catch (err) {
      console.error('Error resetting password:', err);
      setResetError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsResetting(false);
    }
  };

  // Handle removing an admin
  const handleRemoveAdmin = async (adminId: string) => {
    if (!window.confirm('Are you sure you want to remove this administrator?')) {
      return;
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }
      
      // Remove admin via API
      const response = await fetch(`/api/admin/congregations/${id}/admins`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ adminId })
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to remove congregation admin';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          console.error('Error parsing error response:', jsonError);
          errorMessage = `${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      // Refresh admin list
      await fetchCongregationAdmins();
      setSuccess('Administrator removed successfully');
    } catch (err) {
      console.error('Error removing congregation admin:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove congregation admin');
    }
  };

  return (
    <AdminLayout>
      <Head>
        <title>{congregation ? `Manage ${congregation.name} Administrators` : 'Manage Congregation Administrators'} - Not At Home</title>
        <meta name="description" content="Manage congregation administrators" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="content-container">
        <div className="header">
          <Link href="/admin/congregations" className="back-link">
            <FaArrowLeft /> Back to Congregations
          </Link>
          <h1>{congregation ? `Manage ${congregation.name} Administrators` : 'Manage Congregation Administrators'}</h1>
          <p className="description">View and manage administrators for this congregation</p>
        </div>

        {success && <div className="success-message">{success}</div>}
        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading administrators...</p>
          </div>
        ) : !isAdmin ? (
          <div className="error-message">You do not have permission to access this page</div>
        ) : (
          <>
            <div className="actions-bar">
              <button 
                className="form-button"
                onClick={() => setIsAddModalOpen(true)}
              >
                <FaUserPlus className="icon-left" /> Add New Administrator
              </button>
            </div>
            
            <div className="table-container">
              {admins.length === 0 ? (
                <div className="empty-state">
                  <FaUserPlus className="empty-icon" />
                  <p>No administrators found</p>
                  <p className="empty-description">Add administrators to help manage this congregation</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Added</th>
                      <th>Last Sign In</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map(admin => (
                      <tr key={admin.id}>
                        <td>{admin.email}</td>
                        <td>{new Date(admin.created_at).toLocaleDateString()}</td>
                        <td>
                          {admin.last_sign_in 
                            ? new Date(admin.last_sign_in).toLocaleString() 
                            : 'Never'}
                        </td>
                        <td>
                          <div className="table-actions">
                            <button 
                              onClick={() => openResetModal(admin.id, admin.email)}
                              className="action-button"
                              title="Reset password"
                            >
                              <FaKey />
                            </button>
                            <button 
                              onClick={() => handleRemoveAdmin(admin.id)}
                              className="delete-button"
                              title="Remove administrator"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {/* Add Admin Modal */}
      {isAddModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-container">
            <div className="modal-header">
              <h2>Add New Administrator</h2>
              <button className="close-button" onClick={() => setIsAddModalOpen(false)}>×</button>
            </div>
            <div className="modal-content">
              <form onSubmit={handleAddAdmin}>
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="Enter email address"
                    required
                  />
                </div>
                
                {addError && <div className="error-message">{addError}</div>}
                
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="cancel-button"
                    onClick={() => setIsAddModalOpen(false)}
                    disabled={isAddingAdmin}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="form-button"
                    disabled={isAddingAdmin}
                  >
                    {isAddingAdmin ? 'Sending Invitation...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-container">
            <div className="modal-header">
              <h2>Reset Administrator Password</h2>
              <button className="close-button" onClick={() => setIsResetModalOpen(false)}>×</button>
            </div>
            <div className="modal-content">
              <p>Send a password reset email to <strong>{resetAdminEmail}</strong>?</p>
              
              {resetError && <div className="error-message">{resetError}</div>}
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => setIsResetModalOpen(false)}
                  disabled={isResetting}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="form-button"
                  onClick={handleResetPassword}
                  disabled={isResetting}
                >
                  {isResetting ? 'Sending Reset Email...' : 'Send Reset Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .back-link {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          color: #4f46e5;
          text-decoration: none;
          font-weight: 500;
        }
        .back-link:hover {
          text-decoration: underline;
        }
        .action-button {
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 8px;
          cursor: pointer;
          margin-right: 8px;
        }
        .action-button:hover {
          background: #4338ca;
        }
        .delete-button {
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 8px;
          cursor: pointer;
        }
        .delete-button:hover {
          background: #dc2626;
        }
        .table-actions {
          display: flex;
          justify-content: center;
        }
        .empty-state {
          text-align: center;
          padding: 3rem;
          color: #6b7280;
        }
        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          color: #9ca3af;
        }
        .empty-description {
          margin-top: 0.5rem;
          font-size: 0.875rem;
        }
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 100;
        }
        .modal-container {
          background: white;
          border-radius: 8px;
          width: 100%;
          max-width: 500px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
        }
        .close-button {
          background: transparent;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6b7280;
        }
        .modal-content {
          padding: 1rem;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        .form-group input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
        }
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 1rem;
        }
        .cancel-button {
          padding: 0.5rem 1rem;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          cursor: pointer;
        }
        .form-button {
          padding: 0.5rem 1rem;
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .form-button:hover {
          background: #4338ca;
        }
        .form-button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }
        .icon-left {
          margin-right: 0.5rem;
        }
        .success-message {
          background-color: #dcfce7;
          color: #166534;
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }
        .error-message {
          background-color: #fee2e2;
          color: #b91c1c;
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }
      `}</style>
    </AdminLayout>
  );
} 
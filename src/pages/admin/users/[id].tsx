import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../../../supabase/config';

interface UserDetails {
  id: string;
  email: string;
  roles: string[];
  congregation_name: string;
  congregation_id: string | null;
  created_at: string;
  last_sign_in: string | null;
}

export default function UserDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<UserDetails | null>(null);
  const [availableRoles, setAvailableRoles] = useState(['admin', 'congregation_admin', 'user']);
  const [availableCongregations, setAvailableCongregations] = useState<{id: string, name: string}[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedCongregation, setSelectedCongregation] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const checkAdminAndFetchUser = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        // Check if current user is admin
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          setError('You must be logged in to view this page');
          setLoading(false);
          return;
        }

        // Check if user is admin
        const { data: userRoles, error: userRolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .single();
        
        if (userRolesError || !userRoles) {
          setError('You do not have permission to access this page');
          setLoading(false);
          return;
        }
        
        setIsAdmin(true);

        // Fetch user details from API
        const response = await fetch(`/api/admin/users/${id}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch user details');
        }

        const data = await response.json();
        setUser(data.user);
        setSelectedRoles(data.user.roles || []);
        setSelectedCongregation(data.user.congregation_id);

        // Fetch available congregations
        const { data: congregations, error: congregationsError } = await supabase
          .from('congregations')
          .select('id, name');
        
        if (congregationsError) {
          console.error('Error fetching congregations:', congregationsError);
        } else {
          setAvailableCongregations(congregations || []);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching user details:', err);
        setError('Failed to load user details');
        setLoading(false);
      }
    };

    checkAdminAndFetchUser();
  }, [id]);

  const handleRoleToggle = (role: string) => {
    setSelectedRoles(prev => {
      if (prev.includes(role)) {
        return prev.filter(r => r !== role);
      } else {
        return [...prev, role];
      }
    });
  };

  const handleCongregationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCongregation(e.target.value === 'none' ? null : e.target.value);
  };

  const handleSaveChanges = async () => {
    if (!user) return;
    
    try {
      setIsSaving(true);
      setSaveMessage('');
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('You must be logged in to save changes');
        setIsSaving(false);
        return;
      }
      
      const response = await fetch(`/api/admin/users/${id}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          roles: selectedRoles,
          congregation_id: selectedCongregation
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save changes');
      }
      
      setSaveMessage('Changes saved successfully');
      
      // Update local user data
      setUser(prev => {
        if (!prev) return null;
        
        const congregationName = selectedCongregation 
          ? availableCongregations.find(c => c.id === selectedCongregation)?.name || 'Unknown'
          : 'N/A';
          
        return {
          ...prev,
          roles: selectedRoles,
          congregation_id: selectedCongregation,
          congregation_name: congregationName
        };
      });
    } catch (err) {
      console.error('Error saving changes:', err);
      setError(`Failed to save changes: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user) return;
    
    if (!confirm(`Are you sure you want to reset the password for ${user.email}?`)) {
      return;
    }
    
    try {
      setIsSaving(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('You must be logged in to reset password');
        setIsSaving(false);
        return;
      }
      
      const response = await fetch(`/api/admin/users/${id}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset password');
      }
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Password reset email sent to ${user.email}`);
      }
    } catch (err) {
      console.error('Error resetting password:', err);
      setError(`Failed to reset password: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!user) return;
    
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete the user ${user.email}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setIsDeleting(true);
      setError('');
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('You must be logged in to delete a user');
        setIsDeleting(false);
        return;
      }
      
      const response = await fetch(`/api/admin/users/${id}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }
      
      // Redirect to users list
      router.push('/admin/users');
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(`Failed to delete user: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsDeleting(false);
    }
  };

  return (
    <div className="container">
      <Head>
        <title>User Details - Admin - Not At Home</title>
        <meta name="description" content="User management" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <main>
        <div className="content-container">
          <div className="header">
            <Link href="/admin/users" className="back-link">← Back to Users</Link>
            <h1>User Details</h1>
            {user && <p className="description">{user.email}</p>}
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading user details...</p>
            </div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : !isAdmin ? (
            <div className="error-message">You do not have permission to access this page</div>
          ) : !user ? (
            <div className="error-message">User not found</div>
          ) : (
            <div className="user-details-container">
              <div className="user-info-section">
                <h2>User Information</h2>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">User ID:</span>
                    <span className="info-value">{user.id}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Email:</span>
                    <span className="info-value">{user.email}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Created:</span>
                    <span className="info-value">
                      {new Date(user.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Last Sign In:</span>
                    <span className="info-value">
                      {user.last_sign_in 
                        ? new Date(user.last_sign_in).toLocaleString() 
                        : 'Never'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="user-roles-section">
                <h2>User Roles</h2>
                <div className="roles-container">
                  {availableRoles.map(role => (
                    <div key={role} className="role-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={selectedRoles.includes(role)}
                          onChange={() => handleRoleToggle(role)}
                        />
                        {role.replace('_', ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="user-congregation-section">
                <h2>Congregation</h2>
                <div className="congregation-selector">
                  <select 
                    value={selectedCongregation || 'none'} 
                    onChange={handleCongregationChange}
                  >
                    <option value="none">No Congregation</option>
                    {availableCongregations.map(congregation => (
                      <option key={congregation.id} value={congregation.id}>
                        {congregation.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="actions-section">
                <h2>Actions</h2>
                <div className="action-buttons">
                  <button 
                    className="reset-password-button"
                    onClick={handleResetPassword}
                    disabled={isSaving || isDeleting}
                  >
                    Reset Password
                  </button>
                  <button 
                    className="delete-button"
                    onClick={handleDeleteUser}
                    disabled={isSaving || isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete User'}
                  </button>
                </div>
              </div>

              {saveMessage && (
                <div className="save-message success-message">{saveMessage}</div>
              )}

              <div className="button-container">
                <button 
                  className="save-button"
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
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
          max-width: 800px;
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
          margin: 0 0 var(--spacing-xs, 0.5rem);
          font-size: 1.875rem;
          font-weight: 700;
          color: var(--text-color, #111827);
        }

        h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-color, #111827);
          margin-bottom: var(--spacing-md, 1.5rem);
        }

        .description {
          margin: 0;
          color: var(--text-secondary, #4b5563);
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

        .success-message {
          padding: var(--spacing-md, 1.5rem);
          background-color: rgba(34, 197, 94, 0.1);
          border-radius: 8px;
          color: var(--success-color, #22c55e);
          margin-bottom: var(--spacing-md, 1.5rem);
        }

        .user-details-container {
          background-color: white;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 8px;
          padding: var(--spacing-lg, 2rem);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .user-info-section,
        .user-roles-section,
        .user-congregation-section,
        .actions-section {
          margin-bottom: var(--spacing-xl, 3rem);
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: var(--spacing-md, 1.5rem);
        }

        .info-item {
          display: flex;
          flex-direction: column;
        }

        .info-label {
          font-size: 0.875rem;
          color: var(--text-secondary, #4b5563);
          margin-bottom: var(--spacing-xs, 0.5rem);
        }

        .info-value {
          font-size: 1rem;
          color: var(--text-color, #111827);
        }

        .roles-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: var(--spacing-md, 1.5rem);
        }

        .role-item {
          display: flex;
          align-items: center;
        }

        .role-item label {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm, 1rem);
          font-size: 0.875rem;
          color: var(--text-color, #111827);
          cursor: pointer;
        }

        .role-item input[type="checkbox"] {
          width: 1rem;
          height: 1rem;
        }

        .congregation-selector select {
          width: 100%;
          max-width: 400px;
          padding: 0.5rem;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 4px;
          font-size: 0.875rem;
        }

        .action-buttons {
          display: flex;
          gap: var(--spacing-md, 1.5rem);
        }

        .reset-password-button {
          padding: 0.5rem 1rem;
          background-color: var(--warning-color, #f59e0b);
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }

        .reset-password-button:hover {
          background-color: var(--warning-hover, #d97706);
        }

        .delete-button {
          padding: 0.5rem 1rem;
          background-color: var(--danger-color, #ef4444);
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }

        .delete-button:hover {
          background-color: var(--danger-hover, #dc2626);
        }

        .delete-button:disabled,
        .reset-password-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .button-container {
          margin-top: var(--spacing-xl, 3rem);
          display: flex;
          justify-content: flex-end;
        }

        .save-button {
          padding: 0.75rem 1.5rem;
          background-color: var(--primary-color, #2563eb);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }

        .save-button:hover {
          background-color: var(--primary-hover, #1d4ed8);
        }

        .save-button:disabled {
          background-color: var(--disabled-color, #9ca3af);
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .info-grid {
            grid-template-columns: 1fr;
          }

          .roles-container {
            grid-template-columns: 1fr;
          }

          .user-details-container {
            padding: var(--spacing-md, 1.5rem);
          }
        }
      `}</style>
    </div>
  );
} 
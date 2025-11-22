import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../../supabase/config';
import AdminLayout from '../../components/layouts/AdminLayout';
import { Edit, Trash2, UserPlus, Users, Search, AlertCircle } from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: string;
  congregation: string;
  last_sign_in: string;
}

export default function ManageUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Check if user is admin and fetch users
  useEffect(() => {
    const checkAdminAndFetchUsers = async () => {
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

        // Fetch users
        await fetchUsers();
      } catch (err) {
        console.error('Error checking admin status:', err);
        setError('Failed to verify admin status');
      } finally {
        setLoading(false);
      }
    };

    checkAdminAndFetchUsers();
  }, []);

  // Fetch users
  const fetchUsers = async () => {
    try {
      console.log('Fetching users from API...');

      const response = await fetch('/api/admin/users');

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Users data from API:', data.users?.length || 0);

      if (data.users) {
        // Transform the data to match our User interface
        const formattedUsers: User[] = data.users.map((user: any) => ({
          id: user.id,
          email: user.email || 'No Email',
          role: user.role || 'user',
          congregation: user.congregation_name || 'None',
          last_sign_in: user.last_sign_in || 'Never'
        }));

        setUsers(formattedUsers);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Handle editing a user
  const handleEdit = (id: string) => {
    console.log(`Edit user ${id}`);
    // Implement edit functionality or navigation to edit page
  };

  // Handle deleting a user
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      console.log(`Deleting user ${id}...`);

      // Use the API endpoint to delete the user
      const response = await fetch(`/api/admin/users?userId=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed with status: ${response.status}`);
      }

      // Refresh the users list
      await fetchUsers();

      console.log(`User ${id} deleted successfully`);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user');
    }
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.congregation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <Head>
        <title>Manage Users - Admin - Not At Home</title>
        <meta name="description" content="Manage users" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="content-container">
        <div className="header">
          <h1 className="page-title">Manage Users</h1>
          <p className="description">View and manage user accounts and permissions</p>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p className="loading-text">Loading users...</p>
          </div>
        ) : error ? (
          <div className="error-alert">{error}</div>
        ) : !isAdmin ? (
          <div className="error-alert">You do not have permission to access this page</div>
        ) : (
          <>
            <div className="actions-bar">
              <div className="search-wrapper">
                <Search className="search-icon" size={18} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              <Link href="/admin/users/new" className="btn btn-primary">
                <UserPlus size={18} className="mr-2" /> Add New User
              </Link>
            </div>

            <div className="table-container">
              {filteredUsers.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon-wrapper">
                    <Users size={32} />
                  </div>
                  <h3 className="empty-title">No Users Found</h3>
                  <p className="empty-description">
                    {searchTerm ? 'No users match your search' : 'Get started by adding a new user'}
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Congregation</th>
                        <th>Last Sign In</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(user => (
                        <tr key={user.id}>
                          <td className="font-medium">{user.email}</td>
                          <td>
                            <span className={`role-badge ${user.role}`}>
                              {user.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          </td>
                          <td>{user.congregation}</td>
                          <td className="text-secondary">
                            {typeof user.last_sign_in === 'string' ?
                              (user.last_sign_in === 'Never' ? 'Never' : new Date(user.last_sign_in).toLocaleDateString()) :
                              'Unknown'}
                          </td>
                          <td>
                            <div className="table-actions">
                              <button
                                onClick={() => handleEdit(user.id)}
                                className="action-btn btn-icon"
                                title="Edit user"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleDelete(user.id)}
                                className="action-btn btn-icon delete"
                                title="Delete user"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
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
        
        .actions-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-6);
          flex-wrap: wrap;
          gap: var(--space-4);
        }
        
        .search-wrapper {
          position: relative;
          flex: 1;
          max-width: 400px;
        }
        
        .search-icon {
          position: absolute;
          left: var(--space-3);
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-text-tertiary);
          pointer-events: none;
        }
        
        .search-input {
          width: 100%;
          padding: var(--space-2) var(--space-4) var(--space-2) var(--space-10);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 0.95rem;
          transition: all 0.2s;
        }
        
        .search-input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px var(--color-primary-light);
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
          font-size: 0.95rem;
          text-decoration: none;
        }
        
        .btn-primary {
          background-color: var(--color-primary);
          color: white;
        }
        
        .btn-primary:hover:not(:disabled) {
          background-color: var(--color-primary-hover);
        }
        
        .mr-2 { margin-right: var(--space-2); }
        
        .table-container {
          background-color: var(--color-bg-card);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          overflow: hidden;
          box-shadow: var(--shadow-sm);
        }
        
        .table-responsive {
          overflow-x: auto;
        }
        
        .data-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .data-table th {
          text-align: left;
          padding: var(--space-4) var(--space-6);
          background-color: var(--color-bg-input);
          color: var(--color-text-secondary);
          font-weight: 600;
          font-size: 0.875rem;
          border-bottom: 1px solid var(--color-border);
        }
        
        .data-table td {
          padding: var(--space-4) var(--space-6);
          border-bottom: 1px solid var(--color-border);
          color: var(--color-text-main);
        }
        
        .data-table tr:last-child td {
          border-bottom: none;
        }
        
        .font-medium { font-weight: 500; }
        .text-secondary { color: var(--color-text-secondary); font-size: 0.875rem; }
        
        .role-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background-color: var(--color-bg-input);
          color: var(--color-text-secondary);
          border: 1px solid var(--color-border);
        }
        
        .role-badge.admin {
          background-color: #eff6ff;
          color: #1d4ed8;
          border-color: #bfdbfe;
        }
        
        .role-badge.congregation_admin {
          background-color: #f0fdf4;
          color: #15803d;
          border-color: #bbf7d0;
        }
        
        .table-actions {
          display: flex;
          gap: var(--space-2);
        }
        
        .action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          background-color: transparent;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .action-btn:hover {
          background-color: var(--color-bg-input);
          color: var(--color-primary);
          border-color: var(--color-border);
        }
        
        .action-btn.delete:hover {
          background-color: var(--color-error-bg);
          color: var(--color-error);
          border-color: rgba(239, 68, 68, 0.2);
        }
        
        .empty-state {
          padding: var(--space-12);
          text-align: center;
          color: var(--color-text-secondary);
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
        
        @media (max-width: 640px) {
          .actions-bar {
            flex-direction: column;
            align-items: stretch;
          }
          
          .search-wrapper {
            max-width: none;
          }
        }
      `}</style>
    </AdminLayout>
  );
}
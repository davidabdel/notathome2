import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../../supabase/config';
import AdminLayout from '../../components/layouts/AdminLayout';
import { FaEdit, FaTrash, FaUserPlus, FaUsers } from 'react-icons/fa';

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

  return (
    <AdminLayout>
      <Head>
        <title>Manage Users - Admin - Not At Home</title>
        <meta name="description" content="Manage users" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="content-container">
        <div className="header">
          <h1>Manage Users</h1>
          <p className="description">View and manage user accounts and permissions</p>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading users...</p>
          </div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : !isAdmin ? (
          <div className="error-message">You do not have permission to access this page</div>
        ) : (
          <>
            <div className="actions-bar">
              <Link href="/admin/users/new" className="form-button">
                <FaUserPlus className="icon-left" /> Add New User
              </Link>
            </div>
            
            <div className="table-container">
              {users.length === 0 ? (
                <div className="empty-state">
                  <FaUsers className="empty-icon" />
                  <p>No users found</p>
                  <p className="empty-description">Get started by adding a new user</p>
                </div>
              ) : (
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
                    {users.map(user => (
                      <tr key={user.id}>
                        <td>{user.email}</td>
                        <td>
                          <span className="role-badge">
                            {user.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </td>
                        <td>{user.congregation}</td>
                        <td>{typeof user.last_sign_in === 'string' ? 
                          (user.last_sign_in === 'Never' ? 'Never' : new Date(user.last_sign_in).toLocaleString()) : 
                          'Unknown'}</td>
                        <td>
                          <div className="table-actions">
                            <button 
                              onClick={() => handleEdit(user.id)}
                              className="edit-button"
                              title="Edit user"
                            >
                              <FaEdit />
                            </button>
                            <button 
                              onClick={() => handleDelete(user.id)}
                              className="delete-button"
                              title="Delete user"
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
    </AdminLayout>
  );
} 
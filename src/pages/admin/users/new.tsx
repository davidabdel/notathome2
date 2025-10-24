import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../../../supabase/config';
import AdminLayout from '../../../components/layouts/AdminLayout';
import { FaSave, FaTimes, FaUserPlus } from 'react-icons/fa';

export default function NewUserPage() {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [congregationId, setCongregationId] = useState<string | null>(null);
  
  const [availableRoles] = useState(['admin', 'congregation_admin', 'user']);
  const [availableCongregations, setAvailableCongregations] = useState<{id: string, name: string}[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [requirePasswordReset, setRequirePasswordReset] = useState(true);

  useEffect(() => {
    const checkAdminAndFetchData = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setError('You must be logged in to view this page');
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
          return;
        }
        
        setIsAdmin(true);
        
        // Fetch available congregations
        const { data: congregations, error: congregationsError } = await supabase
          .from('congregations')
          .select('id, name')
          .order('name');
        
        if (congregationsError) {
          console.error('Error fetching congregations:', congregationsError);
          setError('Failed to load congregations');
          return;
        }
        
        setAvailableCongregations(congregations || []);
      } catch (err) {
        console.error('Error checking admin status:', err);
        setError('Failed to verify permissions');
      }
    };
    
    checkAdminAndFetchData();
  }, []);

  const handleRoleToggle = (role: string) => {
    setRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role) 
        : [...prev, role]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    
    if (!password.trim()) {
      setError('Password is required');
      return;
    }
    
    if (roles.length === 0) {
      setError('At least one role must be selected');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Use server-side admin API with service role via bearer token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          roles,
          congregationId,
          require_password_reset: requirePasswordReset,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      const userId = data.userId;
      setSuccess('User created successfully');

      // Redirect to the user details page
      setTimeout(() => {
        router.push(`/admin/users/${userId}`);
      }, 1500);
    } catch (err) {
      console.error('Error creating user:', err);
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <Head>
        <title>Add New User - Admin - Not At Home</title>
        <meta name="description" content="Add a new user" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="content-container">
        <div className="header">
          <Link href="/admin/users" className="back-link">← Back to Users</Link>
          <h1>Add New User</h1>
          <p className="description">Create a new user account</p>
        </div>

        {success && <div className="success-message">{success}</div>}
        {error && <div className="error-message">{error}</div>}

        {!isAdmin ? (
          <div className="error-message">You do not have permission to access this page</div>
        ) : (
          <form onSubmit={handleSubmit} className="form-container">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter user email"
                disabled={loading}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                disabled={loading}
                required
              />
              <p className="form-help">Temporary password for the user's first login</p>
            </div>
            
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="require-reset"
                checked={requirePasswordReset}
                onChange={(e) => setRequirePasswordReset(e.target.checked)}
                disabled={loading}
              />
              <label htmlFor="require-reset">Require password reset on first login</label>
            </div>
            
            <div className="form-group">
              <label>User Roles</label>
              <div className="checkbox-group">
                {availableRoles.map(role => (
                  <div key={role} className="checkbox-item">
                    <input
                      type="checkbox"
                      id={`role-${role}`}
                      checked={roles.includes(role)}
                      onChange={() => handleRoleToggle(role)}
                      disabled={loading}
                    />
                    <label htmlFor={`role-${role}`}>
                      {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {(roles.includes('congregation_admin') || roles.includes('user')) && (
              <div className="form-group">
                <label htmlFor="congregation">Congregation</label>
                <select
                  id="congregation"
                  value={congregationId || ''}
                  onChange={(e) => setCongregationId(e.target.value || null)}
                  disabled={loading}
                  required={roles.includes('congregation_admin') || roles.includes('user')}
                >
                  <option value="">Select a congregation</option>
                  {availableCongregations.map(cong => (
                    <option key={cong.id} value={cong.id}>{cong.name}</option>
                  ))}
                </select>
                <p className="form-help">Required for Congregation Admin and User roles</p>
              </div>
            )}
            
            <div className="form-actions">
              <Link href="/admin/users" className="form-button secondary">
                <FaTimes className="icon-left" /> Cancel
              </Link>
              <button type="submit" className="form-button primary" disabled={loading}>
                <FaUserPlus className="icon-left" /> {loading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
} 
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase/config';

export default function AuthCheck() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get current user
        const { data: { user: currentUser }, error: userError } = await (supabase.auth as any).getUser();
        
        if (userError) {
          throw userError;
        }
        
        setUser(currentUser);
        
        if (currentUser) {
          // Check user roles
          const { data: userRoles, error: rolesError } = await (supabase as any)
            .from('user_roles')
            .select('role')
            .eq('user_id', currentUser.id);
          
          if (rolesError) {
            throw rolesError;
          }
          
          if (userRoles) {
            setRoles(userRoles.map((r: any) => r.role));
          }
        }
      } catch (err) {
        console.error('Auth check error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await (supabase.auth as any).signOut();
      if (error) throw error;
      window.location.href = '/';
    } catch (err) {
      console.error('Sign out error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Authentication Status Check</h1>
      
      {loading ? (
        <p>Checking authentication status...</p>
      ) : error ? (
        <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '0.375rem' }}>
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      ) : user ? (
        <div>
          <div style={{ padding: '1rem', backgroundColor: '#ecfdf5', color: '#065f46', borderRadius: '0.375rem', marginBottom: '1rem' }}>
            <h2>Authenticated</h2>
            <p><strong>User ID:</strong> {user.id}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Roles:</strong> {roles.length > 0 ? roles.join(', ') : 'No roles assigned'}</p>
          </div>
          
          <div style={{ marginTop: '2rem' }}>
            <h2>Debug Actions</h2>
            <button 
              onClick={handleSignOut}
              style={{ 
                padding: '0.5rem 1rem', 
                backgroundColor: '#ef4444', 
                color: 'white', 
                border: 'none', 
                borderRadius: '0.375rem',
                cursor: 'pointer'
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      ) : (
        <div style={{ padding: '1rem', backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: '0.375rem' }}>
          <h2>Not Authenticated</h2>
          <p>You are not currently logged in.</p>
          <a 
            href="/login" 
            style={{ 
              display: 'inline-block',
              marginTop: '1rem',
              padding: '0.5rem 1rem', 
              backgroundColor: '#2563eb', 
              color: 'white', 
              textDecoration: 'none',
              borderRadius: '0.375rem' 
            }}
          >
            Go to Login
          </a>
        </div>
      )}
      
      <div style={{ marginTop: '2rem' }}>
        <h2>Navigation</h2>
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/admin">Admin Dashboard</a></li>
          <li><a href="/admin/fix-database">Fix Database</a></li>
        </ul>
      </div>
    </div>
  );
}

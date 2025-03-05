import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/config';
import AdminLayout from '../../components/layouts/AdminLayout';

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/');
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .single();
        
        if (error || !data) {
          console.error('Error checking admin status:', error);
          router.push('/');
          return;
        }
        
        setIsAdmin(true);
      } catch (err) {
        console.error('Error in admin check:', err);
        router.push('/');
      }
    };
    
    checkAdmin();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset messages
    setMessage('');
    setError('');
    
    // Validate passwords
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }
    
    setLoading(true);
    
    try {
      // First, verify the current password by attempting to sign in
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Your session has expired. Please log in again.');
        setLoading(false);
        return;
      }
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session.user.email!,
        password: currentPassword
      });
      
      if (signInError) {
        setError('Current password is incorrect');
        setLoading(false);
        return;
      }
      
      // If current password is correct, update to the new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (updateError) {
        setError(`Failed to update password: ${updateError.message}`);
        setLoading(false);
        return;
      }
      
      // Success
      setMessage('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
    } catch (err: any) {
      setError(`An unexpected error occurred: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return <div>Checking authorization...</div>;
  }

  return (
    <AdminLayout>
      <Head>
        <title>Change Password | Not At Home Admin</title>
      </Head>
      
      <div className="change-password-container">
        <h1>Change Password</h1>
        <p className="description">Update your admin account password</p>
        
        <form onSubmit={handleSubmit} className="password-form">
          <div className="form-group">
            <label htmlFor="current-password">Current Password</label>
            <input
              type="password"
              id="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="new-password">New Password</label>
            <input
              type="password"
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirm-password">Confirm New Password</label>
            <input
              type="password"
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}
          
          <div className="form-actions">
            <button
              type="submit"
              className="save-button"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
      
      <style jsx>{`
        .change-password-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 2rem;
          background-color: white;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        h1 {
          margin-top: 0;
          color: #1e293b;
        }
        
        .description {
          color: #64748b;
          margin-bottom: 2rem;
        }
        
        .password-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        label {
          font-weight: 500;
          color: #334155;
        }
        
        input {
          padding: 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 0.375rem;
          font-size: 1rem;
        }
        
        .error-message {
          padding: 0.75rem;
          background-color: #fee2e2;
          color: #b91c1c;
          border-radius: 0.375rem;
        }
        
        .success-message {
          padding: 0.75rem;
          background-color: #dcfce7;
          color: #166534;
          border-radius: 0.375rem;
        }
        
        .form-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 1rem;
        }
        
        .save-button {
          padding: 0.75rem 1.5rem;
          background-color: #2563eb;
          color: white;
          border: none;
          border-radius: 0.375rem;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .save-button:hover {
          background-color: #1d4ed8;
        }
        
        .save-button:disabled {
          background-color: #93c5fd;
          cursor: not-allowed;
        }
      `}</style>
    </AdminLayout>
  );
} 
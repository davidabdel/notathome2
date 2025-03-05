import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../../../supabase/config';
import AdminLayout from '../../../components/layouts/AdminLayout';
import { FaSave, FaTimes } from 'react-icons/fa';

export default function NewCongregationPage() {
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [status, setStatus] = useState('pending');
  const [contactEmail, setContactEmail] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
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
      } catch (err) {
        console.error('Error checking admin status:', err);
        setError('Failed to verify permissions');
      }
    };
    
    checkAdmin();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Congregation name is required');
      return;
    }
    
    if (!pinCode.trim()) {
      setError('PIN code is required');
      return;
    }
    
    if (!contactEmail.trim()) {
      setError('Contact email is required');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Insert new congregation
      const { data: newCongregation, error: insertError } = await supabase
        .from('congregations')
        .insert({
          name: name.trim(),
          pin_code: pinCode.trim(),
          status: status,
          contact_email: contactEmail.trim()
        })
        .select()
        .single();
      
      if (insertError) {
        throw insertError;
      }
      
      setSuccess('Congregation created successfully');
      
      // Redirect to the new congregation's details page
      setTimeout(() => {
        router.push(`/admin/congregations/${newCongregation.id}`);
      }, 1500);
    } catch (err) {
      console.error('Error creating congregation:', err);
      setError('Failed to create congregation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <Head>
        <title>Add New Congregation - Admin - Not At Home</title>
        <meta name="description" content="Add a new congregation" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="content-container">
        <div className="header">
          <Link href="/admin/congregations" className="back-link">← Back to Congregations</Link>
          <h1>Add New Congregation</h1>
          <p className="description">Create a new congregation in the system</p>
        </div>

        {success && <div className="success-message">{success}</div>}
        {error && <div className="error-message">{error}</div>}

        {!isAdmin ? (
          <div className="error-message">You do not have permission to access this page</div>
        ) : (
          <form onSubmit={handleSubmit} className="form-container">
            <div className="form-group">
              <label htmlFor="name">Congregation Name</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter congregation name"
                disabled={loading}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="pinCode">PIN Code</label>
              <input
                type="text"
                id="pinCode"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="Enter PIN code (e.g., 123456)"
                disabled={loading}
                required
                maxLength={10}
              />
              <p className="form-help">This PIN code will be used by congregation members to join</p>
            </div>
            
            <div className="form-group">
              <label htmlFor="contactEmail">Contact Email</label>
              <input
                type="email"
                id="contactEmail"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="Enter contact email"
                disabled={loading}
                required
              />
              <p className="form-help">Email address of the congregation administrator</p>
            </div>
            
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={loading}
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            
            <div className="form-actions">
              <Link href="/admin/congregations" className="form-button secondary">
                <FaTimes className="icon-left" /> Cancel
              </Link>
              <button type="submit" className="form-button primary" disabled={loading}>
                <FaSave className="icon-left" /> {loading ? 'Creating...' : 'Create Congregation'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
} 
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../../supabase/config';
import AdminLayout from '../../components/layouts/AdminLayout';
import { FaEdit, FaTrash, FaPlus, FaPlaceOfWorship, FaSave, FaTimes, FaUsers } from 'react-icons/fa';

interface Congregation {
  id: string;
  name: string;
  pin_code: string;
  status: 'active' | 'inactive';
}

export default function ManageCongregationsPage() {
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCongregation, setEditingCongregation] = useState<Congregation | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Check if user is admin and fetch congregations
  useEffect(() => {
    const checkAdminAndFetchCongregations = async () => {
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
        
        // Fetch congregations
        await fetchCongregations();
      } catch (err) {
        console.error('Error checking admin status:', err);
        setError('Failed to verify admin status');
      } finally {
        setLoading(false);
      }
    };
    
    checkAdminAndFetchCongregations();
  }, []);

  // Fetch congregations
  const fetchCongregations = async () => {
    try {
      console.log('Fetching congregations...');
      
      const { data, error } = await supabase
        .from('congregations')
        .select('*')
        .order('name');
      
      if (error) {
        throw error;
      }
      
      console.log('Congregations data:', data);
      
      setCongregations(data || []);
    } catch (err) {
      console.error('Error fetching congregations:', err);
      setError('Failed to load congregations');
    }
  };

  // Handle editing a congregation
  const handleEdit = (id: string) => {
    console.log(`Edit congregation ${id}`);
    const congregation = congregations.find(c => c.id === id);
    if (congregation) {
      setEditingCongregation({ ...congregation });
      setIsEditModalOpen(true);
    }
  };

  // Handle input change in edit form
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (editingCongregation) {
      setEditingCongregation({
        ...editingCongregation,
        [name]: value
      });
    }
  };

  // Handle saving edited congregation
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingCongregation) return;
    
    setIsSaving(true);
    setError('');
    setSuccess('');
    
    try {
      console.log(`Saving congregation ${editingCongregation.id}...`);
      
      const { error } = await supabase
        .from('congregations')
        .update({
          name: editingCongregation.name,
          pin_code: editingCongregation.pin_code,
          status: editingCongregation.status
        })
        .eq('id', editingCongregation.id);
      
      if (error) {
        throw error;
      }
      
      // Refresh the congregations list
      await fetchCongregations();
      
      setSuccess('Congregation updated successfully');
      setIsEditModalOpen(false);
      console.log(`Congregation ${editingCongregation.id} updated successfully`);
    } catch (err) {
      console.error('Error updating congregation:', err);
      setError('Failed to update congregation');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle deleting a congregation
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this congregation? This action cannot be undone.')) {
      return;
    }
    
    try {
      console.log(`Deleting congregation ${id}...`);
      
      const { error } = await supabase
        .from('congregations')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      // Refresh the congregations list
      await fetchCongregations();
      
      console.log(`Congregation ${id} deleted successfully`);
    } catch (err) {
      console.error('Error deleting congregation:', err);
      setError('Failed to delete congregation');
    }
  };

  // Close the edit modal
  const closeModal = () => {
    setIsEditModalOpen(false);
    setEditingCongregation(null);
    setError('');
    setSuccess('');
  };

  return (
    <AdminLayout>
      <Head>
        <title>Manage Congregations - Admin - Not At Home</title>
        <meta name="description" content="Manage congregations" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="content-container">
        <div className="header">
          <h1>Manage Congregations</h1>
          <p className="description">View and manage all congregations in the system</p>
        </div>

        {success && <div className="success-message">{success}</div>}
        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading congregations...</p>
          </div>
        ) : !isAdmin ? (
          <div className="error-message">You do not have permission to access this page</div>
        ) : (
          <>
            <div className="actions-bar">
              <Link href="/admin/congregations/new" className="form-button">
                <FaPlus className="icon-left" /> Add New Congregation
              </Link>
            </div>
            
            <div className="table-container">
              {congregations.length === 0 ? (
                <div className="empty-state">
                  <FaPlaceOfWorship className="empty-icon" />
                  <p>No congregations found</p>
                  <p className="empty-description">Get started by adding a new congregation</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>PIN Code</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {congregations.map(congregation => (
                      <tr key={congregation.id}>
                        <td>{congregation.name}</td>
                        <td>{congregation.pin_code}</td>
                        <td>
                          <span className={`status-badge ${congregation.status}`}>
                            {congregation.status.charAt(0).toUpperCase() + congregation.status.slice(1)}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <Link 
                              href={`/admin/congregations/${congregation.id}/admins`}
                              className="manage-button"
                              title="Manage Administrators"
                            >
                              <FaUsers />
                            </Link>
                            <button 
                              onClick={() => handleEdit(congregation.id)}
                              className="edit-button"
                              title="Edit congregation"
                            >
                              <FaEdit />
                            </button>
                            <button 
                              onClick={() => handleDelete(congregation.id)}
                              className="delete-button"
                              title="Delete congregation"
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
        
        {/* Edit Congregation Modal */}
        {isEditModalOpen && editingCongregation && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h2>Edit Congregation</h2>
                <button onClick={closeModal} className="close-button">
                  <FaTimes />
                </button>
              </div>
              
              <form onSubmit={handleSave} className="edit-form">
                <div className="form-group">
                  <label htmlFor="name" className="form-label">Congregation Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={editingCongregation.name}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="pin_code" className="form-label">PIN Code</label>
                  <input
                    type="text"
                    id="pin_code"
                    name="pin_code"
                    value={editingCongregation.pin_code}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                    maxLength={6}
                    pattern="[0-9]+"
                  />
                  <p className="form-help">6-digit PIN code for congregation access</p>
                </div>
                
                <div className="form-group">
                  <label htmlFor="status" className="form-label">Status</label>
                  <select
                    id="status"
                    name="status"
                    value={editingCongregation.status}
                    onChange={handleInputChange}
                    className="form-select"
                    required
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                
                <div className="form-actions">
                  <button type="button" onClick={closeModal} className="form-button secondary">
                    Cancel
                  </button>
                  <button type="submit" className="form-button" disabled={isSaving}>
                    <FaSave className="icon-left" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .manage-button {
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 8px;
          cursor: pointer;
          margin-right: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .manage-button:hover {
          background: #4338ca;
        }
      `}</style>
    </AdminLayout>
  );
} 
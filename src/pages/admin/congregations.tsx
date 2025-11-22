import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../../supabase/config';
import AdminLayout from '../../components/layouts/AdminLayout';
import { Edit, Trash2, Plus, Church, Save, X, Users, Search } from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');

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

  // Filter congregations based on search term
  const filteredCongregations = congregations.filter(congregation =>
    congregation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    congregation.pin_code.includes(searchTerm)
  );

  return (
    <AdminLayout>
      <Head>
        <title>Manage Congregations - Admin - Not At Home</title>
        <meta name="description" content="Manage congregations" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="content-container">
        <div className="header">
          <h1 className="page-title">Manage Congregations</h1>
          <p className="description">View and manage all congregations in the system</p>
        </div>

        {success && <div className="success-alert">{success}</div>}
        {error && <div className="error-alert">{error}</div>}

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p className="loading-text">Loading congregations...</p>
          </div>
        ) : !isAdmin ? (
          <div className="error-alert">You do not have permission to access this page</div>
        ) : (
          <>
            <div className="actions-bar">
              <div className="search-wrapper">
                <Search className="search-icon" size={18} />
                <input
                  type="text"
                  placeholder="Search congregations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              <Link href="/admin/congregations/new" className="btn btn-primary">
                <Plus size={18} className="mr-2" /> Add New Congregation
              </Link>
            </div>

            <div className="table-container">
              {filteredCongregations.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon-wrapper">
                    <Church size={32} />
                  </div>
                  <h3 className="empty-title">No Congregations Found</h3>
                  <p className="empty-description">
                    {searchTerm ? 'No congregations match your search' : 'Get started by adding a new congregation'}
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
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
                      {filteredCongregations.map(congregation => (
                        <tr key={congregation.id}>
                          <td className="font-medium">{congregation.name}</td>
                          <td className="font-mono">{congregation.pin_code}</td>
                          <td>
                            <span className={`status-badge ${congregation.status}`}>
                              {congregation.status.charAt(0).toUpperCase() + congregation.status.slice(1)}
                            </span>
                          </td>
                          <td>
                            <div className="table-actions">
                              <Link
                                href={`/admin/congregations/${congregation.id}/admins`}
                                className="action-btn btn-icon"
                                title="Manage Administrators"
                              >
                                <Users size={18} />
                              </Link>
                              <button
                                onClick={() => handleEdit(congregation.id)}
                                className="action-btn btn-icon"
                                title="Edit congregation"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleDelete(congregation.id)}
                                className="action-btn btn-icon delete"
                                title="Delete congregation"
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

        {/* Edit Congregation Modal */}
        {isEditModalOpen && editingCongregation && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h2 className="modal-title">Edit Congregation</h2>
                <button onClick={closeModal} className="close-button">
                  <X size={24} />
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
                    className="form-input font-mono"
                    required
                    maxLength={6}
                    pattern="[0-9]+"
                  />
                  <p className="form-help">6-digit PIN code for congregation access</p>
                </div>

                <div className="form-group">
                  <label htmlFor="status" className="form-label">Status</label>
                  <div className="select-wrapper">
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
                </div>

                <div className="form-actions">
                  <button type="button" onClick={closeModal} className="btn btn-ghost">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isSaving}>
                    {isSaving ? (
                      <div className="spinner-sm"></div>
                    ) : (
                      <Save size={18} className="mr-2" />
                    )}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
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
        
        .spinner-sm {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s linear infinite;
          margin-right: var(--space-2);
        }
        
        .loading-text {
          font-weight: 600;
          color: var(--color-text-secondary);
        }
        
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .success-alert {
          background-color: var(--color-success-bg);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: var(--color-success);
          padding: var(--space-4);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-6);
        }
        
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
        
        .btn-ghost {
          background-color: transparent;
          color: var(--color-text-secondary);
        }
        
        .btn-ghost:hover {
          background-color: var(--color-bg-input);
          color: var(--color-text-main);
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
        .font-mono { font-family: monospace; letter-spacing: 0.05em; }
        
        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .status-badge.active {
          background-color: var(--color-success-bg);
          color: var(--color-success);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        
        .status-badge.inactive {
          background-color: var(--color-bg-input);
          color: var(--color-text-secondary);
          border: 1px solid var(--color-border);
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
        
        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
          backdrop-filter: blur(4px);
        }
        
        .modal-container {
          background-color: var(--color-bg-card);
          border-radius: var(--radius-xl);
          width: 100%;
          max-width: 500px;
          box-shadow: var(--shadow-lg);
          animation: slideUp 0.3s ease-out;
          border: 1px solid var(--color-border);
        }
        
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-6);
          border-bottom: 1px solid var(--color-border);
        }
        
        .modal-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-text-main);
          margin: 0;
        }
        
        .close-button {
          background: none;
          border: none;
          color: var(--color-text-tertiary);
          cursor: pointer;
          padding: var(--space-1);
          border-radius: var(--radius-md);
          transition: color 0.2s;
        }
        
        .close-button:hover {
          color: var(--color-text-main);
          background-color: var(--color-bg-input);
        }
        
        .edit-form {
          padding: var(--space-6);
        }
        
        .form-group {
          margin-bottom: var(--space-4);
        }
        
        .form-label {
          display: block;
          font-weight: 500;
          color: var(--color-text-main);
          margin-bottom: var(--space-2);
          font-size: 0.95rem;
        }
        
        .form-input, .form-select {
          width: 100%;
          padding: var(--space-3);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 1rem;
          transition: all 0.2s;
          background-color: var(--color-bg-input);
        }
        
        .form-input:focus, .form-select:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px var(--color-primary-light);
          background-color: var(--color-bg-card);
        }
        
        .form-help {
          margin-top: var(--space-2);
          font-size: 0.875rem;
          color: var(--color-text-tertiary);
        }
        
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--space-3);
          margin-top: var(--space-8);
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
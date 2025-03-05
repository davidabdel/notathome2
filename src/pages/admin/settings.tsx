import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { supabase } from '../../../supabase/config';
import AdminLayout from '../../components/layouts/AdminLayout';
import { FaSave, FaCog } from 'react-icons/fa';

interface SystemSettings {
  sessionExpiryHours: number;
  maxSessionsPerCongregation: number;
  allowGeotagging: boolean;
  requirePinVerification: boolean;
}

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    sessionExpiryHours: 24,
    maxSessionsPerCongregation: 10,
    allowGeotagging: true,
    requirePinVerification: true
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [creatingTable, setCreatingTable] = useState(false);

  // Check if user is admin and fetch settings
  useEffect(() => {
    const checkAdminAndFetchSettings = async () => {
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
        
        // Fetch settings
        await fetchSettings();
      } catch (err) {
        console.error('Error checking admin status:', err);
        setError('Failed to verify admin status');
      } finally {
        setLoading(false);
      }
    };
    
    checkAdminAndFetchSettings();
  }, []);

  // Fetch settings
  const fetchSettings = async () => {
    try {
      console.log('Fetching system settings...');
      
      const response = await fetch('/api/admin/settings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data && data.settings) {
        setSettings(data.settings);
      } else {
        console.log('No settings found, using defaults');
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to load system settings');
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      console.log('Saving settings:', settings);
      
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save settings: ${response.statusText}`);
      }
      
      setSuccess('Settings saved successfully');
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) : value
    }));
  };

  // Create settings table
  const createSettingsTable = async () => {
    setCreatingTable(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch('/api/admin/create-settings-table', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create settings table: ${response.statusText}`);
      }
      
      setSuccess('Settings table created successfully. Refreshing settings...');
      // Fetch settings after creating the table
      await fetchSettings();
    } catch (err) {
      console.error('Error creating settings table:', err);
      setError('Failed to create settings table');
    } finally {
      setCreatingTable(false);
    }
  };

  return (
    <AdminLayout>
      <Head>
        <title>System Settings - Admin - Not At Home</title>
        <meta name="description" content="Configure system settings" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="content-container">
        <div className="header">
          <h1>System Settings</h1>
          <p className="description">Configure global system settings and preferences</p>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading settings...</p>
          </div>
        ) : error && !isAdmin ? (
          <div className="error-message">{error}</div>
        ) : !isAdmin ? (
          <div className="error-message">You do not have permission to access this page</div>
        ) : (
          <div className="form-container">
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            
            <form onSubmit={handleSubmit}>
              <div className="form-section">
                <h2 className="section-title">Session Settings</h2>
                
                {error && error.includes('Failed to fetch settings') && (
                  <div style={{
                    backgroundColor: '#fff8e1',
                    border: '1px solid #ffe082',
                    borderRadius: '4px',
                    padding: '16px',
                    marginBottom: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}>
                    <p>Settings table may not exist yet.</p>
                    <button 
                      type="button" 
                      style={{
                        backgroundColor: creatingTable ? '#a0aec0' : '#4a5568',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: creatingTable ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 500
                      }}
                      onClick={createSettingsTable}
                      disabled={creatingTable}
                    >
                      {creatingTable ? 'Creating...' : 'Create Settings Table'}
                    </button>
                  </div>
                )}
                
                <div className="form-group">
                  <label htmlFor="sessionExpiryHours" className="form-label">
                    Session Expiry (hours)
                  </label>
                  <input
                    type="number"
                    id="sessionExpiryHours"
                    name="sessionExpiryHours"
                    value={settings.sessionExpiryHours}
                    onChange={handleChange}
                    min="1"
                    max="168"
                    className="form-input"
                    required
                  />
                  <p className="form-help">How long a session remains active before expiring</p>
                </div>
                
                <div className="form-group">
                  <label htmlFor="maxSessionsPerCongregation" className="form-label">
                    Max Sessions Per Congregation
                  </label>
                  <input
                    type="number"
                    id="maxSessionsPerCongregation"
                    name="maxSessionsPerCongregation"
                    value={settings.maxSessionsPerCongregation}
                    onChange={handleChange}
                    min="1"
                    max="100"
                    className="form-input"
                    required
                  />
                  <p className="form-help">Maximum number of active sessions allowed per congregation</p>
                </div>
              </div>
              
              <div className="form-section">
                <h2 className="section-title">Security Settings</h2>
                
                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="requirePinVerification"
                      checked={settings.requirePinVerification}
                      onChange={handleChange}
                    />
                    Require PIN Verification
                  </label>
                  <p className="form-help">Users must enter a congregation PIN to access congregation data</p>
                </div>
                
                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="allowGeotagging"
                      checked={settings.allowGeotagging}
                      onChange={handleChange}
                    />
                    Allow Geotagging
                  </label>
                  <p className="form-help">Enable location tracking for marking addresses on the map</p>
                </div>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="form-button" disabled={saving}>
                  <FaSave className="icon-left" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
} 
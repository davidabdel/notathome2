import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase/config';

interface Congregation {
  id: string;
  name: string;
  status: string;
  contact_email?: string;
  created_at?: string;
  pin_code?: string;
}

interface CongregationInfoProps {
  congregation: Congregation;
}

const CongregationInfo: React.FC<CongregationInfoProps> = ({ congregation }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pinCode, setPinCode] = useState(congregation.pin_code || '');
  const [newPinCode, setNewPinCode] = useState('');
  const [showPinForm, setShowPinForm] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    // Fetch the PIN code if not provided in the congregation object
    const fetchPinCode = async () => {
      if (!congregation.pin_code) {
        try {
          const { data, error } = await supabase
            .from('congregations')
            .select('pin_code')
            .eq('id', congregation.id)
            .single();
          
          if (error) throw error;
          
          if (data && data.pin_code) {
            setPinCode(data.pin_code);
          }
        } catch (err) {
          console.error('Error fetching PIN code:', err);
        }
      }
    };
    
    fetchPinCode();
  }, [congregation.id, congregation.pin_code]);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset states
    setError('');
    setSuccess('');
    
    // Validate inputs
    if (!currentPassword) {
      setError('Current password is required');
      return;
    }
    
    if (!newPassword) {
      setError('New password is required');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    setLoading(true);
    
    try {
      // First verify the current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: congregation.contact_email || '',
        password: currentPassword
      });
      
      if (signInError) {
        throw new Error('Current password is incorrect');
      }
      
      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (updateError) {
        throw new Error(updateError.message);
      }
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Password updated successfully');
      
      // Hide the form after successful update
      setTimeout(() => {
        setShowPasswordForm(false);
      }, 3000);
      
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handlePinUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset states
    setPinError('');
    setPinSuccess('');
    
    // Validate inputs
    if (!newPinCode) {
      setPinError('New PIN code is required');
      return;
    }
    
    if (!/^\d{3,10}$/.test(newPinCode)) {
      setPinError('PIN code must be 3-10 digits');
      return;
    }
    
    setPinLoading(true);
    
    try {
      // Update the PIN code
      const { error: updateError } = await supabase
        .from('congregations')
        .update({ pin_code: newPinCode })
        .eq('id', congregation.id);
      
      if (updateError) {
        throw new Error(updateError.message);
      }
      
      // Update local state
      setPinCode(newPinCode);
      
      // Clear form
      setNewPinCode('');
      setPinSuccess('PIN code updated successfully');
      
      // Hide the form after successful update
      setTimeout(() => {
        setShowPinForm(false);
      }, 3000);
      
    } catch (err: any) {
      setPinError(err.message || 'Failed to update PIN code');
    } finally {
      setPinLoading(false);
    }
  };

  return (
    <div className="congregation-info">
      <h2>Congregation Information</h2>
      
      <div className="info-grid">
        <div className="info-item">
          <div className="info-label">Name</div>
          <div className="info-value">{congregation.name}</div>
        </div>
        
        <div className="info-item">
          <div className="info-label">Status</div>
          <div className="info-value">
            <span className={`status-badge ${congregation.status}`}>
              {congregation.status.charAt(0).toUpperCase() + congregation.status.slice(1)}
            </span>
          </div>
        </div>
        
        <div className="info-item">
          <div className="info-label">Contact Email</div>
          <div className="info-value">{congregation.contact_email || 'Not set'}</div>
        </div>
        
        <div className="info-item">
          <div className="info-label">Congregation PIN</div>
          <div className="info-value pin-display">
            {showPin ? pinCode : '•'.repeat(pinCode.length)}
            <button 
              className="toggle-pin-button" 
              onClick={() => setShowPin(!showPin)}
              aria-label={showPin ? "Hide PIN" : "Show PIN"}
            >
              {showPin ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        
        {congregation.created_at && (
          <div className="info-item">
            <div className="info-label">Created</div>
            <div className="info-value">
              {new Date(congregation.created_at).toLocaleDateString()}
            </div>
          </div>
        )}
      </div>

      <div className="pin-section">
        <h3>Congregation PIN</h3>
        <p className="section-description">
          This PIN is used by congregation members to access territory maps.
        </p>
        
        {!showPinForm ? (
          <button 
            className="update-pin-button"
            onClick={() => setShowPinForm(true)}
          >
            Update PIN Code
          </button>
        ) : (
          <form onSubmit={handlePinUpdate} className="pin-form">
            {pinError && <div className="error-message">{pinError}</div>}
            {pinSuccess && <div className="success-message">{pinSuccess}</div>}
            
            <div className="form-group">
              <label htmlFor="current-pin">Current PIN</label>
              <div className="pin-display-form">
                {showPin ? pinCode : '•'.repeat(pinCode.length)}
                <button 
                  type="button"
                  className="toggle-pin-button-small" 
                  onClick={() => setShowPin(!showPin)}
                >
                  {showPin ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="new-pin">New PIN Code</label>
              <input
                id="new-pin"
                type="text"
                value={newPinCode}
                onChange={(e) => setNewPinCode(e.target.value)}
                required
                pattern="\d{3,10}"
                title="PIN code must be 3-10 digits"
                placeholder="Enter 3-10 digit PIN"
              />
              <div className="input-help">PIN must be 3-10 digits</div>
            </div>
            
            <div className="form-actions">
              <button
                type="button"
                className="cancel-button"
                onClick={() => {
                  setShowPinForm(false);
                  setNewPinCode('');
                  setPinError('');
                  setPinSuccess('');
                }}
                disabled={pinLoading}
              >
                Cancel
              </button>
              
              <button
                type="submit"
                className="submit-button"
                disabled={pinLoading}
              >
                {pinLoading ? 'Updating...' : 'Update PIN'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="password-section">
        <h3>Account Security</h3>
        <p className="section-description">
          Update your administrator account password.
        </p>
        
        {!showPasswordForm ? (
          <button 
            className="update-password-button"
            onClick={() => setShowPasswordForm(true)}
          >
            Update Password
          </button>
        ) : (
          <form onSubmit={handlePasswordUpdate} className="password-form">
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            
            <div className="form-group">
              <label htmlFor="current-password">Current Password</label>
              <input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="new-password">New Password</label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirm-password">Confirm New Password</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            
            <div className="form-actions">
              <button
                type="button"
                className="cancel-button"
                onClick={() => {
                  setShowPasswordForm(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setError('');
                  setSuccess('');
                }}
                disabled={loading}
              >
                Cancel
              </button>
              
              <button
                type="submit"
                className="submit-button"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>

      <style jsx>{`
        .congregation-info {
          width: 100%;
        }
        
        h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 1.5rem;
        }
        
        h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #334155;
          margin: 2rem 0 0.5rem;
        }
        
        .section-description {
          color: #64748b;
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1rem;
        }
        
        .info-item {
          background-color: #f8fafc;
          border-radius: 0.5rem;
          padding: 1rem;
        }
        
        .info-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #64748b;
          margin-bottom: 0.5rem;
        }
        
        .info-value {
          font-size: 1rem;
          color: #1e293b;
          font-weight: 500;
        }
        
        .pin-display {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .pin-display-form {
          display: flex;
          align-items: center;
          background-color: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 0.375rem;
          padding: 0.75rem;
          font-size: 1rem;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }
        
        .toggle-pin-button {
          background-color: #e2e8f0;
          color: #64748b;
          border: none;
          border-radius: 0.25rem;
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          cursor: pointer;
          margin-left: 0.5rem;
        }
        
        .toggle-pin-button:hover {
          background-color: #cbd5e1;
        }
        
        .toggle-pin-button-small {
          background-color: #e2e8f0;
          color: #64748b;
          border: none;
          border-radius: 0.25rem;
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          cursor: pointer;
          margin-left: auto;
        }
        
        .toggle-pin-button-small:hover {
          background-color: #cbd5e1;
        }
        
        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
        }
        
        .status-badge.active {
          background-color: #dcfce7;
          color: #166534;
        }
        
        .status-badge.inactive {
          background-color: #fee2e2;
          color: #b91c1c;
        }
        
        .status-badge.pending {
          background-color: #fef3c7;
          color: #92400e;
        }
        
        .pin-section {
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e2e8f0;
        }
        
        .password-section {
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e2e8f0;
        }
        
        .update-password-button,
        .update-pin-button {
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.375rem;
          padding: 0.75rem 1.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .update-password-button:hover,
        .update-pin-button:hover {
          background-color: #2563eb;
        }
        
        .password-form,
        .pin-form {
          background-color: #f8fafc;
          border-radius: 0.5rem;
          padding: 1.5rem;
          margin-top: 1rem;
        }
        
        .form-group {
          margin-bottom: 1rem;
        }
        
        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #64748b;
          margin-bottom: 0.5rem;
        }
        
        .form-group input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 0.375rem;
          font-size: 1rem;
          color: #1e293b;
        }
        
        .form-group input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .input-help {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 0.25rem;
        }
        
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 1.5rem;
        }
        
        .cancel-button {
          background-color: #f1f5f9;
          color: #64748b;
          border: 1px solid #cbd5e1;
          border-radius: 0.375rem;
          padding: 0.75rem 1.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .cancel-button:hover {
          background-color: #e2e8f0;
        }
        
        .submit-button {
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.375rem;
          padding: 0.75rem 1.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .submit-button:hover {
          background-color: #2563eb;
        }
        
        .submit-button:disabled,
        .cancel-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .error-message {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          padding: 0.75rem;
          border-radius: 0.375rem;
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }
        
        .success-message {
          background-color: #f0fdf4;
          border: 1px solid #86efac;
          color: #166534;
          padding: 0.75rem;
          border-radius: 0.375rem;
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
};

export default CongregationInfo; 
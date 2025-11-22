import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase/config';
import { Eye, EyeOff, Lock, Key, Shield, Mail, Calendar, Activity } from 'lucide-react';

interface Congregation {
  id: string;
  name: string;
  status: string;
  contact_email?: string;
  notification_email?: string;
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

  const [notificationEmail, setNotificationEmail] = useState(congregation.notification_email || '');
  const [newNotificationEmail, setNewNotificationEmail] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

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

  // Update notification email state when prop changes
  useEffect(() => {
    if (congregation.notification_email) {
      setNotificationEmail(congregation.notification_email);
    }
  }, [congregation.notification_email]);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    // ... (existing code)
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
    // ... (existing code)
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

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset states
    setEmailError('');
    setEmailSuccess('');

    // Validate inputs
    if (!newNotificationEmail) {
      setEmailError('Email address is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newNotificationEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setEmailLoading(true);

    try {
      // Update the notification email
      const { error: updateError } = await supabase
        .from('congregations')
        .update({ notification_email: newNotificationEmail })
        .eq('id', congregation.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Update local state
      setNotificationEmail(newNotificationEmail);

      // Clear form
      setNewNotificationEmail('');
      setEmailSuccess('Notification email updated successfully');

      // Hide the form after successful update
      setTimeout(() => {
        setShowEmailForm(false);
      }, 3000);

    } catch (err: any) {
      setEmailError(err.message || 'Failed to update notification email');
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="congregation-info">
      <h2 className="section-title">Congregation Information</h2>

      <div className="info-grid">
        <div className="info-card">
          <div className="info-header">
            <Shield size={20} className="info-icon" />
            <span className="info-label">Name</span>
          </div>
          <div className="info-value">{congregation.name}</div>
        </div>

        <div className="info-card">
          <div className="info-header">
            <Activity size={20} className="info-icon" />
            <span className="info-label">Status</span>
          </div>
          <div className="info-value">
            <span className={`status-badge ${congregation.status}`}>
              {congregation.status.charAt(0).toUpperCase() + congregation.status.slice(1)}
            </span>
          </div>
        </div>

        <div className="info-card">
          <div className="info-header">
            <Mail size={20} className="info-icon" />
            <span className="info-label">Contact Email</span>
          </div>
          <div className="info-value">{congregation.contact_email || 'Not set'}</div>
        </div>

        <div className="info-card">
          <div className="info-header">
            <Mail size={20} className="info-icon" />
            <span className="info-label">Notification Email</span>
          </div>
          <div className="info-value">{notificationEmail || 'Not set'}</div>
        </div>

        <div className="info-card">
          <div className="info-header">
            <Key size={20} className="info-icon" />
            <span className="info-label">Congregation PIN</span>
          </div>
          <div className="info-value pin-display">
            <span className="pin-code">{showPin ? pinCode : '•'.repeat(pinCode.length || 4)}</span>
            <button
              className="icon-btn"
              onClick={() => setShowPin(!showPin)}
              aria-label={showPin ? "Hide PIN" : "Show PIN"}
              title={showPin ? "Hide PIN" : "Show PIN"}
            >
              {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {congregation.created_at && (
          <div className="info-card">
            <div className="info-header">
              <Calendar size={20} className="info-icon" />
              <span className="info-label">Created</span>
            </div>
            <div className="info-value">
              {new Date(congregation.created_at).toLocaleDateString()}
            </div>
          </div>
        )}
      </div>

      <div className="settings-section">
        <div className="section-header">
          <Mail className="section-icon" size={24} />
          <div>
            <h3>Notification Settings</h3>
            <p className="section-description">
              Set an email address to receive notifications about territory requests.
            </p>
          </div>
        </div>

        {!showEmailForm ? (
          <button
            className="btn btn-secondary"
            onClick={() => {
              setNewNotificationEmail(notificationEmail);
              setShowEmailForm(true);
            }}
          >
            Update Notification Email
          </button>
        ) : (
          <form onSubmit={handleEmailUpdate} className="settings-form">
            {emailError && <div className="error-alert">{emailError}</div>}
            {emailSuccess && <div className="success-alert">{emailSuccess}</div>}

            <div className="input-group">
              <label htmlFor="notification-email" className="input-label">Notification Email</label>
              <input
                id="notification-email"
                type="email"
                value={newNotificationEmail}
                onChange={(e) => setNewNotificationEmail(e.target.value)}
                required
                placeholder="Enter email address"
                className="input-field"
              />
              <div className="input-help">This email will receive alerts for new territory requests.</div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setShowEmailForm(false);
                  setNewNotificationEmail('');
                  setEmailError('');
                  setEmailSuccess('');
                }}
                disabled={emailLoading}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={emailLoading}
              >
                {emailLoading ? 'Updating...' : 'Save Email'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="settings-section">
        <div className="section-header">
          <Key className="section-icon" size={24} />
          <div>
            <h3>Congregation PIN</h3>
            <p className="section-description">
              This PIN is used by congregation members to access territory maps.
            </p>
          </div>
        </div>

        {!showPinForm ? (
          <button
            className="btn btn-secondary"
            onClick={() => setShowPinForm(true)}
          >
            Update PIN Code
          </button>
        ) : (
          <form onSubmit={handlePinUpdate} className="settings-form">
            {pinError && <div className="error-alert">{pinError}</div>}
            {pinSuccess && <div className="success-alert">{pinSuccess}</div>}

            <div className="input-group">
              <label htmlFor="current-pin" className="input-label">Current PIN</label>
              <div className="pin-display-form">
                <span className="pin-code">{showPin ? pinCode : '•'.repeat(pinCode.length || 4)}</span>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setShowPin(!showPin)}
                >
                  {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="new-pin" className="input-label">New PIN Code</label>
              <input
                id="new-pin"
                type="text"
                value={newPinCode}
                onChange={(e) => setNewPinCode(e.target.value)}
                required
                pattern="\d{3,10}"
                title="PIN code must be 3-10 digits"
                placeholder="Enter 3-10 digit PIN"
                className="input-field"
              />
              <div className="input-help">PIN must be 3-10 digits</div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-ghost"
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
                className="btn btn-primary"
                disabled={pinLoading}
              >
                {pinLoading ? 'Updating...' : 'Update PIN'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="settings-section">
        <div className="section-header">
          <Lock className="section-icon" size={24} />
          <div>
            <h3>Account Security</h3>
            <p className="section-description">
              Update your administrator account password.
            </p>
          </div>
        </div>

        {!showPasswordForm ? (
          <button
            className="btn btn-secondary"
            onClick={() => setShowPasswordForm(true)}
          >
            Update Password
          </button>
        ) : (
          <form onSubmit={handlePasswordUpdate} className="settings-form">
            {error && <div className="error-alert">{error}</div>}
            {success && <div className="success-alert">{success}</div>}

            <div className="input-group">
              <label htmlFor="current-password" className="input-label">Current Password</label>
              <input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="input-field"
              />
            </div>

            <div className="input-group">
              <label htmlFor="new-password" className="input-label">New Password</label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="input-field"
              />
            </div>

            <div className="input-group">
              <label htmlFor="confirm-password" className="input-label">Confirm New Password</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="input-field"
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-ghost"
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
                className="btn btn-primary"
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
        
        .section-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text-main);
          margin-bottom: var(--space-6);
          letter-spacing: -0.025em;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: var(--space-4);
          margin-bottom: var(--space-8);
        }
        
        .info-card {
          background-color: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          transition: all 0.2s ease;
        }
        
        .info-card:hover {
          border-color: var(--color-primary);
          box-shadow: var(--shadow-sm);
        }
        
        .info-header {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          margin-bottom: var(--space-2);
          color: var(--color-text-secondary);
        }
        
        .info-icon {
          color: var(--color-primary);
          opacity: 0.8;
        }
        
        .info-label {
          font-size: 0.875rem;
          font-weight: 500;
        }
        
        .info-value {
          font-size: 1.125rem;
          color: var(--color-text-main);
          font-weight: 600;
          word-break: break-all;
        }
        
        .pin-display {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .pin-code {
          font-family: monospace;
          letter-spacing: 1px;
        }
        
        .pin-display-form {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: var(--color-bg-input);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-3);
          font-size: 1rem;
          color: var(--color-text-main);
          font-family: monospace;
        }
        
        .icon-btn {
          background: none;
          border: none;
          color: var(--color-text-secondary);
          cursor: pointer;
          padding: var(--space-1);
          border-radius: var(--radius-sm);
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .icon-btn:hover {
          background-color: var(--color-bg-body);
          color: var(--color-primary);
        }
        
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
          background-color: var(--color-error-bg);
          color: var(--color-error);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        
        .status-badge.pending {
          background-color: #fef3c7;
          color: #92400e;
          border: 1px solid #fcd34d;
        }
        
        .settings-section {
          margin-top: var(--space-8);
          padding-top: var(--space-6);
          border-top: 1px solid var(--color-border);
        }
        
        .section-header {
          display: flex;
          gap: var(--space-4);
          margin-bottom: var(--space-4);
        }
        
        .section-icon {
          color: var(--color-primary);
          margin-top: var(--space-1);
        }
        
        .settings-section h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-text-main);
          margin: 0 0 var(--space-1) 0;
        }
        
        .section-description {
          color: var(--color-text-secondary);
          margin: 0;
          font-size: 0.95rem;
        }
        
        .settings-form {
          background-color: var(--color-bg-body);
          border-radius: var(--radius-lg);
          padding: var(--space-6);
          margin-top: var(--space-4);
          border: 1px solid var(--color-border);
        }
        
        .input-group {
          margin-bottom: var(--space-4);
        }
        
        .input-label {
          display: block;
          margin-bottom: var(--space-2);
          font-weight: 500;
          color: var(--color-text-secondary);
          font-size: 0.9rem;
        }
        
        .input-field {
          width: 100%;
          padding: var(--space-3);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 1rem;
          color: var(--color-text-main);
          background-color: var(--color-bg-input);
        }
        
        .input-field:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        
        .input-help {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          margin-top: var(--space-2);
        }
        
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--space-3);
          margin-top: var(--space-6);
        }
        
        .btn {
          padding: var(--space-2) var(--space-4);
          border-radius: var(--radius-md);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.9rem;
          border: none;
        }
        
        .btn-primary {
          background-color: var(--color-primary);
          color: white;
        }
        
        .btn-primary:hover:not(:disabled) {
          background-color: var(--color-primary-dark);
        }
        
        .btn-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .btn-secondary {
          background-color: var(--color-bg-input);
          color: var(--color-text-main);
          border: 1px solid var(--color-border);
        }
        
        .btn-secondary:hover {
          background-color: var(--color-bg-card);
          border-color: var(--color-text-secondary);
        }
        
        .btn-ghost {
          background: none;
          color: var(--color-text-secondary);
        }
        
        .btn-ghost:hover {
          color: var(--color-text-main);
          background-color: var(--color-bg-input);
        }
        
        .success-alert {
          background-color: var(--color-success-bg);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: var(--color-success);
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-4);
          font-size: 0.875rem;
        }
        
        .error-alert {
          background-color: var(--color-error-bg);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: var(--color-error);
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-4);
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
};

export default CongregationInfo;

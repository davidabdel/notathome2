import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../supabase/config';
import { Building, Lock, Loader2, AlertCircle, Search } from 'lucide-react';

interface LoginFormProps {
  onSuccess?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [pin, setPin] = useState('');
  const [congregationName, setCongregationName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Autocomplete states
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fetchingSuggestions, setFetchingSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch suggestions when congregation name changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (congregationName.trim().length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setFetchingSuggestions(true);
      try {
        const response = await fetch(`/api/congregation-names?query=${encodeURIComponent(congregationName.trim())}`);
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.congregationNames || []);
          setShowSuggestions(data.congregationNames && data.congregationNames.length > 0);
        } else {
          console.error('Error fetching suggestions:', await response.text());
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (err) {
        console.error('Error fetching suggestions:', err);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setFetchingSuggestions(false);
      }
    };

    // Debounce the fetch request
    const debounceTimer = setTimeout(() => {
      fetchSuggestions();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [congregationName]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSuggestionClick = (suggestion: string) => {
    setCongregationName(suggestion);
    setShowSuggestions(false);
    // Focus on PIN input after selecting a congregation
    const pinInput = document.getElementById('pin');
    if (pinInput) {
      pinInput.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pin.length < 3 || pin.length > 10) {
      setError('PIN must be between 3 and 10 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Trim the congregation name to remove any leading/trailing spaces
      const trimmedName = congregationName.trim();

      console.log('Attempting login with:', {
        congregationName: trimmedName,
        pinLength: pin.length
      });

      // Special case for Admin Congregation - use the admin-login API
      if (trimmedName.toLowerCase() === 'admin congregation' && trimmedName !== 'Admin Congregation') {
        console.log('Attempting Admin Congregation login via API');

        try {
          const response = await fetch('/api/admin-login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ pin }),
          });

          const data = await response.json();
          console.log('Admin login API response:', data);

          if (response.ok) {
            console.log('Admin login successful, signing in with credentials');

            // Sign in with the credentials provided by the API
            if (data.credentials) {
              const { email, password } = data.credentials;

              // Check if this is the superadmin account
              if (email === 'david@uconnect.com.au') {
                console.log('Superadmin detected, redirecting to Admin Dashboard');

                const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                  email,
                  password
                });

                if (signInError) {
                  console.error('Error signing in with credentials:', signInError);
                  setError('Error signing in with credentials: ' + signInError.message);
                  setLoading(false);
                  return;
                }

                console.log('Sign in successful:', signInData);

                // Redirect directly to admin dashboard
                window.location.href = '/admin';
                return;
              }

              const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password
              });

              if (signInError) {
                console.error('Error signing in with credentials:', signInError);
                setError('Error signing in with credentials: ' + signInError.message);
                setLoading(false);
                return;
              }

              console.log('Sign in successful:', signInData);

              // Call the success callback
              if (onSuccess) {
                onSuccess();
              }

              return;
            } else {
              setError('No credentials returned from the server');
              setLoading(false);
              return;
            }
          } else {
            setError(data.error || 'Failed to login as Admin');
            setLoading(false);
            return;
          }
        } catch (apiErr: any) {
          console.error('Error calling admin-login API:', apiErr);
          setError('Error connecting to the server. Please try again.');
          setLoading(false);
          return;
        }
      }

      // For all congregations, use the congregation-login API
      try {
        // First try to get all congregations to debug (this will likely fail due to RLS)
        const { data: allCongregations, error: allError } = await supabase
          .from('congregations')
          .select('id, name, pin_code, status');

        // Call the direct-insert API to ensure Admin Congregation exists
        const directInsertResponse = await fetch('/api/direct-insert');
        await directInsertResponse.json();

        // Call the congregation-login API
        const response = await fetch('/api/congregation-login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            congregationName: trimmedName,
            pin
          }),
        });

        const data = await response.json();
        console.log('Congregation login API response:', data);

        if (!response.ok) {
          setError(data.error || 'Failed to login');
          setLoading(false);
          return;
        }

        // Set the session from the API response
        if (data.session) {
          const { access_token, refresh_token } = data.session;

          // Set the session in Supabase
          const { error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token
          });

          if (sessionError) {
            console.error('Error setting session:', sessionError);
            setError('Error setting session: ' + sessionError.message);
            setLoading(false);
            return;
          }

          console.log('Login successful for congregation:', data.congregation.name);

          // Store congregation data in localStorage
          if (data.congregation) {
            localStorage.setItem('congregationData', JSON.stringify({
              id: data.congregation.id,
              name: data.congregation.name,
              location: '' // Set empty location since the column doesn't exist
            }));
            console.log('Stored congregation data in localStorage');
          }

          // Call the success callback
          if (onSuccess) {
            onSuccess();
          }

          // Redirect to role selection page
          window.location.href = '/role-selection';

          return;
        } else {
          setError('No session returned from the server');
          setLoading(false);
          return;
        }
      } catch (apiErr: any) {
        console.error('Error in login process:', apiErr);
        setError('Error connecting to the server. Please try again.');
        setLoading(false);
        return;
      }
    } catch (err: any) {
      console.error('Unexpected error in login form:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="login-form-wrapper">
      <h3 className="form-title">Congregation Access</h3>

      <form onSubmit={handleSubmit} className="login-form">
        <div className="input-group">
          <label htmlFor="congregation-name" className="input-label">Congregation Name</label>
          <div className="autocomplete-container">
            <div className="input-wrapper">
              <Building className="input-icon" size={20} />
              <input
                type="text"
                id="congregation-name"
                ref={inputRef}
                value={congregationName}
                onChange={(e) => setCongregationName(e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                placeholder="Enter congregation name"
                required
                autoComplete="off"
                className="input-field with-icon"
              />
              {fetchingSuggestions && (
                <div className="loading-indicator">
                  <Loader2 className="spinner" size={16} />
                </div>
              )}
            </div>

            {showSuggestions && (
              <div className="suggestions-container" ref={suggestionsRef}>
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="suggestion-item"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <Search size={14} className="suggestion-icon" />
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="pin" className="input-label">PIN Code</label>
          <div className="input-wrapper">
            <Lock className="input-icon" size={20} />
            <input
              type="password"
              id="pin"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Same as your Zoom PIN"
              required
              className="input-field with-icon"
            />
          </div>
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={18} className="error-icon" />
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin mr-2" />
              Logging in...
            </>
          ) : 'Login'}
        </button>

        <div className="request-link">
          <p>Need access for your congregation?</p>
          <a href="/request-congregation">Request Access</a>
        </div>
      </form>

      <style jsx>{`
        .login-form-wrapper {
          width: 100%;
        }
        
        .form-title {
          text-align: center;
          color: var(--color-text-secondary);
          margin: 0 0 var(--space-6) 0;
          font-size: 1.125rem;
          font-weight: 500;
        }
        
        .login-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        
        .input-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        
        .input-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text-main);
        }
        
        .input-wrapper {
          position: relative;
        }
        
        .input-icon {
          position: absolute;
          left: var(--space-3);
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-text-tertiary);
          pointer-events: none;
        }
        
        .input-field {
          width: 100%;
          padding: var(--space-3);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          font-size: 1rem;
          transition: all 0.2s ease;
          background-color: var(--color-bg-input);
          color: var(--color-text-main);
        }
        
        .input-field.with-icon {
          padding-left: var(--space-10);
        }
        
        .input-field:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px var(--color-primary-light);
          background-color: var(--color-bg-card);
        }
        
        .error-message {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          color: var(--color-error);
          background-color: var(--color-error-bg);
          padding: var(--space-3);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        
        .error-icon {
          flex-shrink: 0;
        }
        
        /* Autocomplete styles */
        .autocomplete-container {
          position: relative;
          width: 100%;
        }
        
        .suggestions-container {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          max-height: 200px;
          overflow-y: auto;
          background-color: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-top: none;
          border-radius: 0 0 var(--radius-md) var(--radius-md);
          z-index: 10;
          box-shadow: var(--shadow-lg);
          margin-top: 4px;
        }
        
        .suggestion-item {
          padding: var(--space-3) var(--space-4);
          cursor: pointer;
          transition: background-color 0.2s;
          font-size: 0.95rem;
          color: var(--color-text-main);
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        
        .suggestion-icon {
          color: var(--color-text-tertiary);
        }
        
        .suggestion-item:hover {
          background-color: var(--color-bg-surface);
          color: var(--color-primary);
        }
        
        .suggestion-item:hover .suggestion-icon {
          color: var(--color-primary);
        }
        
        .loading-indicator {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
        }
        
        .spinner {
          animation: spin 1s linear infinite;
          color: var(--color-primary);
        }
        
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        
        .request-link {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: var(--space-4);
          padding-top: var(--space-4);
          border-top: 1px solid var(--color-border);
        }
        
        .request-link p {
          margin: 0 0 var(--space-2) 0;
          color: var(--color-text-secondary);
          font-size: 0.875rem;
        }
        
        .request-link a {
          color: var(--color-primary);
          text-decoration: none;
          font-weight: 600;
          font-size: 0.875rem;
          transition: color 0.2s;
        }
        
        .request-link a:hover {
          color: var(--color-primary-hover);
          text-decoration: underline;
        }
        
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius-lg);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
          font-size: 1rem;
        }
        
        .btn-primary {
          background-color: var(--color-primary);
          color: white;
        }
        
        .btn-primary:hover:not(:disabled) {
          background-color: var(--color-primary-hover);
          transform: translateY(-1px);
        }
        
        .btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .w-full { width: 100%; }
        .mr-2 { margin-right: var(--space-2); }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

export default LoginForm;

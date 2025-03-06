import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../supabase/config';

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
    <div className="login-form-container">
      <p className="subtitle">Congregation Access</p>
      
      <form onSubmit={handleSubmit} className="login-form">
        <div className="form-group">
          <label htmlFor="congregation-name">Congregation Name</label>
          <div className="autocomplete-container">
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
              className="full-width-input"
            />
            {fetchingSuggestions && (
              <div className="loading-indicator">
                <div className="spinner"></div>
              </div>
            )}
            {showSuggestions && (
              <div className="suggestions-container" ref={suggestionsRef}>
                {suggestions.map((suggestion, index) => (
                  <div 
                    key={index} 
                    className="suggestion-item"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="pin">PIN Code</label>
          <input
            type="password"
            id="pin"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Same as your Zoom PIN"
            required
          />
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <button 
          type="submit" 
          className="login-button"
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
        
        <div className="request-link">
          <p>Need access for your congregation?</p>
          <a href="/request-congregation">Request Access</a>
        </div>
      </form>
      
      <style jsx>{`
        .login-form-container {
          width: 100%;
          padding: 2rem;
        }
        
        .subtitle {
          text-align: center;
          color: #666;
          margin-bottom: 2rem;
          font-size: 1.2rem;
        }
        
        .login-form {
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
          font-weight: 600;
          color: #444;
          font-size: 0.95rem;
        }
        
        input {
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 1rem;
          transition: all 0.2s;
          width: 100%;
          background-color: #f9fafb;
        }
        
        input:focus {
          border-color: #4a90e2;
          outline: none;
          box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
          background-color: white;
        }
        
        .error-message {
          color: #e53e3e;
          background-color: #fff5f5;
          padding: 0.75rem;
          border-radius: 8px;
          font-size: 0.9rem;
        }
        
        .login-button {
          background-color: #4a90e2;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.85rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .login-button:hover {
          background-color: #3a7bc8;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .login-button:disabled {
          background-color: #a0aec0;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
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
          background-color: white;
          border: 1px solid #ddd;
          border-top: none;
          border-radius: 0 0 8px 8px;
          z-index: 10;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .suggestion-item {
          padding: 0.75rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .suggestion-item:hover {
          background-color: #f7fafc;
        }
        
        .loading-indicator {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
        }
        
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(0, 0, 0, 0.1);
          border-top-color: #4a90e2;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        
        .full-width-input {
          width: 100%;
        }
        
        .request-link {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #eee;
        }
        
        .request-link p {
          margin: 0 0 0.5rem 0;
          color: #666;
          font-size: 0.95rem;
        }
        
        .request-link a {
          color: #4a90e2;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
        }
        
        .request-link a:hover {
          color: #3a7bc8;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default LoginForm; 
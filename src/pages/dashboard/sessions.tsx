import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../../supabase/config';
import SessionCodeDisplay from '../../components/SessionCodeDisplay';
import { createSession, endSession, SessionData } from '../../utils/session';

export default function SessionsDashboard() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [congregationName, setCongregationName] = useState('');
  const [congregationId, setCongregationId] = useState('');
  const [userId, setUserId] = useState('');
  const [activeSession, setActiveSession] = useState<SessionData | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);

  // Fetch user data and sessions on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setError('You must be logged in to view this page');
          setLoading(false);
          return;
        }
        
        setUserId(user.id);
        
        // Get user's congregation
        const { data: userRoles, error: userRolesError } = await supabase
          .from('user_roles')
          .select('congregation_id, role')
          .eq('user_id', user.id)
          .eq('role', 'congregation_admin')
          .single();
        
        if (userRolesError || !userRoles) {
          setError('You do not have permission to manage sessions');
          setLoading(false);
          return;
        }
        
        setCongregationId(userRoles.congregation_id);
        
        // Get congregation name
        const { data: congregation, error: congregationError } = await supabase
          .from('congregations')
          .select('name')
          .eq('id', userRoles.congregation_id)
          .single();
        
        if (congregationError || !congregation) {
          setError('Failed to load congregation data');
          setLoading(false);
          return;
        }
        
        setCongregationName(congregation.name);
        
        // Fetch sessions for this congregation
        await fetchSessions(userRoles.congregation_id);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, []);

  // Fetch sessions for a congregation
  const fetchSessions = async (congregationId: string) => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('congregation_id', congregationId)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      setSessions(data || []);
      
      // Check if there's an active session
      const active = data?.find(session => 
        session.is_active && new Date(session.expires_at) > new Date()
      );
      
      if (active) {
        setActiveSession(active);
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError('Failed to load sessions');
    }
  };

  // Handle creating a new session
  const handleCreateSession = async () => {
    if (!congregationId || !userId) {
      setError('Missing required data to create session');
      return;
    }
    
    setCreatingSession(true);
    
    try {
      const session = await createSession(congregationId, userId);
      
      if (session) {
        setActiveSession(session);
        setSessions(prev => [session, ...prev]);
      } else {
        setError('Failed to create session');
      }
    } catch (err) {
      console.error('Error creating session:', err);
      setError('Failed to create session');
    } finally {
      setCreatingSession(false);
    }
  };

  // Handle ending an active session
  const handleEndSession = async (sessionId: string) => {
    try {
      const success = await endSession(sessionId);
      
      if (success) {
        setActiveSession(null);
        
        // Update the sessions list
        setSessions(prev => 
          prev.map(session => 
            session.id === sessionId 
              ? { ...session, is_active: false } 
              : session
          )
        );
      } else {
        setError('Failed to end session');
      }
    } catch (err) {
      console.error('Error ending session:', err);
      setError('Failed to end session');
    }
  };

  return (
    <div className="container">
      <Head>
        <title>Session Management - Not At Home</title>
        <meta name="description" content="Manage outreach sessions for your congregation" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <main>
        <div className="content-container">
          <div className="header">
            <Link href="/dashboard" className="back-link">← Back to Dashboard</Link>
            <h1>Session Management</h1>
            <p className="description">Create and manage outreach sessions for {congregationName}</p>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading sessions...</p>
            </div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            <>
              {activeSession ? (
                <div className="active-session">
                  <div className="session-header">
                    <h2>Active Session</h2>
                    <button 
                      onClick={() => handleEndSession(activeSession.id)}
                      className="end-button"
                    >
                      End Session
                    </button>
                  </div>
                  
                  <SessionCodeDisplay 
                    sessionCode={activeSession.code}
                    congregationName={congregationName}
                  />
                  
                  <div className="session-info">
                    <p>
                      <strong>Created:</strong> {new Date(activeSession.created_at).toLocaleString()}
                    </p>
                    <p>
                      <strong>Expires:</strong> {new Date(activeSession.expires_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="create-session">
                  <p>No active session. Create a new session to start tracking locations.</p>
                  <button 
                    onClick={handleCreateSession}
                    disabled={creatingSession}
                    className="create-button"
                  >
                    {creatingSession ? 'Creating...' : 'Create New Session'}
                  </button>
                </div>
              )}

              <div className="sessions-list">
                <h2>Recent Sessions</h2>
                
                {sessions.length === 0 ? (
                  <p className="no-sessions">No sessions found</p>
                ) : (
                  <div className="sessions-table">
                    <div className="table-header">
                      <div className="col-code">Code</div>
                      <div className="col-created">Created</div>
                      <div className="col-status">Status</div>
                    </div>
                    
                    {sessions.map(session => (
                      <div key={session.id} className="table-row">
                        <div className="col-code">{session.code}</div>
                        <div className="col-created">
                          {new Date(session.created_at).toLocaleDateString()}
                        </div>
                        <div className="col-status">
                          <span className={`status-badge ${session.is_active ? 'active' : 'inactive'}`}>
                            {session.is_active ? 'Active' : 'Ended'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <footer>
        <div className="footer-content">
          <Link href="/" className="footer-link">Home</Link>
          <span className="divider">•</span>
          <span className="copyright">© 2024 Not At Home</span>
        </div>
      </footer>

      <style jsx>{`
        :root {
          --primary-color: #2563eb;
          --primary-hover: #1d4ed8;
          --danger-color: #ef4444;
          --danger-hover: #dc2626;
          --success-color: #10b981;
          --warning-color: #f59e0b;
          --text-color: #111827;
          --text-secondary: #4b5563;
          --background-color: #ffffff;
          --border-color: #e5e7eb;
          --spacing-xs: 0.5rem;
          --spacing-sm: 1rem;
          --spacing-md: 1.5rem;
          --spacing-lg: 2rem;
          --spacing-xl: 3rem;
        }

        .container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: var(--background-color);
          color: var(--text-color);
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        }

        main {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: var(--spacing-md);
          width: 100%;
        }

        .content-container {
          width: 100%;
          max-width: 800px;
        }

        .header {
          margin-bottom: var(--spacing-lg);
        }

        .back-link {
          display: inline-block;
          margin-bottom: var(--spacing-sm);
          color: var(--primary-color);
          text-decoration: none;
          font-size: 0.875rem;
        }

        .back-link:hover {
          text-decoration: underline;
        }

        h1 {
          margin: 0 0 var(--spacing-xs);
          font-size: 1.875rem;
          font-weight: 700;
          color: var(--text-color);
        }

        h2 {
          margin: 0 0 var(--spacing-md);
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-color);
        }

        .description {
          margin: 0;
          color: var(--text-secondary);
          font-size: 1rem;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-xl) 0;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(37, 99, 235, 0.1);
          border-radius: 50%;
          border-top-color: var(--primary-color);
          animation: spin 1s linear infinite;
          margin-bottom: var(--spacing-md);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-container p {
          color: var(--text-secondary);
          margin: 0;
        }

        .error-message {
          padding: var(--spacing-md);
          background-color: rgba(239, 68, 68, 0.1);
          border-radius: 8px;
          color: var(--danger-color);
          margin-bottom: var(--spacing-lg);
        }

        .active-session {
          background-color: white;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: var(--spacing-lg);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          margin-bottom: var(--spacing-lg);
        }

        .session-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-md);
        }

        .session-header h2 {
          margin: 0;
        }

        .end-button {
          padding: 0.5rem 1rem;
          background-color: var(--danger-color);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }

        .end-button:hover {
          background-color: var(--danger-hover);
        }

        .session-info {
          margin-top: var(--spacing-md);
          font-size: 0.875rem;
        }

        .session-info p {
          margin: var(--spacing-xs) 0;
          color: var(--text-secondary);
        }

        .create-session {
          background-color: white;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: var(--spacing-lg);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          margin-bottom: var(--spacing-lg);
          text-align: center;
        }

        .create-session p {
          margin: 0 0 var(--spacing-md);
          color: var(--text-secondary);
        }

        .create-button {
          padding: 0.75rem 1.5rem;
          background-color: var(--primary-color);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }

        .create-button:hover:not(:disabled) {
          background-color: var(--primary-hover);
        }

        .create-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .sessions-list {
          background-color: white;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: var(--spacing-lg);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .no-sessions {
          text-align: center;
          color: var(--text-secondary);
          padding: var(--spacing-lg) 0;
        }

        .sessions-table {
          width: 100%;
          border-collapse: collapse;
        }

        .table-header {
          display: flex;
          padding: var(--spacing-sm) 0;
          border-bottom: 1px solid var(--border-color);
          font-weight: 600;
          font-size: 0.875rem;
        }

        .table-row {
          display: flex;
          padding: var(--spacing-sm) 0;
          border-bottom: 1px solid var(--border-color);
          font-size: 0.875rem;
        }

        .table-row:last-child {
          border-bottom: none;
        }

        .col-code {
          flex: 1;
        }

        .col-created {
          flex: 2;
        }

        .col-status {
          flex: 1;
          text-align: right;
        }

        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .active {
          background-color: rgba(16, 185, 129, 0.1);
          color: var(--success-color);
        }

        .inactive {
          background-color: rgba(107, 114, 128, 0.1);
          color: var(--text-secondary);
        }

        footer {
          width: 100%;
          padding: var(--spacing-md);
          border-top: 1px solid var(--border-color);
        }

        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .footer-link {
          color: var(--text-secondary);
          text-decoration: none;
        }

        .footer-link:hover {
          color: var(--text-color);
        }

        .divider {
          margin: 0 var(--spacing-xs);
        }

        .copyright {
          color: var(--text-secondary);
        }

        @media (min-width: 768px) {
          main {
            padding-top: var(--spacing-xl);
          }
          
          h1 {
            font-size: 2.25rem;
          }
        }
      `}</style>
    </div>
  );
} 
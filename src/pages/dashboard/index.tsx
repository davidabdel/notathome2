import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../../supabase/config';
import { createSession, endSession, generateSessionCode } from '../../utils/session';
import EnhancedMapSelectionModal from '../../components/EnhancedMapSelectionModal';
import ShareSessionModal from '../../components/ShareSessionModal';
import ShareSessionDataModal from '../../components/ShareSessionDataModal';

export default function GroupOverseerDashboard() {
  const router = useRouter();
  const [sessionCode, setSessionCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [creatingSession, setCreatingSession] = useState(false);
  const [endingSession, setEndingSession] = useState(false);
  const [error, setError] = useState('');
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [congregationName, setCongregationName] = useState('');
  const [congregationId, setCongregationId] = useState('');
  const [userId, setUserId] = useState('');
  const [creatingTable, setCreatingTable] = useState(false);
  const [tableCreated, setTableCreated] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sessionToShare, setSessionToShare] = useState<string>('');
  const [creatingAddressesTable, setCreatingAddressesTable] = useState(false);
  const [addressesTableCreated, setAddressesTableCreated] = useState(false);
  const [addressesTableError, setAddressesTableError] = useState<string | null>(null);
  const [allOpenSessions, setAllOpenSessions] = useState<any[]>([]);
  const [isShareDataModalOpen, setIsShareDataModalOpen] = useState(false);
  const [sessionToShareData, setSessionToShareData] = useState<string>('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        
        // Check if user is logged in
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // Redirect to login if not logged in
          router.push('/');
          return;
        }
        
        setUserId(session.user.id);
        
        // Check if user has selected the Group Overseer role
        const selectedRole = localStorage.getItem('userRole');
        if (selectedRole !== 'group_overseer') {
          // Redirect to role selection if not a group overseer
          router.push('/role-selection');
          return;
        }
        
        // Get user's congregation from user_roles table
        const { data: userRoleData } = await supabase
          .from('user_roles')
          .select('congregation_id')
          .eq('user_id', session.user.id)
          .single();
        
        if (userRoleData && userRoleData.congregation_id) {
          setCongregationId(userRoleData.congregation_id);
          
          // Get congregation name
          const { data: congregation } = await supabase
            .from('congregations')
            .select('name')
            .eq('id', userRoleData.congregation_id)
            .single();
          
          if (congregation) {
            setCongregationName(congregation.name);
          }
          
          // Check for active sessions created by this user
          try {
            const { data: sessions, error } = await supabase
              .from('sessions')
              .select('*')
              .eq('congregation_id', userRoleData.congregation_id)
              .eq('is_active', true)
              .eq('created_by', session.user.id)
              .order('created_at', { ascending: false });
            
            if (!error && sessions && sessions.length > 0) {
              setActiveSessions(sessions);
              // Select the most recent session by default
              setSelectedSession(sessions[0]);
              setSessionCode(sessions[0].code);
            } else {
              setActiveSessions([]);
              setSelectedSession(null);
            }
          } catch (err) {
            console.error('Error checking for active sessions:', err);
            // Don't set an error message here, as the sessions table might not exist yet
          }
          
          // Get all open sessions for this congregation (not just created by this user)
          try {
            console.log('Fetching all open sessions for congregation:', userRoleData.congregation_id);
            const { data: allSessions, error: allSessionsError } = await supabase
              .from('sessions')
              .select('*')
              .eq('congregation_id', userRoleData.congregation_id)
              .eq('is_active', true)
              .order('created_at', { ascending: false });
            
            if (allSessionsError) {
              console.error('Error fetching all open sessions:', allSessionsError);
            } else if (allSessions) {
              console.log('All open sessions:', allSessions);
              setAllOpenSessions(allSessions);
            }
          } catch (err) {
            console.error('Error fetching all open sessions:', err);
          }
        }
      } catch (err) {
        console.error('Error checking auth status:', err);
        setError('Error loading session information');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);
  
  const handleStartSession = async () => {
    if (!congregationId) {
      setError('No congregation found for this user');
      return;
    }
    
    try {
      setError('');
      
      // Check if the sessions table exists
      try {
        const { error: tableCheckError } = await supabase
          .from('sessions')
          .select('id')
          .limit(1);
        
        if (tableCheckError && tableCheckError.code === '42P01') {
          // Table doesn't exist
          setError('Sessions table does not exist. Please set up the database first.');
          return;
        }
      } catch (tableErr) {
        console.error('Error checking sessions table:', tableErr);
      }
      
      // Open the map selection modal
      setIsMapModalOpen(true);
    } catch (err) {
      console.error('Error preparing to create session:', err);
      setError('Error preparing to create session. Please try again.');
    }
  };
  
  const handleCreateSessionWithMap = async (mapNumber: number) => {
    try {
      setCreatingSession(true);
      setIsMapModalOpen(false);
      setError('');
      
      console.log('Starting session creation with map number:', mapNumber);
      console.log('Congregation ID:', congregationId);
      console.log('User ID:', userId);
      
      // Validate inputs before calling createSession
      if (!congregationId) {
        setError('No congregation found for this user. Please refresh and try again.');
        setCreatingSession(false);
        return;
      }
      
      if (!userId) {
        setError('User ID not found. Please refresh and try again.');
        setCreatingSession(false);
        return;
      }
      
      // Check if the sessions table exists
      try {
        const { error: tableCheckError } = await supabase
          .from('sessions')
          .select('id')
          .limit(1);
        
        if (tableCheckError && tableCheckError.code === '42P01') {
          // Table doesn't exist
          setError('Sessions table does not exist. Please set up the database first.');
          setCreatingSession(false);
          return;
        }
        
        console.log('Sessions table exists, proceeding with session creation');
      } catch (tableErr) {
        console.error('Error checking sessions table:', tableErr);
      }
      
      // Check if the user has the correct role for this congregation
      try {
        console.log('Checking user role for congregation...');
        const { data: userRole, error: roleError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', userId)
          .eq('congregation_id', congregationId)
          .single();
        
        if (roleError) {
          console.error('Error checking user role:', roleError);
          setError(`Failed to verify user role: ${roleError.message}`);
          setCreatingSession(false);
          return;
        }
        
        if (!userRole) {
          console.error('No user role found for this congregation');
          setError('You do not have permission to create sessions for this congregation');
          setCreatingSession(false);
          return;
        }
        
        console.log('User role verified:', userRole);
      } catch (roleErr) {
        console.error('Exception checking user role:', roleErr);
      }
      
      // Try to directly insert a session using supabase to see the exact error
      try {
        console.log('Attempting direct session insert...');
        const sessionCode = generateSessionCode();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        
        const sessionData = {
          code: sessionCode,
          congregation_id: congregationId,
          created_by: userId,
          expires_at: expiresAt.toISOString(),
          is_active: true,
          map_number: mapNumber
        };
        
        console.log('Session data:', sessionData);
        
        const { data: directData, error: directError } = await supabase
          .from('sessions')
          .insert(sessionData)
          .select()
          .single();
        
        if (directError) {
          console.error('Direct insert error:', directError);
          setError(`Failed to create session: ${directError.message}`);
          setCreatingSession(false);
          return;
        }
        
        console.log('Direct insert successful:', directData);
        // Add the new session to the list of active sessions
        setActiveSessions(prev => [directData, ...prev]);
        setSelectedSession(directData);
        setSessionCode(directData.code);
        setCreatingSession(false);
        return;
      } catch (directErr) {
        console.error('Exception in direct insert:', directErr);
      }
      
      // If direct insert fails, try the original method
      console.log('Falling back to createSession utility...');
      const newSession = await createSession(congregationId, userId, mapNumber);
      
      if (newSession) {
        console.log('Session created successfully:', newSession);
        // Add the new session to the list of active sessions
        setActiveSessions(prev => [newSession, ...prev]);
        setSelectedSession(newSession);
        setSessionCode(newSession.code);
      } else {
        console.error('Failed to create session - returned null');
        setError('Failed to create session. Please check console for details.');
      }
    } catch (err) {
      console.error('Exception in handleCreateSessionWithMap:', err);
      setError(`Error creating session: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setCreatingSession(false);
    }
  };
  
  const handleEndSession = async () => {
    if (!selectedSession) {
      setError('No active session to end');
      return;
    }
    
    try {
      // Store session ID for sharing
      const sessionIdToShare = selectedSession.id;
      
      // Show the share data modal first
      setSessionToShareData(sessionIdToShare);
      setIsShareDataModalOpen(true);
      
      // Don't delete the session here - it will be deleted after sharing in the ShareSessionDataModal
    } catch (err) {
      console.error('Error preparing to end session:', err);
      setError('Error preparing to end session');
    }
  };
  
  const handleSessionCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numeric input
    const numericValue = e.target.value.replace(/[^0-9]/g, '');
    setSessionCode(numericValue);
  };
  
  const handleEnterSession = async () => {
    if (!sessionCode.trim()) {
      setError('Please enter a session code');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Find the session by code
      const { data, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('code', sessionCode.toUpperCase())
        .single();
      
      if (sessionError || !data) {
        setError('Invalid session code. Please check and try again.');
        setLoading(false);
        return;
      }
      
      if (!data.is_active) {
        setError('This session is no longer active.');
        setLoading(false);
        return;
      }
      
      // Set as active session
      setSelectedSession(data);
      
      // Redirect to the session page
      router.push(`/session/${data.id}`);
    } catch (err) {
      console.error('Error joining session:', err);
      setError('Failed to join session. Please try again.');
      setLoading(false);
    }
  };
  
  const handleChangeRole = () => {
    // Change role to publisher
    localStorage.setItem('userRole', 'publisher');
    router.push('/role-selection');
  };
  
  const createSessionsTable = async () => {
    try {
      setCreatingTable(true);
      setError('');
      
      console.log('Attempting to create/fix sessions table...');
      
      const response = await fetch('/api/create-sessions-table', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      console.log('Create sessions table response:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create sessions table');
      }
      
      setTableCreated(true);
      setError('');
      
      // Check if the sessions table exists and has the map_number column
      try {
        console.log('Verifying sessions table structure...');
        const { error: tableCheckError } = await supabase
          .from('sessions')
          .select('map_number')
          .limit(1);
        
        if (tableCheckError) {
          console.error('Error verifying sessions table:', tableCheckError);
          if (tableCheckError.message.includes('column "map_number" does not exist')) {
            setError('Sessions table still missing map_number column. Please try again.');
            setTableCreated(false);
            return;
          }
        }
        
        console.log('Sessions table structure verified successfully');
      } catch (verifyErr) {
        console.error('Error verifying sessions table:', verifyErr);
      }
      
      // Reload the page after a short delay
      console.log('Reloading page in 1.5 seconds...');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error('Error creating sessions table:', err);
      setError(err.message || 'Failed to create sessions table');
      setTableCreated(false);
    } finally {
      setCreatingTable(false);
    }
  };
  
  const checkAndFixRlsPolicies = async () => {
    try {
      setCreatingTable(true);
      setError('');
      
      console.log('Checking and fixing RLS policies...');
      
      const response = await fetch('/api/check-rls-policies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      console.log('Check RLS policies response:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check RLS policies');
      }
      
      setTableCreated(true);
      setError('');
      
      // Reload the page after a short delay
      console.log('Reloading page in 1.5 seconds...');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error('Error checking RLS policies:', err);
      setError(err.message || 'Failed to check RLS policies');
      setTableCreated(false);
    } finally {
      setCreatingTable(false);
    }
  };
  
  const refreshSchemaCache = async () => {
    try {
      setCreatingTable(true);
      setError('');
      
      console.log('Refreshing schema cache...');
      
      const response = await fetch('/api/refresh-schema', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      console.log('Refresh schema response:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to refresh schema cache');
      }
      
      setTableCreated(true);
      setError('');
      
      // Reload the page after a short delay
      console.log('Reloading page in 1.5 seconds...');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error('Error refreshing schema cache:', err);
      setError(err.message || 'Failed to refresh schema cache');
      setTableCreated(false);
    } finally {
      setCreatingTable(false);
    }
  };
  
  const createAddressesTable = async () => {
    try {
      setCreatingAddressesTable(true);
      setAddressesTableError(null);
      
      console.log('Attempting to create addresses table...');
      
      const response = await fetch('/api/create-addresses-table', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      console.log('Create addresses table response:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create addresses table');
      }
      
      setAddressesTableCreated(true);
      
      // Reload the page after a short delay
      console.log('Reloading page in 1.5 seconds...');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error('Error creating addresses table:', err);
      setAddressesTableError(err.message || 'Failed to create addresses table');
      setAddressesTableCreated(false);
    } finally {
      setCreatingAddressesTable(false);
    }
  };
  
  const handleEndAnySession = async (sessionId: string) => {
    try {
      setError('');
      
      // Show the share data modal first
      setSessionToShareData(sessionId);
      setIsShareDataModalOpen(true);
      
      // Don't delete the session here - it will be deleted after sharing in the ShareSessionDataModal
    } catch (err) {
      console.error('Error preparing to end session:', err);
      setError('Error preparing to end session');
    }
  };
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }
  
  return (
    <div className="container">
      <Head>
        <title>Group Overseer Dashboard - Not At Home</title>
        <meta name="description" content="Manage outreach sessions" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <header className="header">
        <h1 className="title">Not at Home</h1>
        <button onClick={handleChangeRole} className="change-role-btn">
          Change Role
        </button>
      </header>
      
      <main>
        <div className="content-container">
          {error && error.includes('Sessions table does not exist') ? (
            <div className="setup-container">
              <div className="error-message">{error}</div>
              <button 
                className="setup-button"
                onClick={createSessionsTable}
                disabled={creatingTable || tableCreated}
              >
                {creatingTable ? 'Creating Table...' : tableCreated ? 'Table Created!' : 'Create Sessions Table'}
              </button>
            </div>
          ) : error && (error.includes('Failed to create session') || error.includes('map_number')) ? (
            <div className="setup-container">
              <div className="error-message">{error}</div>
              <button 
                className="setup-button"
                onClick={createSessionsTable}
                disabled={creatingTable || tableCreated}
              >
                {creatingTable ? 'Fixing Table...' : tableCreated ? 'Table Fixed!' : 'Fix Sessions Table'}
              </button>
              <button 
                className="setup-button secondary"
                onClick={checkAndFixRlsPolicies}
                disabled={creatingTable || tableCreated}
              >
                {creatingTable ? 'Fixing Policies...' : tableCreated ? 'Policies Fixed!' : 'Fix RLS Policies'}
              </button>
              <button 
                className="setup-button refresh"
                onClick={refreshSchemaCache}
                disabled={creatingTable || tableCreated}
              >
                {creatingTable ? 'Refreshing Cache...' : tableCreated ? 'Cache Refreshed!' : 'Refresh Schema Cache'}
              </button>
              <p className="help-text">
                This will update the sessions table structure, fix security policies, and refresh the schema cache.
              </p>
            </div>
          ) : (
            <>
              <button 
                className="session-button start-session"
                onClick={handleStartSession}
                disabled={creatingSession}
              >
                {creatingSession ? 'Starting...' : 'Start Group Session'}
              </button>
              
              <div className="session-code-container">
                <p className="or-text">OR ENTER EXISTING SESSION CODE</p>
                <input
                  type="text"
                  value={sessionCode}
                  onChange={handleSessionCodeChange}
                  placeholder="Enter session code"
                  maxLength={4}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  className="session-code-input"
                  disabled={!!selectedSession}
                />
                {!selectedSession && sessionCode && (
                  <button 
                    className="enter-session-btn"
                    onClick={handleEnterSession}
                  >
                    Go
                  </button>
                )}
              </div>
              
              {activeSessions.length > 0 && (
                <div className="active-sessions-container">
                  <h3 className="sessions-heading">Your Active Sessions</h3>
                  
                  {activeSessions.map((session) => (
                    <div 
                      key={session.id} 
                      className={`session-card ${selectedSession?.id === session.id ? 'selected' : ''}`}
                      onClick={() => setSelectedSession(session)}
                    >
                      <div className="session-card-details">
                        <div className="session-code-display">
                          <p className="session-code">Code: <strong>{session.code}</strong></p>
                          {session.map_number && (
                            <p className="map-number">Map: <strong>{session.map_number}</strong></p>
                          )}
                          <p className="session-time">
                            Started: {new Date(session.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </div>
                      </div>
                      
                      <button 
                        className="share-button-card"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSessionToShare(session.code);
                          setIsShareModalOpen(true);
                        }}
                        aria-label="Share session code"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="18" cy="5" r="3"></circle>
                          <circle cx="6" cy="12" r="3"></circle>
                          <circle cx="18" cy="19" r="3"></circle>
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                        </svg>
                      </button>
                      
                      <button 
                        className="end-session-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSession(session);
                          handleEndSession();
                        }}
                      >
                        <span className="icon">🕒</span>
                        End
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {selectedSession && (
                <div className="selected-session-info">
                  <p className="session-info-label">Selected Session</p>
                  <div className="session-details">
                    <div className="session-code-row">
                      <p className="session-code">Session Code: <strong>{selectedSession.code}</strong></p>
                      <button 
                        className="share-button"
                        onClick={() => {
                          setSessionToShare(selectedSession.code);
                          setIsShareModalOpen(true);
                        }}
                        aria-label="Share session code"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="18" cy="5" r="3"></circle>
                          <circle cx="6" cy="12" r="3"></circle>
                          <circle cx="18" cy="19" r="3"></circle>
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                        </svg>
                      </button>
                    </div>
                    {selectedSession.map_number && (
                      <p className="map-number">Map: <strong>{selectedSession.map_number}</strong></p>
                    )}
                  </div>
                </div>
              )}
              
              <button 
                className="session-button end-session"
                onClick={handleEndSession}
                disabled={endingSession || !selectedSession}
              >
                <span className="icon">🕒</span>
                {endingSession ? 'Ending...' : 'End Selected Session'}
              </button>
              
              {error && <div className="error-message">{error}</div>}
              
              {allOpenSessions.length > 0 && (
                <div className="all-sessions-container">
                  <h3 className="sessions-heading">All Open Sessions in {congregationName}</h3>
                  
                  <div className="sessions-table">
                    <div className="table-header">
                      <div className="col-code">Code</div>
                      <div className="col-map">Map</div>
                      <div className="col-time">Started</div>
                      <div className="col-actions">Actions</div>
                    </div>
                    
                    {allOpenSessions.map((session) => (
                      <div key={session.id} className="table-row">
                        <div className="col-code">{session.code}</div>
                        <div className="col-map">{session.map_number || 'N/A'}</div>
                        <div className="col-time">
                          {new Date(session.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                        <div className="col-actions">
                          <button 
                            className="end-session-btn-small"
                            onClick={() => handleEndAnySession(session.id)}
                          >
                            End Session
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      
      <div className="important-notice">
        <div className="notice-icon">⚠️</div>
        <div className="notice-content">
          <h3>Important Notice!</h3>
          <p>All sessions will delete including the data after 24 hours. Please be sure to share the session data with yourself within this time period. You can do this by tapping on "End Session" and then tap on "Share and End Session".</p>
        </div>
      </div>
      
      {/* Map Selection Modal */}
      <EnhancedMapSelectionModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onSelectMap={handleCreateSessionWithMap}
        congregationId={congregationId}
      />
      
      {/* Share Session Modal */}
      <ShareSessionModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        sessionCode={sessionToShare}
      />
      
      {/* Share Session Data Modal */}
      <ShareSessionDataModal
        isOpen={isShareDataModalOpen}
        onClose={() => setIsShareDataModalOpen(false)}
        sessionId={sessionToShareData}
        congregationName={congregationName}
      />
      
      <style jsx>{`
        .container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: #f9fafb;
          color: #111827;
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
          background-color: white;
        }
        
        .title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
        }
        
        .change-role-btn {
          background-color: white;
          border: 1px solid #d1d5db;
          color: #374151;
          font-size: 0.875rem;
          font-weight: 500;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .change-role-btn:hover {
          background-color: #f3f4f6;
        }
        
        main {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem 1rem;
        }
        
        .content-container {
          width: 100%;
          max-width: 640px;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        
        .session-button {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.25rem;
          border: none;
          border-radius: 0.5rem;
          font-size: 1.125rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .session-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .start-session {
          background-color: #d9f99d;
          color: #365314;
        }
        
        .start-session:hover:not(:disabled) {
          background-color: #bef264;
        }
        
        .end-session {
          background-color: #f3f4f6;
          color: #374151;
        }
        
        .end-session:hover:not(:disabled) {
          background-color: #e5e7eb;
        }
        
        .icon {
          margin-right: 0.75rem;
        }
        
        .session-code-container {
          background-color: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .or-text {
          text-align: center;
          color: #6b7280;
          font-size: 0.875rem;
          font-weight: 500;
          margin-top: 0;
          margin-bottom: 1rem;
        }
        
        .session-code-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 1rem;
          text-align: center;
          letter-spacing: 0.1em;
        }
        
        .session-code-input:disabled {
          background-color: #f3f4f6;
        }
        
        .enter-session-btn {
          margin-top: 0.75rem;
          background-color: #2563eb;
          color: white;
          border: none;
          border-radius: 0.375rem;
          padding: 0.5rem 1rem;
          font-weight: 500;
          cursor: pointer;
        }
        
        .enter-session-btn:hover {
          background-color: #1d4ed8;
        }
        
        .active-sessions-container {
          margin-top: 1.5rem;
          margin-bottom: 1.5rem;
          width: 100%;
        }
        
        .sessions-heading {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
          color: #374151;
        }
        
        .session-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          margin-bottom: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .session-card.selected {
          border: 2px solid #10b981;
        }
        
        .session-card:hover {
          background-color: #f9fafb;
        }
        
        .session-card-details {
          flex: 1;
        }
        
        .session-code-display {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }
        
        .session-code {
          margin: 0;
          font-size: 1rem;
          font-weight: 500;
        }
        
        .map-number {
          margin: 0;
          font-size: 0.9rem;
        }
        
        .session-time {
          font-size: 0.75rem;
          color: #6b7280;
          margin: 0;
        }
        
        .share-button-card {
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: transparent;
          border: none;
          color: #4b5563;
          padding: 0.5rem;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s;
          margin: 0 0.5rem;
        }
        
        .share-button-card:hover {
          background-color: rgba(229, 231, 235, 0.5);
          color: #111827;
        }
        
        .share-button-card svg {
          width: 1.25rem;
          height: 1.25rem;
        }
        
        .end-session-btn {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          background-color: #fee2e2;
          color: #b91c1c;
          border: none;
          padding: 0.375rem 0.5rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          cursor: pointer;
          height: fit-content;
        }
        
        .end-session-btn:hover {
          background-color: #fecaca;
        }
        
        .selected-session-info {
          margin-top: 1.5rem;
          padding: 1rem;
          background-color: #f0fdf4;
          border: 1px solid #d1fae5;
          border-radius: 0.5rem;
          width: 100%;
        }
        
        .session-info-label {
          color: #166534;
          font-size: 0.875rem;
          font-weight: 500;
          margin-top: 0;
          margin-bottom: 0.5rem;
        }
        
        .session-details {
          display: flex;
          justify-content: space-between;
        }
        
        .error-message {
          color: #ef4444;
          background-color: #fee2e2;
          padding: 0.75rem;
          border-radius: 0.375rem;
          text-align: center;
          width: 100%;
        }
        
        .setup-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          width: 100%;
        }
        
        .setup-button {
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.375rem;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .setup-button:hover:not(:disabled) {
          background-color: #2563eb;
        }
        
        .setup-button.secondary {
          background-color: #4b5563;
          margin-top: 0.5rem;
        }
        
        .setup-button.secondary:hover:not(:disabled) {
          background-color: #374151;
        }
        
        .setup-button.refresh {
          background-color: #0ea5e9;
          margin-top: 0.5rem;
        }
        
        .setup-button.refresh:hover:not(:disabled) {
          background-color: #0284c7;
        }
        
        .setup-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .help-text {
          color: #6b7280;
          font-size: 0.875rem;
          text-align: center;
          margin-top: 0.5rem;
        }
        
        .loading-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-color: #f9fafb;
        }
        
        .spinner {
          width: 2.5rem;
          height: 2.5rem;
          border: 3px solid rgba(0, 0, 0, 0.1);
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }
        
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        
        .session-code-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }
        
        .share-button {
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: transparent;
          border: none;
          color: #4b5563;
          padding: 0.5rem;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .share-button:hover {
          background-color: rgba(229, 231, 235, 0.5);
          color: #111827;
        }
        
        .share-button svg {
          width: 1.25rem;
          height: 1.25rem;
        }
        
        .error-details {
          margin-top: 0.5rem;
          font-size: 0.75rem;
          color: #ef4444;
        }
        
        .all-sessions-container {
          width: 100%;
          margin-top: 2rem;
          background-color: white;
          border-radius: 0.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 1.5rem;
        }
        
        .sessions-table {
          width: 100%;
          margin-top: 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          overflow: hidden;
        }
        
        .table-header {
          display: flex;
          background-color: #f3f4f6;
          font-weight: 600;
          font-size: 0.875rem;
          color: #374151;
          padding: 0.75rem 1rem;
        }
        
        .table-row {
          display: flex;
          border-top: 1px solid #e5e7eb;
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
        }
        
        .col-code {
          width: 20%;
          font-weight: 600;
        }
        
        .col-map {
          width: 20%;
        }
        
        .col-time {
          width: 30%;
        }
        
        .col-actions {
          width: 30%;
          display: flex;
          justify-content: flex-end;
        }
        
        .end-session-btn-small {
          background-color: #ef4444;
          color: white;
          border: none;
          border-radius: 0.375rem;
          padding: 0.375rem 0.75rem;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .end-session-btn-small:hover {
          background-color: #dc2626;
        }
        
        .important-notice {
          margin-top: 2rem;
          margin-bottom: 1rem;
          padding: 1rem;
          background-color: #fff3cd;
          border: 1px solid #ffeeba;
          border-radius: 0.5rem;
          display: flex;
          align-items: flex-start;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .notice-icon {
          font-size: 1.5rem;
          margin-right: 0.75rem;
          padding-top: 0.25rem;
        }
        
        .notice-content h3 {
          margin: 0 0 0.5rem 0;
          color: #856404;
          font-size: 1.1rem;
          font-weight: 600;
        }
        
        .notice-content p {
          margin: 0;
          color: #856404;
          font-size: 0.95rem;
          line-height: 1.5;
        }
        
        @media (max-width: 640px) {
          .sessions-table {
            font-size: 0.75rem;
          }
          
          .table-header, .table-row {
            padding: 0.5rem;
          }
          
          .col-code {
            width: 25%;
          }
          
          .col-map {
            width: 20%;
          }
          
          .col-time {
            width: 25%;
          }
          
          .col-actions {
            width: 30%;
          }
          
          .end-session-btn-small {
            padding: 0.25rem 0.5rem;
            font-size: 0.7rem;
          }
          
          .important-notice {
            padding: 0.75rem;
          }
          
          .notice-icon {
            font-size: 1.25rem;
          }
          
          .notice-content h3 {
            font-size: 1rem;
          }
          
          .notice-content p {
            font-size: 0.85rem;
          }
        }
      `}</style>
    </div>
  );
} 
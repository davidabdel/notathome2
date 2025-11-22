import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../../supabase/config';
import { createSession, endSession, generateSessionCode } from '../../utils/session';
import EnhancedMapSelectionModal from '../../components/EnhancedMapSelectionModal';
import ShareSessionModal from '../../components/ShareSessionModal';
import ShareSessionDataModal from '../../components/ShareSessionDataModal';
import {
  LogOut,
  Plus,
  Play,
  MapPin,
  Clock,
  Share2,
  AlertTriangle,
  RefreshCw,
  Shield,
  Database,
  Loader2,
  ArrowRight,
  Users,
  Hash
} from 'lucide-react';

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

  const handleJoinSessionFromDashboard = async (sessionId: string) => {
    try {
      setLoading(true);
      setError('');

      // Get the current user session
      const { data: { session: userSession } } = await supabase.auth.getSession();

      if (!userSession) {
        setError('You must be logged in to join a session.');
        setLoading(false);
        return;
      }

      // Record the participant joining
      const { error: participantError } = await supabase
        .from('session_participants')
        .insert({
          session_id: sessionId,
          user_id: userSession.user.id,
          joined_at: new Date().toISOString()
        });

      if (participantError) {
        console.error('Error recording participant:', participantError);
        setError('Failed to join session. Please try again.');
        setLoading(false);
        return;
      }

      // Redirect to the session page
      router.push(`/session/${sessionId}`);
    } catch (err) {
      console.error('Error joining session:', err);
      setError('Failed to join session. Please try again.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="loading-container">
          <Loader2 size={40} className="animate-spin text-primary" />
          <p className="loading-text">Loading dashboard...</p>
        </div>
        <style jsx>{`
          .page-wrapper {
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: var(--color-bg-body);
          }
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--space-4);
          }
          .loading-text {
            color: var(--color-text-secondary);
            font-weight: 500;
          }
          .text-primary { color: var(--color-primary); }
          .animate-spin { animation: spin 1s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <Head>
        <title>Group Overseer Dashboard - Not At Home</title>
        <meta name="description" content="Manage outreach sessions" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="header">
        <div className="header-content">
          <h1 className="title">Not at Home</h1>
          <button onClick={handleChangeRole} className="btn btn-outline btn-sm">
            <LogOut size={16} className="mr-2" />
            Change Role
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="content-container">
          {error && error.includes('Sessions table does not exist') ? (
            <div className="card setup-card">
              <div className="alert alert-error mb-4">
                <AlertTriangle size={20} className="mr-2" />
                {error}
              </div>
              <button
                className="btn btn-primary w-full"
                onClick={createSessionsTable}
                disabled={creatingTable || tableCreated}
              >
                {creatingTable ? (
                  <>
                    <Loader2 size={18} className="animate-spin mr-2" />
                    Creating Table...
                  </>
                ) : tableCreated ? (
                  <>
                    <RefreshCw size={18} className="mr-2" />
                    Table Created!
                  </>
                ) : (
                  <>
                    <Database size={18} className="mr-2" />
                    Create Sessions Table
                  </>
                )}
              </button>
            </div>
          ) : error && (error.includes('Failed to create session') || error.includes('map_number')) ? (
            <div className="card setup-card">
              <div className="alert alert-error mb-4">
                <AlertTriangle size={20} className="mr-2" />
                {error}
              </div>
              <div className="flex flex-col gap-3">
                <button
                  className="btn btn-primary w-full"
                  onClick={createSessionsTable}
                  disabled={creatingTable || tableCreated}
                >
                  {creatingTable ? 'Fixing Table...' : tableCreated ? 'Table Fixed!' : 'Fix Sessions Table'}
                </button>
                <button
                  className="btn btn-secondary w-full"
                  onClick={checkAndFixRlsPolicies}
                  disabled={creatingTable || tableCreated}
                >
                  <Shield size={18} className="mr-2" />
                  {creatingTable ? 'Fixing Policies...' : tableCreated ? 'Policies Fixed!' : 'Fix RLS Policies'}
                </button>
                <button
                  className="btn btn-outline w-full"
                  onClick={refreshSchemaCache}
                  disabled={creatingTable || tableCreated}
                >
                  <RefreshCw size={18} className="mr-2" />
                  {creatingTable ? 'Refreshing Cache...' : tableCreated ? 'Cache Refreshed!' : 'Refresh Schema Cache'}
                </button>
              </div>
              <p className="help-text mt-4">
                This will update the sessions table structure, fix security policies, and refresh the schema cache.
              </p>
            </div>
          ) : (
            <>
              <button
                className="btn btn-primary btn-lg w-full start-session-btn"
                onClick={handleStartSession}
                disabled={creatingSession}
              >
                {creatingSession ? (
                  <>
                    <Loader2 size={24} className="animate-spin mr-2" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play size={24} className="mr-2 fill-current" />
                    Start Group Session
                  </>
                )}
              </button>

              <div className="card session-code-card">
                <p className="or-text">OR ENTER EXISTING SESSION CODE</p>
                <div className="code-input-wrapper">
                  <Hash className="input-icon" size={20} />
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
                      className="btn btn-primary go-btn"
                      onClick={handleEnterSession}
                    >
                      Go
                    </button>
                  )}
                </div>
              </div>

              {activeSessions.length > 0 && (
                <div className="active-sessions-section">
                  <h3 className="section-heading">Your Active Sessions</h3>

                  <div className="sessions-list">
                    {activeSessions.map((session) => (
                      <div
                        key={session.id}
                        className={`session-card ${selectedSession?.id === session.id ? 'selected' : ''}`}
                        onClick={() => setSelectedSession(session)}
                      >
                        <div className="session-card-content">
                          <div className="session-info">
                            <div className="session-code-row">
                              <span className="code-label">Code:</span>
                              <span className="code-value">{session.code}</span>
                            </div>
                            {session.map_number && (
                              <div className="session-map-row">
                                <MapPin size={14} className="mr-1 text-tertiary" />
                                <span className="map-label">Map:</span>
                                <span className="map-value">{session.map_number}</span>
                              </div>
                            )}
                            <div className="session-time-row">
                              <Clock size={14} className="mr-1 text-tertiary" />
                              <span className="time-value">
                                {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>

                          <div className="session-actions">
                            <button
                              className="btn-icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSessionToShare(session.code);
                                setIsShareModalOpen(true);
                              }}
                              aria-label="Share session code"
                              title="Share Code"
                            >
                              <Share2 size={18} />
                            </button>

                            <button
                              className="btn-icon btn-icon-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSession(session);
                                handleEndSession();
                              }}
                              title="End Session"
                            >
                              <LogOut size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedSession && (
                <div className="card selected-session-card">
                  <div className="selected-header">
                    <p className="selected-label">Selected Session</p>
                    <div className="selected-code-wrapper">
                      <span className="selected-code">{selectedSession.code}</span>
                      <button
                        className="btn-icon"
                        onClick={() => {
                          setSessionToShare(selectedSession.code);
                          setIsShareModalOpen(true);
                        }}
                        aria-label="Share session code"
                      >
                        <Share2 size={18} />
                      </button>
                    </div>
                  </div>

                  {selectedSession.map_number && (
                    <div className="selected-details">
                      <div className="detail-item">
                        <MapPin size={16} className="mr-2 text-primary" />
                        <span>Map: <strong>{selectedSession.map_number}</strong></span>
                      </div>
                    </div>
                  )}

                  <button
                    className="btn btn-danger w-full mt-4"
                    onClick={handleEndSession}
                    disabled={endingSession}
                  >
                    {endingSession ? (
                      <>
                        <Loader2 size={18} className="animate-spin mr-2" />
                        Ending...
                      </>
                    ) : (
                      <>
                        <LogOut size={18} className="mr-2" />
                        End Selected Session
                      </>
                    )}
                  </button>
                </div>
              )}

              {error && <div className="alert alert-error mt-4"><AlertTriangle size={18} className="mr-2" />{error}</div>}

              {allOpenSessions.length > 0 && (
                <div className="card all-sessions-card mt-6">
                  <h3 className="section-heading mb-4">All Open Sessions in {congregationName}</h3>

                  <div className="table-responsive">
                    <table className="sessions-table">
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Map</th>
                          <th>Started</th>
                          <th className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allOpenSessions.map((session) => (
                          <tr key={session.id}>
                            <td className="font-bold">{session.code}</td>
                            <td>{session.map_number || 'N/A'}</td>
                            <td className="text-secondary">
                              {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td>
                              <div className="flex justify-end gap-2">
                                <button
                                  className="btn btn-sm btn-success"
                                  onClick={() => handleJoinSessionFromDashboard(session.id)}
                                  title="Join Session"
                                >
                                  Join
                                </button>
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleEndAnySession(session.id)}
                                  title="End Session"
                                >
                                  End
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <div className="notice-container">
        <div className="notice-card">
          <div className="notice-icon-wrapper">
            <AlertTriangle size={24} className="notice-icon" />
          </div>
          <div className="notice-content">
            <h3>Important Notice!</h3>
            <p>All sessions will delete including the data after 24 hours. Please be sure to share the session data with yourself within this time period. You can do this by tapping on "End Session" and then tap on "Share and End Session".</p>
          </div>
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
        .page-wrapper {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: var(--color-bg-body);
          color: var(--color-text-main);
        }
        
        .header {
          background-color: var(--color-bg-card);
          border-bottom: 1px solid var(--color-border);
          padding: var(--space-4);
          position: sticky;
          top: 0;
          z-index: 10;
        }
        
        .header-content {
          max-width: 640px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-text-main);
        }
        
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: var(--space-6) var(--space-4);
        }
        
        .content-container {
          width: 100%;
          max-width: 640px;
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }
        
        .card {
          background-color: var(--color-bg-card);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--color-border);
          padding: var(--space-5);
          overflow: hidden;
        }
        
        .setup-card {
          padding: var(--space-6);
        }
        
        .start-session-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: none;
          box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2), 0 2px 4px -1px rgba(16, 185, 129, 0.1);
        }
        
        .start-session-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 8px -1px rgba(16, 185, 129, 0.3), 0 4px 6px -1px rgba(16, 185, 129, 0.2);
        }
        
        .session-code-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: var(--space-6);
        }
        
        .or-text {
          text-align: center;
          color: var(--color-text-secondary);
          font-size: 0.75rem;
          font-weight: 600;
          margin-top: 0;
          margin-bottom: var(--space-4);
          letter-spacing: 0.05em;
        }
        
        .code-input-wrapper {
          position: relative;
          width: 100%;
          max-width: 300px;
          display: flex;
          gap: var(--space-2);
        }
        
        .input-icon {
          position: absolute;
          left: var(--space-3);
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-text-tertiary);
          pointer-events: none;
        }
        
        .session-code-input {
          flex: 1;
          padding: var(--space-3) var(--space-3) var(--space-3) var(--space-10);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          font-size: 1.125rem;
          text-align: center;
          letter-spacing: 0.1em;
          font-weight: 600;
          background-color: var(--color-bg-input);
          color: var(--color-text-main);
          transition: all 0.2s;
        }
        
        .session-code-input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px var(--color-primary-light);
        }
        
        .session-code-input:disabled {
          background-color: var(--color-bg-body);
          opacity: 0.7;
        }
        
        .go-btn {
          padding: 0 var(--space-4);
        }
        
        .section-heading {
          font-size: 1.125rem;
          font-weight: 700;
          margin: 0 0 var(--space-3) 0;
          color: var(--color-text-main);
        }
        
        .sessions-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        
        .session-card {
          background-color: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .session-card.selected {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px var(--color-primary-light);
          background-color: var(--color-bg-surface);
        }
        
        .session-card:hover:not(.selected) {
          border-color: var(--color-border-hover);
          transform: translateY(-1px);
        }
        
        .session-card-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .session-info {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }
        
        .session-code-row {
          font-size: 1.125rem;
          margin-bottom: var(--space-1);
        }
        
        .code-label {
          color: var(--color-text-secondary);
          margin-right: var(--space-2);
          font-size: 0.875rem;
        }
        
        .code-value {
          font-weight: 700;
          color: var(--color-text-main);
        }
        
        .session-map-row, .session-time-row {
          display: flex;
          align-items: center;
          font-size: 0.875rem;
        }
        
        .map-label {
          color: var(--color-text-secondary);
          margin-right: var(--space-1);
        }
        
        .map-value {
          font-weight: 600;
          color: var(--color-text-main);
        }
        
        .time-value {
          color: var(--color-text-secondary);
        }
        
        .session-actions {
          display: flex;
          gap: var(--space-2);
        }
        
        .btn-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid var(--color-border);
          background-color: transparent;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-icon:hover {
          background-color: var(--color-bg-surface);
          color: var(--color-primary);
          border-color: var(--color-primary-light);
        }
        
        .btn-icon-danger:hover {
          color: var(--color-error);
          border-color: var(--color-error-bg);
          background-color: var(--color-error-bg);
        }
        
        .selected-session-card {
          background-color: var(--color-success-bg);
          border-color: rgba(16, 185, 129, 0.2);
        }
        
        .selected-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-4);
          border-bottom: 1px solid rgba(16, 185, 129, 0.1);
          padding-bottom: var(--space-3);
        }
        
        .selected-label {
          color: var(--color-success);
          font-weight: 600;
          font-size: 0.875rem;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .selected-code-wrapper {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }
        
        .selected-code {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--color-text-main);
        }
        
        .selected-details {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        
        .detail-item {
          display: flex;
          align-items: center;
          font-size: 1rem;
          color: var(--color-text-main);
        }
        
        .alert {
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          font-size: 0.875rem;
          font-weight: 500;
        }
        
        .alert-error {
          background-color: var(--color-error-bg);
          color: var(--color-error);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        
        .notice-container {
          width: 100%;
          max-width: 640px;
          margin: 0 auto var(--space-8);
          padding: 0 var(--space-4);
        }
        
        .notice-card {
          background-color: #fffbeb;
          border: 1px solid #fcd34d;
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          display: flex;
          gap: var(--space-4);
        }
        
        .notice-icon-wrapper {
          color: #d97706;
          flex-shrink: 0;
        }
        
        .notice-content h3 {
          margin: 0 0 var(--space-2) 0;
          color: #92400e;
          font-size: 1rem;
          font-weight: 700;
        }
        
        .notice-content p {
          margin: 0;
          color: #92400e;
          font-size: 0.875rem;
          line-height: 1.5;
        }
        
        .table-responsive {
          overflow-x: auto;
        }
        
        .sessions-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }
        
        .sessions-table th {
          text-align: left;
          padding: var(--space-3);
          border-bottom: 1px solid var(--color-border);
          color: var(--color-text-secondary);
          font-weight: 600;
        }
        
        .sessions-table td {
          padding: var(--space-3);
          border-bottom: 1px solid var(--color-border);
          color: var(--color-text-main);
        }
        
        .sessions-table tr:last-child td {
          border-bottom: none;
        }
        
        .text-right { text-align: right; }
        .text-secondary { color: var(--color-text-secondary); }
        .text-tertiary { color: var(--color-text-tertiary); }
        .text-primary { color: var(--color-primary); }
        .font-bold { font-weight: 700; }
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .justify-end { justify-content: flex-end; }
        .gap-2 { gap: var(--space-2); }
        .gap-3 { gap: var(--space-3); }
        .mt-4 { margin-top: var(--space-4); }
        .mt-6 { margin-top: var(--space-6); }
        .mb-4 { margin-bottom: var(--space-4); }
        .mr-1 { margin-right: var(--space-1); }
        .mr-2 { margin-right: var(--space-2); }
        .w-full { width: 100%; }
        .fill-current { fill: currentColor; }
        
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.625rem 1rem;
          border-radius: var(--radius-lg);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
          font-size: 0.95rem;
        }
        
        .btn-sm {
          padding: 0.375rem 0.75rem;
          font-size: 0.875rem;
        }
        
        .btn-lg {
          padding: 1rem 1.5rem;
          font-size: 1.125rem;
        }
        
        .btn-primary {
          background-color: var(--color-primary);
          color: white;
        }
        
        .btn-primary:hover:not(:disabled) {
          background-color: var(--color-primary-hover);
          transform: translateY(-1px);
        }
        
        .btn-secondary {
          background-color: var(--color-bg-surface);
          color: var(--color-text-main);
          border-color: var(--color-border);
        }
        
        .btn-secondary:hover:not(:disabled) {
          background-color: var(--color-bg-input);
          border-color: var(--color-border-hover);
        }
        
        .btn-outline {
          background-color: transparent;
          border-color: var(--color-border);
          color: var(--color-text-secondary);
        }
        
        .btn-outline:hover:not(:disabled) {
          border-color: var(--color-text-secondary);
          color: var(--color-text-main);
        }
        
        .btn-danger {
          background-color: var(--color-error-bg);
          color: var(--color-error);
          border-color: rgba(239, 68, 68, 0.2);
        }
        
        .btn-danger:hover:not(:disabled) {
          background-color: #fee2e2;
          border-color: rgba(239, 68, 68, 0.3);
        }
        
        .btn-success {
          background-color: var(--color-success-bg);
          color: var(--color-success);
          border-color: rgba(16, 185, 129, 0.2);
        }
        
        .btn-success:hover:not(:disabled) {
          background-color: #d1fae5;
        }
        
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }
        
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @media (max-width: 640px) {
          .main-content {
            padding: var(--space-4) var(--space-3);
          }
          
          .header-content {
            padding: 0 var(--space-2);
          }
          
          .sessions-table {
            font-size: 0.75rem;
          }
          
          .sessions-table th, .sessions-table td {
            padding: var(--space-2);
          }
          
          .btn-sm {
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
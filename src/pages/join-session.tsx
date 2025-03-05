import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../supabase/config';

const JoinSessionPage: React.FC = () => {
  const router = useRouter();
  const [sessionCode, setSessionCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    fetchActiveSessions();
  }, []);

  const fetchActiveSessions = async () => {
    try {
      setLoadingSessions(true);
      
      // Get user's congregation from localStorage or session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setLoadingSessions(false);
        return;
      }
      
      // Get user's congregation from user_roles table
      const { data: userRoleData } = await supabase
        .from('user_roles')
        .select('congregation_id')
        .eq('user_id', session.user.id)
        .single();
      
      if (!userRoleData || !userRoleData.congregation_id) {
        setLoadingSessions(false);
        return;
      }
      
      // Get active sessions for this congregation
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('*, congregations(name)')
        .eq('congregation_id', userRoleData.congregation_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (sessionsError) {
        console.error('Error fetching active sessions:', sessionsError);
      } else if (sessions) {
        setActiveSessions(sessions);
      }
    } catch (err) {
      console.error('Error in fetchActiveSessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sessionCode.trim()) {
      setError('Please enter a session code');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Get the current user session
      const { data: { session: userSession } } = await supabase.auth.getSession();
      
      if (!userSession) {
        setError('You must be logged in to join a session.');
        setLoading(false);
        return;
      }
      
      // Find the session by code
      const { data, error: sessionError } = await supabase
        .from('sessions')
        .select('id, is_active')
        .eq('code', sessionCode)
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
      
      // Record the participant joining
      const { error: participantError } = await supabase
        .from('session_participants')
        .insert({
          session_id: data.id,
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
      router.push(`/session/${data.id}`);
    } catch (err) {
      console.error('Error joining session:', err);
      setError('Failed to join session. Please try again.');
      setLoading(false);
    }
  };

  const handleJoinSession = async (sessionId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Get the current user session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('You must be logged in to join a session.');
        setLoading(false);
        return;
      }
      
      // Record the participant joining
      const { error: participantError } = await supabase
        .from('session_participants')
        .insert({
          session_id: sessionId,
          user_id: session.user.id,
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

  return (
    <div className="container">
      <Head>
        <title>Join Session | Not At Home</title>
        <meta name="description" content="Join an active outreach session" />
      </Head>

      <main>
        <div className="content-container">
          <div className="header">
            <Link href="/" className="back-link">
              &larr; Home
            </Link>
            <h1 className="title">Join a Session</h1>
            <p className="description">
              Enter the 4-digit session code provided by your group overseer
            </p>
          </div>

          <div className="form-container">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="session-code">Session Code</label>
                <input
                  type="text"
                  id="session-code"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Enter 4-digit code"
                  maxLength={4}
                  autoComplete="off"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                />
              </div>
              
              {error && <div className="error-message">{error}</div>}
              
              <button 
                type="submit" 
                className="submit-button"
                disabled={loading || !sessionCode.trim()}
              >
                {loading ? 'Joining...' : 'Join Session'}
              </button>
            </form>
          </div>

          {activeSessions.length > 0 && (
            <div className="active-sessions-container">
              <h2 className="section-title">Current Open Sessions</h2>
              <div className="sessions-list">
                {activeSessions.map((session) => (
                  <div key={session.id} className="session-card">
                    <div className="session-info">
                      <div className="session-code">Code: <strong>{session.code}</strong></div>
                      {session.map_number && (
                        <div className="session-map">Map: <strong>{session.map_number}</strong></div>
                      )}
                    </div>
                    <button 
                      className="join-button"
                      onClick={() => handleJoinSession(session.id)}
                      disabled={loading}
                    >
                      Join
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="info-container">
            <h2>What happens when you join?</h2>
            <ul className="info-list">
              <li>You'll be added to the active session</li>
              <li>Your location will be tracked while the session is active</li>
              <li>You can record "Not At Home" addresses</li>
              <li>All participants will see updates in real-time</li>
            </ul>
          </div>
        </div>
      </main>

      <style jsx>{`
        .container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: #f9fafb;
          color: #111827;
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        }

        main {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1.5rem;
          width: 100%;
        }

        .content-container {
          width: 100%;
          max-width: 480px;
        }

        .header {
          display: flex;
          flex-direction: column;
          margin-bottom: 1.5rem;
        }

        .back-link {
          color: #2563eb;
          text-decoration: none;
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
        }

        .back-link:hover {
          text-decoration: underline;
        }

        .title {
          margin: 0;
          font-size: 1.875rem;
          font-weight: 700;
          color: #111827;
        }

        .description {
          margin-top: 0.5rem;
          color: #4b5563;
          font-size: 1rem;
        }

        .form-container {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .form-group {
          margin-bottom: 1.25rem;
        }

        label {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #111827;
        }

        input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 1rem;
          background-color: white;
          color: #111827;
          transition: border-color 0.15s ease;
        }

        input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
        }

        .error-message {
          margin-bottom: 1rem;
          padding: 0.75rem;
          background-color: rgba(239, 68, 68, 0.1);
          border-radius: 6px;
          font-size: 0.875rem;
          color: #ef4444;
        }

        .submit-button {
          width: 100%;
          padding: 0.75rem 1rem;
          background-color: #2563eb;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }

        .submit-button:hover:not(:disabled) {
          background-color: #1d4ed8;
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .active-sessions-container {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .section-title {
          margin-top: 0;
          margin-bottom: 1rem;
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
        }

        .sessions-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .session-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background-color: #f9fafb;
        }

        .session-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .session-code, .session-map {
          font-size: 0.875rem;
          color: #4b5563;
        }

        .session-code strong, .session-map strong {
          color: #111827;
          font-weight: 600;
        }

        .join-button {
          padding: 0.5rem 1rem;
          background-color: #10b981;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }

        .join-button:hover:not(:disabled) {
          background-color: #059669;
        }

        .join-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .info-container {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 1.5rem;
        }

        h2 {
          margin-top: 0;
          margin-bottom: 1rem;
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
        }

        .info-list {
          margin: 0;
          padding-left: 1.5rem;
          color: #4b5563;
        }

        .info-list li {
          margin-bottom: 0.5rem;
        }

        .info-list li:last-child {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
};

export default JoinSessionPage; 
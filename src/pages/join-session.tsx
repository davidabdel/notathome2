import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../supabase/config';
import { ArrowLeft, MapPin, Hash, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

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
    <div className="page-wrapper">
      <Head>
        <title>Join Session | Not At Home</title>
        <meta name="description" content="Join an active outreach session" />
      </Head>

      <main className="main-content">
        <div className="content-container">
          <div className="header">
            <Link href="/" className="back-link">
              <ArrowLeft size={16} className="mr-1" /> Home
            </Link>
            <h1 className="title">Join a Session</h1>
            <p className="description">
              Enter the 4-digit session code provided by your group overseer
            </p>
          </div>

          <div className="card form-card">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="session-code" className="input-label">Session Code</label>
                <div className="input-wrapper">
                  <Hash className="input-icon" size={20} />
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
                    className="input-field with-icon"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="error-alert">
                  <AlertCircle size={18} className="mr-2" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading || !sessionCode.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin mr-2" />
                    Joining...
                  </>
                ) : (
                  <>
                    Join Session
                    <ArrowRight size={18} className="ml-2" />
                  </>
                )}
              </button>
            </form>
          </div>

          {activeSessions.length > 0 && (
            <div className="card sessions-card">
              <h2 className="section-title">Current Open Sessions</h2>
              <div className="sessions-list">
                {activeSessions.map((session) => (
                  <div key={session.id} className="session-item">
                    <div className="session-info">
                      <div className="session-code">
                        <span className="label">Code:</span>
                        <span className="value">{session.code}</span>
                      </div>
                      {session.map_number && (
                        <div className="session-map">
                          <MapPin size={14} className="mr-1 text-tertiary" />
                          <span className="label">Map:</span>
                          <span className="value">{session.map_number}</span>
                        </div>
                      )}
                    </div>
                    <button
                      className="btn btn-sm btn-success"
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
        </div>
      </main>

      <style jsx>{`
        .page-wrapper {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: var(--color-bg-body);
          color: var(--color-text-main);
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: var(--space-6);
          width: 100%;
        }

        .content-container {
          width: 100%;
          max-width: 480px;
        }

        .header {
          display: flex;
          flex-direction: column;
          margin-bottom: var(--space-8);
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          color: var(--color-primary);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: var(--space-4);
          transition: color 0.2s;
        }

        .back-link:hover {
          color: var(--color-primary-hover);
          text-decoration: underline;
        }

        .title {
          margin: 0 0 var(--space-2) 0;
          font-size: 2rem;
          font-weight: 800;
          color: var(--color-text-main);
          letter-spacing: -0.025em;
        }

        .description {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: 1.125rem;
          line-height: 1.5;
        }

        .card {
          background-color: var(--color-bg-card);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-md);
          border: 1px solid var(--color-border);
          overflow: hidden;
        }

        .form-card {
          padding: var(--space-6);
          margin-bottom: var(--space-6);
        }

        .form-group {
          margin-bottom: var(--space-6);
        }

        .input-label {
          display: block;
          margin-bottom: var(--space-2);
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
          background-color: var(--color-bg-input);
          color: var(--color-text-main);
          transition: all 0.2s ease;
        }

        .input-field.with-icon {
          padding-left: var(--space-10);
        }

        .input-field:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 4px var(--color-primary-light);
          background-color: var(--color-bg-card);
        }

        .error-alert {
          display: flex;
          align-items: center;
          margin-bottom: var(--space-4);
          padding: var(--space-3);
          background-color: var(--color-error-bg);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          color: var(--color-error);
        }

        .sessions-card {
          padding: var(--space-6);
        }

        .section-title {
          margin: 0 0 var(--space-4) 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-text-main);
        }

        .sessions-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .session-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-4);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          background-color: var(--color-bg-body);
          transition: all 0.2s ease;
        }
        
        .session-item:hover {
          border-color: var(--color-primary);
          box-shadow: var(--shadow-sm);
        }

        .session-info {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }

        .session-code, .session-map {
          display: flex;
          align-items: center;
          font-size: 0.875rem;
        }
        
        .session-code .value {
          font-size: 1rem;
          font-weight: 700;
          color: var(--color-text-main);
        }

        .label {
          color: var(--color-text-secondary);
          margin-right: var(--space-2);
        }
        
        .value {
          font-weight: 600;
          color: var(--color-text-main);
        }
        
        .text-tertiary {
          color: var(--color-text-tertiary);
        }

        .mr-1 { margin-right: var(--space-1); }
        .mr-2 { margin-right: var(--space-2); }
        .ml-2 { margin-left: var(--space-2); }
        .w-full { width: 100%; }
        
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default JoinSessionPage; 
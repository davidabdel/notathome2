import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../utils/supabaseClient';
import { SupabaseClient } from '@supabase/supabase-js';
import { subscribeToSessionUpdates } from '../../utils/realtimeClient';
import TerritoryMap from '../../components/TerritoryMap';
import BlockSelector from '../../components/BlockSelector';
import LocationRecorder from '../../components/LocationRecorder';
import AddressList from '../../components/AddressList';
import MapSelector from '../../components/MapSelector';
import ShareSessionModal from '../../components/ShareSessionModal';
import { ArrowLeft, MapPin, AlertCircle, Loader2 } from 'lucide-react';

interface SessionData {
  id: string;
  code: string;
  congregation_id: string;
  congregation_name: string;
  created_at: string;
  created_by: string;
  is_active: boolean;
  map_number?: number;
}

interface SessionResponse {
  id: string;
  code: string;
  congregation_id: string;
  congregations: { name: string };
  created_at: string;
  created_by: string;
  is_active: boolean;
  map_number?: number;
}

// Explicitly type the supabase client
const supabaseClient: SupabaseClient = supabase;

const SessionPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMap, setSelectedMap] = useState<number | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null);
  const [refreshAddresses, setRefreshAddresses] = useState<number>(0);
  const [totalBlocks, setTotalBlocks] = useState<number>(10);

  const fetchSessionData = async () => {
    if (!id) return;

    try {
      setLoading(true);

      // Fetch session data
      const { data, error } = await supabaseClient
        .from('sessions')
        .select(`
          id,
          code,
          congregation_id,
          congregations (name),
          created_at,
          created_by,
          is_active,
          map_number
        `)
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        setError('Session not found');
        setLoading(false);
        return;
      }

      // Format the session data
      const sessionResponse = data as unknown as SessionResponse;
      const sessionData: SessionData = {
        id: sessionResponse.id,
        code: sessionResponse.code,
        congregation_id: sessionResponse.congregation_id,
        congregation_name: sessionResponse.congregations?.name || 'Unknown Congregation',
        created_at: sessionResponse.created_at,
        created_by: sessionResponse.created_by,
        is_active: sessionResponse.is_active,
        map_number: sessionResponse.map_number
      };

      setSession(sessionData);

      // If the session already has a map number, set it as selected
      if (sessionData.map_number) {
        setSelectedMap(sessionData.map_number);
      }
    } catch (err) {
      console.error('Error fetching session:', err);
      setError('Failed to load session data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;

    fetchSessionData();

    // Subscribe to session updates
    const unsubscribe = subscribeToSessionUpdates(
      id as string,
      (updatedSession) => {
        // Update the session data when changes occur
        fetchSessionData();
      }
    );

    return () => {
      unsubscribe();
    };
  }, [id]);

  const handleMapSelected = async (mapNumber: number) => {
    setSelectedMap(mapNumber);

    // Update the session with the selected map number
    if (session) {
      try {
        const { error } = await supabaseClient
          .from('sessions')
          .update({ map_number: mapNumber })
          .eq('id', session.id);

        if (error) {
          console.error('Error updating session map number:', error);
        }
      } catch (err) {
        console.error('Error updating session:', err);
      }
    }
  };

  const handleBlockSelected = (blockNumber: number) => {
    setSelectedBlock(blockNumber);
  };

  const handleLocationRecorded = () => {
    // Trigger a refresh of the address list
    setRefreshAddresses(prev => prev + 1);
  };

  const handleMapDetailsLoaded = (details: { blocks: number }) => {
    setTotalBlocks(details.blocks);
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="loading-container">
          <Loader2 size={40} className="animate-spin text-primary" />
          <p className="loading-text">Loading session data...</p>
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

  if (error || !session) {
    return (
      <div className="page-wrapper">
        <div className="error-container">
          <AlertCircle size={48} className="error-icon" />
          <h2 className="error-title">{error || 'Session not found'}</h2>
          <Link href="/" className="btn btn-primary">
            Return to Home
          </Link>
        </div>
        <style jsx>{`
          .page-wrapper {
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: var(--color-bg-body);
            padding: var(--space-6);
          }
          .error-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            background-color: var(--color-bg-card);
            padding: var(--space-8);
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-lg);
            max-width: 400px;
            width: 100%;
            border: 1px solid var(--color-border);
          }
          .error-icon {
            color: var(--color-error);
            margin-bottom: var(--space-4);
          }
          .error-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--color-text-main);
            margin: 0 0 var(--space-6) 0;
          }
          .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.75rem 1.5rem;
            border-radius: var(--radius-lg);
            font-weight: 600;
            text-decoration: none;
            transition: all 0.2s;
          }
          .btn-primary {
            background-color: var(--color-primary);
            color: white;
          }
          .btn-primary:hover {
            background-color: var(--color-primary-hover);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <Head>
        <title>Session: {session.code} | Not At Home</title>
        <meta name="description" content="Active outreach session" />
      </Head>

      <main className="main-content">
        <div className="content-container">
          <div className="header">
            <Link href="/" className="back-link">
              <ArrowLeft size={16} className="mr-1" /> Home
            </Link>
            <h1 className="title">Session: {session.code}</h1>
          </div>

          {!session.is_active && (
            <div className="alert alert-error">
              <AlertCircle size={20} className="mr-2" />
              This session is no longer active. Recording is disabled.
            </div>
          )}

          {session.is_active && (
            <>
              {!selectedMap ? (
                <div className="card section">
                  <MapSelector
                    sessionId={session.id}
                    onMapSelected={handleMapSelected}
                  />
                </div>
              ) : (
                <>
                  <div className="card section map-section">
                    <div className="section-header">
                      <h2 className="section-title">
                        <MapPin size={20} className="mr-2 text-primary" />
                        Territory Map {selectedMap}
                      </h2>
                    </div>
                    <TerritoryMap
                      mapNumber={selectedMap}
                      onMapDetailsLoaded={handleMapDetailsLoaded}
                    />
                  </div>

                  <div className="card section">
                    <h2 className="section-title">Select Block</h2>
                    <BlockSelector
                      selectedBlock={selectedBlock}
                      onSelectBlock={handleBlockSelected}
                      totalBlocks={totalBlocks}
                    />

                    <div className="block-actions">
                      <div className="block-indicator">
                        <span className="label">Selected Block:</span>
                        <span className="value">{selectedBlock || 'None'}</span>
                      </div>
                      <LocationRecorder
                        sessionId={session.id}
                        selectedBlock={selectedBlock}
                        onLocationRecorded={handleLocationRecorded}
                      />
                    </div>
                  </div>

                  <div className="card section">
                    <h2 className="section-title">Not Home List</h2>
                    <AddressList
                      sessionId={session.id}
                      selectedBlock={null}
                      onAddressUpdated={handleLocationRecorded}
                      refreshTrigger={refreshAddresses}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>

      <style jsx>{`
        .page-wrapper {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: #f8fafc;
          color: #1e293b;
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
          max-width: 640px;
        }

        .header {
          display: flex;
          flex-direction: column;
          margin-bottom: var(--space-8);
          text-align: center;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          align-self: center;
          color: #64748b;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: var(--space-4);
          transition: color 0.2s;
          padding: 0.5rem 1rem;
          background: white;
          border-radius: 9999px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }

        .back-link:hover {
          color: #0f172a;
          background: #f1f5f9;
        }

        .title {
          margin: 0;
          font-size: 2rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.03em;
          line-height: 1.2;
        }

        .card {
          background-color: white;
          border-radius: 1.5rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025);
          border: 1px solid #f1f5f9;
          overflow: hidden;
          margin-bottom: var(--space-6);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .section {
          padding: 2rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #f1f5f9;
        }

        .section-title {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 700;
          color: #334155;
          display: flex;
          align-items: center;
          letter-spacing: -0.01em;
        }
        
        .map-section .section-header {
           border-bottom: none;
           margin-bottom: 0.5rem;
           padding-bottom: 0;
        }

        .block-actions {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px dashed #e2e8f0;
        }

        .block-indicator {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
          font-size: 1rem;
          background: #f8fafc;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          border: 1px solid #e2e8f0;
        }
        
        .label {
          color: #64748b;
          font-weight: 500;
        }
        
        .value {
          font-weight: 700;
          color: #0f172a;
          background: white;
          padding: 0.25rem 0.75rem;
          border-radius: 0.5rem;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }

        .alert {
          padding: 1rem;
          border-radius: 1rem;
          margin-bottom: 2rem;
          display: flex;
          align-items: center;
          font-weight: 500;
          font-size: 0.95rem;
        }
        
        .alert-error {
          background-color: #fef2f2;
          color: #ef4444;
          border: 1px solid #fee2e2;
        }

        .mr-1 { margin-right: 0.25rem; }
        .mr-2 { margin-right: 0.5rem; }
        .text-primary { color: #2563eb; }
        
        @media (max-width: 640px) {
          .main-content {
            padding: 1rem;
          }
          
          .section {
            padding: 1.5rem;
          }
          
          .title {
            font-size: 1.75rem;
          }
        }
      `}</style>
    </div>
  );
};

export default SessionPage;
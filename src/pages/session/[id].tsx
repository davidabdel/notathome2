import React, { useState, useEffect, useCallback } from 'react';
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

const supabaseClient: SupabaseClient = supabase;

const SessionPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMap, setSelectedMap] = useState<number | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null);
  const [_refreshAddresses, setRefreshAddresses] = useState<number>(0);

  const fetchSessionData = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
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
      
      if (sessionData.map_number) {
        setSelectedMap(sessionData.map_number);
      }
    } catch (err) {
      console.error('Error fetching session:', err);
      setError('Failed to load session data');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    
    const savedBlock = localStorage.getItem(`selectedBlock_${id}`);
    if (savedBlock) {
      setSelectedBlock(parseInt(savedBlock, 10));
    }
    
    fetchSessionData();
    
    const unsubscribe = subscribeToSessionUpdates(
      id as string,
      (_updatedSession) => {
        fetchSessionData();
      }
    );
    
    return () => {
      unsubscribe();
    };
  }, [id, fetchSessionData]);

  const handleMapSelected = async (mapNumber: number) => {
    setSelectedMap(mapNumber);
    
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
    
    if (id) {
      localStorage.setItem(`selectedBlock_${id}`, blockNumber.toString());
    }
  };

  const handleLocationRecorded = () => {
    setRefreshAddresses(prev => prev + 1);
    
    const fetchAddressesNow = async () => {
      try {
        const { error } = await supabaseClient
          .from('not_at_home_addresses')
          .select('*')
          .eq('session_id', id as string)
          .order('created_at', { ascending: true });
        
        if (error) {
          console.error('Error fetching addresses after recording:', error);
          return;
        }
        
        // Force page refresh to ensure all components update
        window.location.reload();
      } catch (err) {
        console.error('Error in fetchAddressesNow:', err);
      }
    };
    
    fetchAddressesNow();
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading session data...</div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="container">
        <div className="error-message">
          {error || 'Session not found'}
        </div>
        <Link href="/" className="back-link">
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="container">
      <Head>
        <title>Session: {session.code} | Not At Home</title>
        <meta name="description" content="Active outreach session" />
      </Head>

      <main>
        <div className="content-container">
          <div className="header">
            <Link href="/" className="back-link">
              &larr; Home
            </Link>
            <h1 className="title">Session: {session.code}</h1>
          </div>

          {!session.is_active && (
            <div className="inactive-message">
              This session is no longer active. Recording is disabled.
            </div>
          )}

          {session.is_active && (
            <>
              {!selectedMap ? (
                <div className="section">
                  <MapSelector 
                    sessionId={session.id} 
                    onMapSelected={handleMapSelected} 
                  />
                </div>
              ) : (
                <>
                  <div className="section map-section">
                    <div className="section-header">
                      <h2 className="section-title">Territory Map {selectedMap}</h2>
                    </div>
                    <>{console.log('Rendering TerritoryMap with mapNumber:', selectedMap, typeof selectedMap)}</>
                    <TerritoryMap mapNumber={selectedMap} />
                  </div>

                  <div className="section">
                    <h2 className="section-title">Select Block</h2>
                    <BlockSelector 
                      selectedBlock={selectedBlock} 
                      onSelectBlock={handleBlockSelected} 
                    />
                    
                    <div className="block-actions">
                      <h3 className="block-number">{selectedBlock || 'None'}</h3>
                      <LocationRecorder 
                        sessionId={session.id} 
                        selectedBlock={selectedBlock}
                        onLocationRecorded={handleLocationRecorded}
                      />
                    </div>
                  </div>

                  <div className="section">
                    <h2 className="section-title">Not Home</h2>
                    <AddressList 
                      sessionId={session.id}
                      selectedBlock={null}
                      onAddressUpdated={handleLocationRecorded}
                    />
                  </div>
                </>
              )}
            </>
          )}
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
          padding: 1rem;
          width: 100%;
        }

        .content-container {
          width: 100%;
          max-width: 768px;
        }

        .header {
          display: flex;
          flex-direction: column;
          margin-bottom: 1rem;
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
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
        }

        .section {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .section-title {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
          margin-bottom: 0.75rem;
        }

        .map-section .section-title {
          margin-bottom: 0;
        }

        .block-actions {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .block-number {
          margin: 0 0 0.75rem 0;
          font-size: 1rem;
          font-weight: 500;
          color: #111827;
        }

        .inactive-message {
          background-color: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          padding: 1rem;
          border-radius: 8px;
          text-align: center;
          font-weight: 500;
          margin-bottom: 1rem;
        }

        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          font-size: 1rem;
          color: #6b7280;
        }

        .error-message {
          background-color: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          padding: 1rem;
          border-radius: 8px;
          text-align: center;
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
};

export default SessionPage; 
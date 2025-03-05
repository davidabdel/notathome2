import React, { useState, useEffect } from 'react';
import { fetchAndShareSessionData, endSession } from '../utils/session';
import { supabase } from '../utils/supabaseClient';
import { SupabaseClient } from '@supabase/supabase-js';

interface ShareSessionDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  congregationName: string;
}

const ShareSessionDataModal: React.FC<ShareSessionDataModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  congregationName
}) => {
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEnding, setIsEnding] = useState(false);
  
  // Store session data when modal opens
  const [sessionData, setSessionData] = useState<any>(null);
  const [fetchingData, setFetchingData] = useState(false);
  const [sessionCode, setSessionCode] = useState<string>('');
  
  // Fetch and store session data when modal opens
  useEffect(() => {
    if (isOpen && sessionId) {
      setError(null);
      setFetchingData(true);
      console.log('ShareSessionDataModal opened with sessionId:', sessionId);
      
      // Fetch session data immediately when modal opens
      const fetchSessionData = async () => {
        try {
          // Fetch the session code
          // @ts-ignore - Supabase client is imported from utils
          const { data: sessionData, error: sessionError } = await supabase
            .from('sessions')
            .select('code')
            .eq('id', sessionId)
            .single();
          
          if (sessionError) {
            console.error('Error fetching session code:', sessionError);
          } else if (sessionData) {
            setSessionCode(sessionData.code);
          }
          
          const result = await fetchAndShareSessionData(sessionId, congregationName, true); // true = just fetch, don't share yet
          if (result && typeof result !== 'boolean') {
            setSessionData(result);
            // If we didn't get the code from the direct query, try to get it from the result
            if (!sessionCode && result.session && result.session.code) {
              setSessionCode(result.session.code);
            }
          }
        } catch (err) {
          console.error('Error pre-fetching session data:', err);
        } finally {
          setFetchingData(false);
        }
      };
      
      fetchSessionData();
    }
  }, [isOpen, sessionId, congregationName, sessionCode]);
  
  if (!isOpen) return null;
  
  const handleShare = async () => {
    try {
      setSharing(true);
      setError(null);
      
      console.log('Attempting to share session data for sessionId:', sessionId);
      
      if (!sessionId) {
        setError('Session ID is missing. Please try again or contact support.');
        setSharing(false);
        return;
      }
      
      // If we already have the session data, share it directly
      let shareSuccess = false;
      if (sessionData) {
        console.log('Using pre-fetched session data');
        shareSuccess = await fetchAndShareSessionData(sessionId, congregationName, false, sessionData);
      } else {
        // Otherwise try to fetch and share
        shareSuccess = await fetchAndShareSessionData(sessionId, congregationName);
      }
      
      if (!shareSuccess) {
        setError('Failed to share session data. This could be due to no addresses being found or an issue with the sharing functionality. Please try again.');
        setSharing(false);
        return;
      }
      
      // Only after successful sharing, end the session
      setIsEnding(true);
      console.log('Sharing successful, now ending session:', sessionId);
      
      // End the session (which deletes all data)
      const endSuccess = await endSession(sessionId);
      
      if (!endSuccess) {
        setError('Failed to end session. The data was shared but the session may still be active. Please try ending the session again from the dashboard.');
      } else {
        console.log('Session successfully ended:', sessionId);
        // Close the modal after successful sharing and ending
        onClose();
        
        // Force a page refresh to update the UI
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (err) {
      console.error('Error in handleShare:', err);
      setError(`An unexpected error occurred: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again or contact support.`);
    } finally {
      setSharing(false);
      setIsEnding(false);
    }
  };
  
  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>Share Session Data</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          <p>
            Share all "Not At Home" addresses collected during this session.
            The data will be formatted as a table and can be shared via SMS, WhatsApp, Email, or copied to clipboard.
          </p>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="session-info">
            <p><strong>Session Code:</strong> {sessionCode || 'Not available'}</p>
            <p><strong>Congregation:</strong> {congregationName || 'Not available'}</p>
          </div>
          
          <div className="button-container">
            <button 
              className="cancel-button"
              onClick={onClose}
              disabled={sharing || isEnding}
            >
              Cancel
            </button>
            <button 
              className="share-button"
              onClick={handleShare}
              disabled={sharing || isEnding}
            >
              {sharing ? 'Sharing...' : isEnding ? 'Ending Session...' : 'Share and End Session'}
            </button>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .modal-container {
          background-color: white;
          border-radius: 0.5rem;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
        }
        
        .close-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6b7280;
        }
        
        .modal-content {
          padding: 1.5rem;
        }
        
        .session-info {
          margin-top: 1rem;
          padding: 0.75rem;
          background-color: #f3f4f6;
          border-radius: 0.375rem;
          font-size: 0.875rem;
        }
        
        .session-info p {
          margin: 0.25rem 0;
        }
        
        .button-container {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }
        
        .cancel-button {
          background-color: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
        }
        
        .share-button {
          background-color: #10b981;
          color: white;
          border: none;
          border-radius: 0.375rem;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
        }
        
        .share-button:hover {
          background-color: #059669;
        }
        
        .share-button:disabled, .cancel-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .error-message {
          background-color: #fee2e2;
          color: #b91c1c;
          padding: 0.75rem;
          border-radius: 0.375rem;
          margin-top: 1rem;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
};

export default ShareSessionDataModal; 
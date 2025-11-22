import React, { useState, useEffect } from 'react';
import { fetchAndShareSessionData, endSession } from '../utils/session';
import { supabase } from '../utils/supabaseClient';
import { X, Share2, AlertCircle, Loader2, FileText } from 'lucide-react';

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
        <button className="close-button" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="modal-header">
          <div className="icon-wrapper">
            <Share2 size={24} />
          </div>
          <div>
            <h2>Share Session Data</h2>
            <p className="subtitle">Share data before ending session</p>
          </div>
        </div>

        <div className="modal-content">
          <p className="description">
            Share all "Not At Home" addresses collected during this session.
            The data will be formatted as a table and can be shared via SMS, WhatsApp, Email, or copied to clipboard.
          </p>

          {error && (
            <div className="error-message">
              <AlertCircle size={18} className="error-icon" />
              {error}
            </div>
          )}

          <div className="session-info">
            <div className="info-item">
              <span className="info-label">Session Code:</span>
              <span className="info-value">{sessionCode || 'Loading...'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Congregation:</span>
              <span className="info-value">{congregationName || 'Loading...'}</span>
            </div>
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
              {sharing || isEnding ? (
                <>
                  <Loader2 size={18} className="animate-spin mr-2" />
                  {sharing ? 'Sharing...' : 'Ending Session...'}
                </>
              ) : (
                <>
                  <Share2 size={18} className="mr-2" />
                  Share and End Session
                </>
              )}
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
          backdrop-filter: blur(4px);
        }
        
        .modal-container {
          background-color: var(--color-bg-card);
          border-radius: var(--radius-xl);
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: var(--shadow-xl);
          position: relative;
          border: 1px solid var(--color-border);
          padding: var(--space-6);
        }
        
        .close-button {
          position: absolute;
          top: var(--space-4);
          right: var(--space-4);
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--color-text-tertiary);
          padding: var(--space-1);
          border-radius: var(--radius-md);
          transition: all 0.2s;
        }
        
        .close-button:hover {
          background-color: var(--color-bg-surface);
          color: var(--color-text-main);
        }
        
        .modal-header {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          margin-bottom: var(--space-4);
        }
        
        .icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-lg);
          background-color: #eff6ff;
          color: var(--color-primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .modal-header h2 {
          margin: 0 0 var(--space-1) 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-text-main);
        }
        
        .subtitle {
          color: var(--color-text-secondary);
          margin: 0;
          font-size: 0.875rem;
        }
        
        .modal-content {
          display: flex;
          flex-direction: column;
        }
        
        .description {
          color: var(--color-text-secondary);
          font-size: 0.95rem;
          line-height: 1.5;
          margin-bottom: var(--space-6);
        }
        
        .session-info {
          background-color: var(--color-bg-surface);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          font-size: 0.875rem;
          border: 1px solid var(--color-border);
          margin-bottom: var(--space-6);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        
        .info-item {
          display: flex;
          justify-content: space-between;
        }
        
        .info-label {
          color: var(--color-text-secondary);
          font-weight: 500;
        }
        
        .info-value {
          color: var(--color-text-main);
          font-weight: 600;
        }
        
        .button-container {
          display: flex;
          justify-content: flex-end;
          gap: var(--space-3);
        }
        
        .cancel-button {
          background-color: transparent;
          color: var(--color-text-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 0.625rem 1rem;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .cancel-button:hover {
          background-color: var(--color-bg-surface);
          color: var(--color-text-main);
        }
        
        .share-button {
          background-color: var(--color-success);
          color: white;
          border: none;
          border-radius: var(--radius-lg);
          padding: 0.625rem 1.25rem;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
        }
        
        .share-button:hover:not(:disabled) {
          background-color: #059669;
          transform: translateY(-1px);
        }
        
        .share-button:disabled, .cancel-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        .error-message {
          background-color: var(--color-error-bg);
          color: var(--color-error);
          padding: var(--space-3);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-4);
          font-size: 0.875rem;
          display: flex;
          align-items: flex-start;
          gap: var(--space-2);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        
        .error-icon {
          flex-shrink: 0;
          margin-top: 2px;
        }
        
        .mr-2 { margin-right: var(--space-2); }
        .animate-spin { animation: spin 1s linear infinite; }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ShareSessionDataModal;
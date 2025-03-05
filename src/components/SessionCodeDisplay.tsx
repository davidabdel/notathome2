import React, { useState } from 'react';
import { shareSessionCode } from '../utils/session';

interface SessionCodeDisplayProps {
  sessionCode: string;
  congregationName: string;
  onCopied?: () => void;
}

const SessionCodeDisplay: React.FC<SessionCodeDisplayProps> = ({
  sessionCode,
  congregationName,
  onCopied
}) => {
  const [copied, setCopied] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [shareError, setShareError] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(sessionCode);
      setCopied(true);
      if (onCopied) onCopied();
      
      // Reset copied state after 3 seconds
      setTimeout(() => {
        setCopied(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleShareCode = async () => {
    setShareSuccess(false);
    setShareError(false);
    
    const result = await shareSessionCode(sessionCode, congregationName);
    
    if (result) {
      setShareSuccess(true);
      setTimeout(() => {
        setShareSuccess(false);
      }, 3000);
    } else {
      setShareError(true);
      setTimeout(() => {
        setShareError(false);
      }, 3000);
    }
  };

  return (
    <div className="session-code-display">
      <div className="code-container">
        <h3>Session Code</h3>
        <div className="code">
          {sessionCode.split('').map((char, index) => (
            <span key={index} className="code-char">{char}</span>
          ))}
        </div>
        <p className="code-instruction">Share this code with volunteers to join this session</p>
      </div>
      
      <div className="actions">
        <button 
          onClick={handleCopyCode} 
          className="action-button copy-button"
          disabled={copied}
        >
          {copied ? 'Copied!' : 'Copy Code'}
        </button>
        
        <button 
          onClick={handleShareCode} 
          className="action-button share-button"
        >
          Share Code
        </button>
      </div>
      
      {shareSuccess && (
        <div className="status-message success">
          Session code shared successfully!
        </div>
      )}
      
      {shareError && (
        <div className="status-message error">
          Failed to share session code. Try copying instead.
        </div>
      )}
      
      <style jsx>{`
        .session-code-display {
          width: 100%;
          background-color: white;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          margin-bottom: 1.5rem;
        }
        
        .code-container {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        
        h3 {
          margin: 0 0 1rem;
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-color, #111827);
        }
        
        .code {
          display: flex;
          justify-content: center;
          margin-bottom: 1rem;
        }
        
        .code-char {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.5rem;
          height: 3rem;
          margin: 0 0.25rem;
          background-color: var(--background-color, #f9fafb);
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 6px;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--primary-color, #2563eb);
        }
        
        .code-instruction {
          margin: 0;
          font-size: 0.875rem;
          color: var(--text-secondary, #4b5563);
        }
        
        .actions {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        
        .action-button {
          flex: 1;
          padding: 0.75rem 1rem;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        
        .copy-button {
          background-color: var(--background-color, #f9fafb);
          border: 1px solid var(--border-color, #e5e7eb);
          color: var(--text-color, #111827);
        }
        
        .copy-button:hover:not(:disabled) {
          background-color: var(--border-color, #e5e7eb);
        }
        
        .copy-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .share-button {
          background-color: var(--primary-color, #2563eb);
          color: white;
        }
        
        .share-button:hover {
          background-color: var(--primary-hover, #1d4ed8);
        }
        
        .status-message {
          padding: 0.75rem;
          border-radius: 6px;
          font-size: 0.875rem;
          text-align: center;
        }
        
        .success {
          background-color: rgba(16, 185, 129, 0.1);
          color: var(--success-color, #10b981);
        }
        
        .error {
          background-color: rgba(239, 68, 68, 0.1);
          color: var(--error-color, #ef4444);
        }
      `}</style>
    </div>
  );
};

export default SessionCodeDisplay; 
import React, { useState } from 'react';
import { X, Mail, MessageSquare, Copy, Check, Share2 } from 'lucide-react';

interface ShareSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionCode: string;
}

const ShareSessionModal: React.FC<ShareSessionModalProps> = ({
  isOpen,
  onClose,
  sessionCode
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleEmailShare = () => {
    const subject = encodeURIComponent('Join Not at Home Session');
    const body = encodeURIComponent(`Join my Not at Home session with code: ${sessionCode}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleSMSShare = () => {
    const message = encodeURIComponent(`Join my Not at Home session with code: ${sessionCode}`);
    window.open(`sms:?&body=${message}`);
  };

  const handleWhatsAppShare = () => {
    const message = encodeURIComponent(`Join my Not at Home session with code: ${sessionCode}`);
    window.open(`https://wa.me/?text=${message}`);
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(sessionCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-button" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="modal-header">
          <div className="icon-wrapper">
            <Share2 size={24} />
          </div>
          <div>
            <h2>Share Session Code</h2>
            <p className="subtitle">Invite others to join your session</p>
          </div>
        </div>

        <div className="code-display">
          <span className="code-label">Session Code</span>
          <span className="code-value">{sessionCode}</span>
        </div>

        <div className="share-options">
          <button className="share-button" onClick={handleEmailShare}>
            <Mail size={20} className="share-icon" />
            <span>Email</span>
          </button>

          <button className="share-button" onClick={handleSMSShare}>
            <MessageSquare size={20} className="share-icon" />
            <span>SMS</span>
          </button>

          <button className="share-button" onClick={handleWhatsAppShare}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="share-icon"
            >
              <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
              <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
            </svg>
            <span>WhatsApp</span>
          </button>

          <button className="share-button copy" onClick={handleCopyToClipboard}>
            {copied ? <Check size={20} className="share-icon" /> : <Copy size={20} className="share-icon" />}
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>
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
        
        .modal-content {
          background-color: var(--color-bg-card);
          border-radius: var(--radius-xl);
          padding: var(--space-6);
          width: 90%;
          max-width: 400px;
          position: relative;
          box-shadow: var(--shadow-xl);
          border: 1px solid var(--color-border);
        }
        
        .close-button {
          position: absolute;
          top: var(--space-4);
          right: var(--space-4);
          background: none;
          border: none;
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
          margin-bottom: var(--space-6);
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
        
        h2 {
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
        
        .code-display {
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: var(--space-6);
        }
        
        .code-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-secondary);
          margin-bottom: var(--space-1);
          font-weight: 600;
        }
        
        .code-value {
          font-size: 2rem;
          font-weight: 800;
          color: var(--color-text-main);
          letter-spacing: 0.1em;
        }
        
        .share-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-3);
        }
        
        .share-button {
          padding: var(--space-3);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          background-color: var(--color-bg-surface);
          color: var(--color-text-main);
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-2);
        }
        
        .share-button:hover {
          background-color: var(--color-bg-input);
          border-color: var(--color-border-hover);
          transform: translateY(-1px);
        }
        
        .share-button.copy {
          background-color: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }
        
        .share-button.copy:hover {
          background-color: var(--color-primary-hover);
        }
        
        .share-icon {
          margin-bottom: var(--space-1);
        }
      `}</style>
    </div>
  );
};

export default ShareSessionModal;
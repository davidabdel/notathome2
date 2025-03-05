import React from 'react';

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
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-button" onClick={onClose}>
          ×
        </button>
        
        <h2>Share Session Code</h2>
        <p className="session-code-text">Share session code: {sessionCode}</p>
        
        <div className="share-options">
          <button className="share-button email" onClick={handleEmailShare}>
            Email
          </button>
          
          <button className="share-button sms" onClick={handleSMSShare}>
            SMS
          </button>
          
          <button className="share-button whatsapp" onClick={handleWhatsAppShare}>
            WhatsApp
          </button>
          
          <button className="share-button copy" onClick={handleCopyToClipboard}>
            Copy to Clipboard
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
        }
        
        .modal-content {
          background-color: white;
          border-radius: 12px;
          padding: 24px;
          width: 90%;
          max-width: 400px;
          position: relative;
        }
        
        .close-button {
          position: absolute;
          top: 12px;
          right: 12px;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
        }
        
        h2 {
          margin-top: 0;
          margin-bottom: 16px;
          font-size: 20px;
          font-weight: 600;
          text-align: center;
        }
        
        .session-code-text {
          margin-bottom: 24px;
          text-align: center;
          color: #666;
          font-size: 16px;
        }
        
        .share-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        
        .share-button {
          padding: 14px;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
          background-color: #111827;
          color: white;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .share-button.email, .share-button.sms {
          background-color: #111827;
        }
        
        .share-button.whatsapp {
          background-color: #111827;
        }
        
        .share-button.copy {
          background-color: white;
          color: #111827;
        }
        
        .share-button:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
};

export default ShareSessionModal; 
import React, { useState, useEffect } from 'react';

interface FirstTimeAlertProps {
  version: string;
}

const FirstTimeAlert: React.FC<FirstTimeAlertProps> = ({ version }) => {
  const [showAlert, setShowAlert] = useState(false);
  
  useEffect(() => {
    // Check if this is the first time the user is seeing this version
    const hasSeenAlert = localStorage.getItem(`seen_alert_${version}`);
    
    if (!hasSeenAlert) {
      // If the user hasn't seen the alert for this version, show it
      setShowAlert(true);
    }
  }, [version]);
  
  const handleClose = () => {
    // Mark this version's alert as seen
    localStorage.setItem(`seen_alert_${version}`, 'true');
    setShowAlert(false);
  };
  
  if (!showAlert) {
    return null;
  }
  
  return (
    <div className="alert-overlay">
      <div className="alert-container">
        <div className="alert-header">
          <h2>Welcome to the 2026 Service Year !!</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>
        <div className="alert-content">
          <p>New Updates:</p>
          <ul>
            <li><strong>Confirm Address Before Commiting</strong> - Now Live</li>
          </ul>
        </div>
        <div className="alert-footer">
          <button className="ok-button" onClick={handleClose}>Got it!</button>
        </div>
      </div>
      
      <style jsx>{`
        .alert-overlay {
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
          padding: 1rem;
        }
        
        .alert-container {
          background-color: white;
          border-radius: 0.5rem;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .alert-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .alert-header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
        }
        
        .close-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0;
          color: #6b7280;
        }
        
        .alert-content {
          padding: 1rem;
        }
        
        .alert-content p {
          margin-top: 0;
          margin-bottom: 1rem;
        }
        
        .alert-content ul {
          margin-bottom: 1rem;
          padding-left: 1.5rem;
        }
        
        .alert-content li {
          margin-bottom: 0.5rem;
        }
        
        .alert-footer {
          padding: 1rem;
          display: flex;
          justify-content: flex-end;
          border-top: 1px solid #e5e7eb;
        }
        
        .ok-button {
          background-color: #d9f99d;
          color: #365314;
          border: none;
          border-radius: 0.375rem;
          padding: 0.5rem 1rem;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .ok-button:hover {
          background-color: #bef264;
        }
      `}</style>
    </div>
  );
};

export default FirstTimeAlert;

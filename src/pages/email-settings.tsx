import React from 'react';
import Link from 'next/link';

const EmailSettingsPage: React.FC = () => {
  return (
    <div className="container">
      <header>
        <h1>Email Configuration</h1>
        <div className="nav-links">
          <Link href="/debug" className="nav-link">Debug</Link>
          <Link href="/test-notification" className="nav-link">Test Notifications</Link>
          <Link href="/" className="nav-link">Home</Link>
        </div>
      </header>
      
      <main>
        <div className="info-box">
          <h2>Current Email Configuration</h2>
          <p>
            The application is configured to use the following SMTP settings from environment variables:
          </p>
          
          <div className="config-table">
            <div className="config-row">
              <div className="config-label">SMTP Host:</div>
              <div className="config-value">smtp.improvmx.com</div>
            </div>
            <div className="config-row">
              <div className="config-label">SMTP Port:</div>
              <div className="config-value">587</div>
            </div>
            <div className="config-row">
              <div className="config-label">SMTP Secure:</div>
              <div className="config-value">false</div>
            </div>
            <div className="config-row">
              <div className="config-label">SMTP User:</div>
              <div className="config-value">unclaimed@nothom.app</div>
            </div>
            <div className="config-row">
              <div className="config-label">From Address:</div>
              <div className="config-value">"Not At Home unclaimed@nothom.app"</div>
            </div>
          </div>
          
          <p className="note">
            <strong>Note:</strong> These settings are configured in the <code>.env.local</code> file and are used for all email notifications.
          </p>
        </div>
        
        <div className="info-box">
          <h2>Email Notification Types</h2>
          
          <div className="notification-type">
            <h3>Session Approaching Expiration (23 hours)</h3>
            <p>
              Sent when a session has been active for 23 hours (1 hour before expiration).
              This notification allows users to close the session manually if they're still using it.
            </p>
            <div className="notification-details">
              <div className="detail-row">
                <div className="detail-label">Subject:</div>
                <div className="detail-value">Not At Home - Session Expiring Soon (CODE) - CONGREGATION</div>
              </div>
              <div className="detail-row">
                <div className="detail-label">Recipients:</div>
                <div className="detail-value">Congregation's Default Notification Email</div>
              </div>
              <div className="detail-row">
                <div className="detail-label">Content:</div>
                <div className="detail-value">Session details, map number, and all addresses collected</div>
              </div>
            </div>
          </div>
          
          <div className="notification-type">
            <h3>Session Expired (24 hours)</h3>
            <p>
              Sent when a session has been active for 24 hours and is automatically closed.
              This notification provides a record of the session data before it's deleted.
            </p>
            <div className="notification-details">
              <div className="detail-row">
                <div className="detail-label">Subject:</div>
                <div className="detail-value">Not At Home - Expired Session (CODE) - CONGREGATION</div>
              </div>
              <div className="detail-row">
                <div className="detail-label">Recipients:</div>
                <div className="detail-value">Congregation's Default Notification Email</div>
              </div>
              <div className="detail-row">
                <div className="detail-label">Content:</div>
                <div className="detail-value">Session details, map number, and all addresses collected</div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <style jsx>{`
        .container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }
        
        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 15px;
        }
        
        h1 {
          font-size: 1.8rem;
          color: #1e293b;
          margin: 0;
        }
        
        .nav-links {
          display: flex;
          gap: 15px;
        }
        
        .nav-link {
          color: #3b82f6;
          text-decoration: none;
          font-size: 1rem;
        }
        
        .info-box {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
        }
        
        .info-box h2 {
          color: #334155;
          font-size: 1.25rem;
          margin-top: 0;
          margin-bottom: 15px;
        }
        
        .info-box p {
          color: #475569;
          margin-bottom: 15px;
        }
        
        .config-table {
          margin: 20px 0;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          overflow: hidden;
        }
        
        .config-row {
          display: flex;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .config-row:last-child {
          border-bottom: none;
        }
        
        .config-label {
          flex: 0 0 150px;
          padding: 12px 15px;
          background-color: #f1f5f9;
          font-weight: 500;
          color: #334155;
        }
        
        .config-value {
          flex: 1;
          padding: 12px 15px;
          color: #1e293b;
          font-family: monospace;
        }
        
        .note {
          background-color: #fffbeb;
          border-left: 4px solid #f59e0b;
          padding: 12px 15px;
          font-size: 0.9rem;
          margin-top: 20px;
        }
        
        .note strong {
          color: #92400e;
        }
        
        code {
          background-color: #f1f5f9;
          padding: 2px 4px;
          border-radius: 4px;
          font-family: monospace;
        }
        
        .notification-type {
          margin-bottom: 25px;
          padding-bottom: 25px;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .notification-type:last-child {
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }
        
        .notification-type h3 {
          color: #1e40af;
          font-size: 1.1rem;
          margin-bottom: 10px;
        }
        
        .notification-details {
          margin-top: 15px;
          background-color: white;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          overflow: hidden;
        }
        
        .detail-row {
          display: flex;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .detail-row:last-child {
          border-bottom: none;
        }
        
        .detail-label {
          flex: 0 0 120px;
          padding: 10px 15px;
          background-color: #f8fafc;
          font-weight: 500;
          color: #334155;
          font-size: 0.9rem;
        }
        
        .detail-value {
          flex: 1;
          padding: 10px 15px;
          color: #475569;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
};

export default EmailSettingsPage;

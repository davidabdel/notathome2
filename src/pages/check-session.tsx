import React from 'react';
import Link from 'next/link';
import SessionChecker from '../components/SessionChecker';

const CheckSessionPage: React.FC = () => {
  return (
    <div className="container">
      <header>
        <h1>Session Checker</h1>
        <div className="nav-links">
          <Link href="/test-notification" className="nav-link">Test Notifications</Link>
          <Link href="/session-debug" className="nav-link">Session Debug</Link>
          <Link href="/debug" className="nav-link">Debug</Link>
          <Link href="/" className="nav-link">Home</Link>
        </div>
      </header>
      
      <main>
        <div className="info-box">
          <h2>About Session Checking</h2>
          <p>
            This page allows you to check if a specific session exists in the database.
            Enter a session ID to verify its existence and view its details.
          </p>
          <p>
            This is useful for debugging issues with the notification system, especially
            when you get errors like "Session not found" but you believe the session should exist.
          </p>
        </div>
        
        <SessionChecker />
        
        <div className="troubleshooting">
          <h2>Common Issues</h2>
          
          <div className="issue-card">
            <h3>"Session not found" Error</h3>
            <p>
              This error occurs when the system cannot find a session with the specified ID.
              Possible causes:
            </p>
            <ul>
              <li>The session ID is incorrect or has been typed incorrectly</li>
              <li>The session has been deleted from the database</li>
              <li>You're connected to the wrong database instance</li>
              <li>The sessions table doesn't exist in the database</li>
            </ul>
          </div>
          
          <div className="issue-card">
            <h3>Missing Congregation Information</h3>
            <p>
              If a session exists but its congregation information is missing, notifications
              may fail because there's no email address to send to. Check that:
            </p>
            <ul>
              <li>The congregation exists in the database</li>
              <li>The congregation has a notification email set</li>
              <li>The session is correctly linked to the congregation</li>
            </ul>
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
          background-color: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
        }
        
        .info-box h2 {
          color: #1e40af;
          font-size: 1.25rem;
          margin-top: 0;
          margin-bottom: 15px;
        }
        
        .info-box p {
          color: #1e3a8a;
          margin-bottom: 15px;
        }
        
        .troubleshooting {
          margin-top: 30px;
        }
        
        .troubleshooting h2 {
          color: #334155;
          font-size: 1.5rem;
          margin-bottom: 20px;
        }
        
        .issue-card {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }
        
        .issue-card h3 {
          color: #334155;
          font-size: 1.25rem;
          margin-top: 0;
          margin-bottom: 15px;
        }
        
        .issue-card p {
          color: #475569;
          margin-bottom: 15px;
        }
        
        .issue-card ul {
          margin: 0;
          padding-left: 20px;
        }
        
        .issue-card li {
          color: #475569;
          margin-bottom: 5px;
        }
      `}</style>
    </div>
  );
};

export default CheckSessionPage;

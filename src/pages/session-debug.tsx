import React from 'react';
import Link from 'next/link';
import SessionDebugger from '../components/SessionDebugger';

const SessionDebugPage: React.FC = () => {
  return (
    <div className="container">
      <header>
        <h1>Session Debugger</h1>
        <div className="nav-links">
          <Link href="/test-notification" className="nav-link">Test Notifications</Link>
          <Link href="/debug" className="nav-link">Debug</Link>
          <Link href="/" className="nav-link">Home</Link>
        </div>
      </header>
      
      <main>
        <div className="info-box">
          <h2>About Session Debugging</h2>
          <p>
            This page helps you debug issues with sessions in the database. You can check if the sessions table exists,
            view all sessions, and get information about the database.
          </p>
          <p>
            If you're having trouble with the session notification system, use this page to verify that:
          </p>
          <ol>
            <li>The sessions table exists in the database</li>
            <li>There are active sessions in the database</li>
            <li>The session IDs are valid</li>
          </ol>
        </div>
        
        <SessionDebugger />
        
        <div className="troubleshooting">
          <h2>Troubleshooting</h2>
          
          <div className="issue-card">
            <h3>"Session not found" Error</h3>
            <p>
              This error occurs when you try to send a notification for a session that doesn't exist in the database.
              Possible causes:
            </p>
            <ul>
              <li>The session ID is incorrect</li>
              <li>The session has been deleted</li>
              <li>The sessions table doesn't exist</li>
              <li>There's an issue with the database connection</li>
            </ul>
            <p>
              <strong>Solution:</strong> Use the Session Debugger to check if the sessions table exists and if there are any active sessions.
              Then try sending a notification for one of the active sessions.
            </p>
          </div>
          
          <div className="issue-card">
            <h3>No Sessions Showing</h3>
            <p>
              If no sessions are showing in the debugger, it could be because:
            </p>
            <ul>
              <li>No sessions have been created yet</li>
              <li>All sessions have been deleted</li>
              <li>There's an issue with the database connection</li>
            </ul>
            <p>
              <strong>Solution:</strong> Create a new session by starting a new outreach session in the app.
              Then refresh the debugger to see if the session appears.
            </p>
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
        
        .info-box ol {
          margin: 0;
          padding-left: 20px;
        }
        
        .info-box li {
          color: #1e3a8a;
          margin-bottom: 8px;
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
          margin: 0 0 15px 0;
          padding-left: 20px;
        }
        
        .issue-card li {
          color: #475569;
          margin-bottom: 5px;
        }
        
        .issue-card strong {
          color: #334155;
        }
      `}</style>
    </div>
  );
};

export default SessionDebugPage;

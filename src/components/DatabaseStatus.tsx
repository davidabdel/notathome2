import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const DatabaseStatus: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isFixed, setIsFixed] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);

  useEffect(() => {
    const checkDatabase = async () => {
      try {
        const response = await fetch('/api/check-database');
        const data = await response.json();
        
        setIsFixed(!data.needs_fixing);
        setIssues(data.issues || []);
      } catch (error) {
        console.error('Error checking database:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkDatabase();
  }, []);

  if (loading) {
    return <div className="loading">Checking database status...</div>;
  }

  return (
    <div className="database-status">
      {isFixed ? (
        <div className="status-card fixed">
          <h3>Database Status: Fixed</h3>
          <p>All database components are properly set up.</p>
        </div>
      ) : (
        <div className="status-card not-fixed">
          <h3>Database Status: Issues Detected</h3>
          <p>The following issues were detected in your database:</p>
          <ul className="issues-list">
            {issues.map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
          <div className="fix-actions">
            <Link href="/fix-database">
              <div className="fix-link">Go to Fix Database Page</div>
            </Link>
            <Link href="/manual-fix">
              <div className="fix-link">Go to Manual Fix Page</div>
            </Link>
          </div>
        </div>
      )}

      <style jsx>{`
        .database-status {
          margin: 1rem 0;
        }
        
        .loading {
          color: #64748b;
          font-size: 0.875rem;
          margin: 1rem 0;
        }
        
        .status-card {
          padding: 1rem;
          border-radius: 0.375rem;
          margin-bottom: 1rem;
        }
        
        .fixed {
          background-color: #dcfce7;
          border: 1px solid #86efac;
        }
        
        .not-fixed {
          background-color: #fee2e2;
          border: 1px solid #fca5a5;
        }
        
        h3 {
          margin-top: 0;
          margin-bottom: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
        }
        
        .fixed h3 {
          color: #166534;
        }
        
        .not-fixed h3 {
          color: #b91c1c;
        }
        
        p {
          margin-top: 0;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }
        
        .fixed p {
          color: #166534;
        }
        
        .not-fixed p {
          color: #b91c1c;
        }
        
        .issues-list {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-top: 0.5rem;
          margin-bottom: 1rem;
        }
        
        .issues-list li {
          color: #b91c1c;
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
        }
        
        .fix-actions {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }
        
        .fix-link {
          display: inline-block;
          background-color: #2563eb;
          color: white;
          border-radius: 0.25rem;
          padding: 0.5rem 1rem;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .fix-link:hover {
          background-color: #1d4ed8;
        }
      `}</style>
    </div>
  );
};

export default DatabaseStatus; 
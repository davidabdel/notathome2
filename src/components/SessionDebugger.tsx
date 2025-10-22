import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/config';

const SessionDebugger: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableExists, setTableExists] = useState<boolean | null>(null);
  const [databaseInfo, setDatabaseInfo] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Check if the sessions table exists
  const checkSessionsTable = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Try to query the sessions table with a simpler query
      // Just select a single row to check if the table exists
      const { data, error } = await supabase
        .from('sessions')
        .select('id')
        .limit(1);
      
      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist
          setTableExists(false);
          setError(`Sessions table doesn't exist: ${error.message}`);
        } else {
          // Other error
          setTableExists(null);
          setError(`Error checking sessions table: ${error.message}`);
        }
      } else {
        // Table exists
        setTableExists(true);
        console.log('Sessions table exists');
        
        // Now fetch all sessions
        await fetchSessions();
      }
    } catch (err: any) {
      setError(`Error: ${err.message}`);
      setTableExists(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all sessions from the database
  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id,
          code,
          created_at,
          expires_at,
          is_active,
          congregation_id,
          congregations (
            name
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        setError(`Error fetching sessions: ${error.message}`);
      } else {
        setSessions(data || []);
      }
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Get database info
  const getDatabaseInfo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get Supabase URL from environment variable
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      
      // Instead of querying information_schema.tables, we'll use a different approach
      // We'll check for the existence of known tables in our application
      const knownTables = [
        'sessions',
        'congregations',
        'users',
        'not_at_home_addresses',
        'session_participants',
        'system_settings'
      ];
      
      const tableResults = [];
      
      // Check each table to see if it exists
      for (const tableName of knownTables) {
        const { error } = await supabase
          .from(tableName)
          .select('id')
          .limit(1);
        
        // If there's no error, the table exists
        if (!error) {
          tableResults.push(tableName);
        }
      }
      
      setDatabaseInfo({
        url: supabaseUrl,
        tables: tableResults,
      });
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="session-debugger">
      <h2>Session Database Debugger</h2>
      
      <div className="button-group">
        <button 
          className="debug-button"
          onClick={checkSessionsTable}
          disabled={loading}
        >
          {loading ? 'Checking...' : 'Check Sessions Table'}
        </button>
        
        <button 
          className="debug-button"
          onClick={fetchSessions}
          disabled={loading || tableExists === false}
        >
          {loading ? 'Loading...' : 'Fetch All Sessions'}
        </button>
        
        <button 
          className="debug-button"
          onClick={getDatabaseInfo}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Get Database Info'}
        </button>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {tableExists === false && (
        <div className="warning-message">
          <h3>Sessions Table Not Found</h3>
          <p>The sessions table doesn't exist in the database. This could be because:</p>
          <ul>
            <li>The database hasn't been initialized properly</li>
            <li>The table was deleted</li>
            <li>You're connected to the wrong database</li>
          </ul>
        </div>
      )}
      
      {databaseInfo && (
        <div className="info-section">
          <h3>Database Information</h3>
          <div className="info-item">
            <span className="info-label">Supabase URL:</span>
            <span className="info-value">{databaseInfo.url || 'Not set'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Tables:</span>
            <span className="info-value">{databaseInfo.tables.length} tables found</span>
          </div>
          <div className="tables-list">
            {databaseInfo.tables.map((table: string) => (
              <div key={table} className="table-item">
                {table}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {sessions.length > 0 && (
        <div className="sessions-section">
          <h3>Sessions ({sessions.length})</h3>
          <div className="sessions-table">
            <div className="table-header">
              <div className="header-cell">Code</div>
              <div className="header-cell">Created</div>
              <div className="header-cell">Expires</div>
              <div className="header-cell">Active</div>
              <div className="header-cell">Congregation</div>
              <div className="header-cell">ID</div>
            </div>
            {sessions.map((session) => (
              <div key={session.id} className="table-row">
                <div className="cell">{session.code}</div>
                <div className="cell">{new Date(session.created_at).toLocaleString()}</div>
                <div className="cell">{new Date(session.expires_at).toLocaleString()}</div>
                <div className="cell">{session.is_active ? 'Yes' : 'No'}</div>
                <div className="cell">{session.congregations?.name || 'Unknown'}</div>
                <div className="cell id-cell">
                  <div className="id-text" title={session.id}>{session.id}</div>
                  <div className="button-group">
                    <button 
                      className="copy-button"
                      onClick={() => {
                        navigator.clipboard.writeText(session.id);
                        setCopiedId(session.id);
                        setTimeout(() => setCopiedId(null), 2000);
                      }}
                      title="Copy session ID"
                    >
                      {copiedId === session.id ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      className="use-button"
                      onClick={() => {
                        // Open the test notification page with this session ID
                        window.location.href = `/test-notification?sessionId=${encodeURIComponent(session.id)}`;
                      }}
                      title="Use this session ID for testing"
                    >
                      Test
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <style jsx>{`
        .session-debugger {
          background-color: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          padding: 1.5rem;
          margin: 1.5rem 0;
        }
        
        h2 {
          margin-top: 0;
          margin-bottom: 1.5rem;
          color: #1e293b;
          font-size: 1.5rem;
        }
        
        h3 {
          margin-top: 0;
          margin-bottom: 1rem;
          color: #334155;
          font-size: 1.25rem;
        }
        
        .button-group {
          display: flex;
          gap: 10px;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        
        .debug-button {
          padding: 10px 16px;
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background-color 0.2s;
        }
        
        .debug-button:hover:not(:disabled) {
          background-color: #2563eb;
        }
        
        .debug-button:disabled {
          background-color: #93c5fd;
          cursor: not-allowed;
        }
        
        .error-message {
          margin-bottom: 1.5rem;
          background-color: #fee2e2;
          color: #b91c1c;
          padding: 0.75rem;
          border-radius: 4px;
          font-size: 0.9rem;
        }
        
        .warning-message {
          margin-bottom: 1.5rem;
          background-color: #fef3c7;
          color: #92400e;
          padding: 0.75rem;
          border-radius: 4px;
        }
        
        .warning-message h3 {
          color: #92400e;
          margin-top: 0;
          margin-bottom: 0.5rem;
          font-size: 1.1rem;
        }
        
        .warning-message ul {
          margin-top: 0.5rem;
          margin-bottom: 0;
          padding-left: 1.5rem;
        }
        
        .info-section {
          margin-bottom: 1.5rem;
          background-color: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 6px;
          padding: 1rem;
        }
        
        .info-item {
          display: flex;
          margin-bottom: 0.5rem;
        }
        
        .info-label {
          font-weight: 500;
          width: 120px;
          color: #1e40af;
        }
        
        .info-value {
          color: #1e293b;
        }
        
        .tables-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 0.5rem;
        }
        
        .table-item {
          background-color: #dbeafe;
          color: #1e40af;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.85rem;
          font-family: monospace;
        }
        
        .sessions-section {
          margin-top: 1.5rem;
        }
        
        .sessions-table {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          overflow: hidden;
          font-size: 0.9rem;
        }
        
        .table-header {
          display: flex;
          background-color: #f1f5f9;
          font-weight: 600;
          color: #475569;
        }
        
        .header-cell, .cell {
          padding: 10px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .header-cell:nth-child(1), .cell:nth-child(1) {
          width: 80px;
        }
        
        .header-cell:nth-child(2), .cell:nth-child(2),
        .header-cell:nth-child(3), .cell:nth-child(3) {
          width: 180px;
        }
        
        .header-cell:nth-child(4), .cell:nth-child(4) {
          width: 60px;
        }
        
        .header-cell:nth-child(5), .cell:nth-child(5) {
          width: 150px;
        }
        
        .header-cell:nth-child(6), .cell:nth-child(6) {
          flex: 1;
          min-width: 100px;
        }
        
        .table-row {
          display: flex;
          border-top: 1px solid #e2e8f0;
        }
        
        .table-row:nth-child(even) {
          background-color: #f8fafc;
        }
        
        .id-cell {
          font-family: monospace;
          font-size: 0.85rem;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .id-text {
          word-break: break-all;
          overflow-wrap: break-word;
          width: 100%;
        }
        
        .button-group {
          display: flex;
          gap: 5px;
        }
        
        .copy-button, .use-button {
          background-color: #e2e8f0;
          color: #475569;
          border: none;
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .copy-button:hover {
          background-color: #cbd5e1;
        }
        
        .use-button {
          background-color: #dbeafe;
          color: #1e40af;
        }
        
        .use-button:hover {
          background-color: #bfdbfe;
        }
      `}</style>
    </div>
  );
};

export default SessionDebugger;

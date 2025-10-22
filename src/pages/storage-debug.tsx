import React, { useState } from 'react';
import Link from 'next/link';

const StorageDebugPage: React.FC = () => {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const runTest = async (testName: string, action: string) => {
    setLoading(prev => ({ ...prev, [testName]: true }));
    try {
      const response = await fetch('/api/debug-storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });
      
      const result = await response.json();
      
      setResults(prev => ({ 
        ...prev, 
        [testName]: { 
          ...result,
          timestamp: new Date().toISOString(),
          httpStatus: response.status
        } 
      }));
    } catch (error: any) {
      console.error(`Error in ${testName}:`, error);
      setResults(prev => ({ 
        ...prev, 
        [testName]: { 
          success: false, 
          error: error.message || String(error),
          timestamp: new Date().toISOString()
        } 
      }));
    } finally {
      setLoading(prev => ({ ...prev, [testName]: false }));
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderResult = (testName: string) => {
    const result = results[testName];
    if (!result) return null;

    const isExpanded = expandedSections[testName] || false;
    const statusClass = result.success ? 'success' : 'error';

    return (
      <div className={`result-box ${statusClass}`}>
        <div className="result-header" onClick={() => toggleSection(testName)}>
          <div className="result-title">
            <span className="status-indicator">{result.success ? '✅' : '❌'}</span>
            <span className="test-name">{testName}</span>
            {result.message && <span className="message">{result.message}</span>}
          </div>
          <div className="result-meta">
            <span className="timestamp">{new Date(result.timestamp).toLocaleTimeString()}</span>
            <span className="expand-icon">{isExpanded ? '▼' : '►'}</span>
          </div>
        </div>
        {isExpanded && (
          <pre className="result-data">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    );
  };

  return (
    <div className="debug-container">
      <header>
        <h1>Storage Bucket Debug</h1>
        <div className="nav-links">
          <Link href="/debug" className="nav-link">General Debug</Link>
          <Link href="/" className="nav-link">Home</Link>
        </div>
      </header>

      <div className="debug-grid">
        <section className="debug-section">
          <h2>Environment</h2>
          <p className="section-description">
            Check if the required environment variables are set correctly.
          </p>
          <button 
            onClick={() => runTest('Environment Check', 'check_env')}
            disabled={loading['Environment Check']}
            className="debug-button"
          >
            {loading['Environment Check'] ? 'Checking...' : 'Check Environment Variables'}
          </button>
          {renderResult('Environment Check')}
        </section>

        <section className="debug-section">
          <h2>Storage Buckets</h2>
          <p className="section-description">
            List all storage buckets in the Supabase project.
          </p>
          <button 
            onClick={() => runTest('List Buckets', 'list_buckets')}
            disabled={loading['List Buckets']}
            className="debug-button"
          >
            {loading['List Buckets'] ? 'Listing...' : 'List All Buckets'}
          </button>
          {renderResult('List Buckets')}
        </section>

        <section className="debug-section">
          <h2>Maps Bucket</h2>
          <p className="section-description">
            Check if the "maps" bucket exists and its configuration.
          </p>
          <button 
            onClick={() => runTest('Check Maps Bucket', 'check_bucket')}
            disabled={loading['Check Maps Bucket']}
            className="debug-button"
          >
            {loading['Check Maps Bucket'] ? 'Checking...' : 'Check Maps Bucket'}
          </button>
          {renderResult('Check Maps Bucket')}
        </section>

        <section className="debug-section">
          <h2>Create Bucket</h2>
          <p className="section-description">
            Attempt to create the "maps" bucket with the service role key.
          </p>
          <button 
            onClick={() => runTest('Create Maps Bucket', 'create_bucket')}
            disabled={loading['Create Maps Bucket']}
            className="debug-button warning"
          >
            {loading['Create Maps Bucket'] ? 'Creating...' : 'Create Maps Bucket'}
          </button>
          {renderResult('Create Maps Bucket')}
        </section>

        <section className="debug-section">
          <h2>RLS Policies</h2>
          <p className="section-description">
            Check Row Level Security policies on the storage.buckets table.
          </p>
          <button 
            onClick={() => runTest('Check RLS Policies', 'check_rls')}
            disabled={loading['Check RLS Policies']}
            className="debug-button"
          >
            {loading['Check RLS Policies'] ? 'Checking...' : 'Check RLS Policies'}
          </button>
          {renderResult('Check RLS Policies')}
        </section>

        <section className="debug-section">
          <h2>Permissions</h2>
          <p className="section-description">
            Check database permissions for the storage.buckets table.
          </p>
          <button 
            onClick={() => runTest('Check Permissions', 'check_permissions')}
            disabled={loading['Check Permissions']}
            className="debug-button"
          >
            {loading['Check Permissions'] ? 'Checking...' : 'Check Permissions'}
          </button>
          {renderResult('Check Permissions')}
        </section>
      </div>

      <div className="debug-summary">
        <h2>Diagnostic Steps</h2>
        <ol className="steps-list">
          <li>Check if environment variables are properly set</li>
          <li>List all buckets to verify connection to Supabase storage</li>
          <li>Check if the "maps" bucket already exists</li>
          <li>Try to create the "maps" bucket with service role key</li>
          <li>Check RLS policies that might be preventing bucket creation</li>
          <li>Verify permissions on the storage.buckets table</li>
        </ol>
      </div>

      <style jsx>{`
        .debug-container {
          max-width: 1200px;
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
        
        .debug-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        
        .debug-section {
          padding: 20px;
          border-radius: 8px;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        h2 {
          margin-top: 0;
          color: #334155;
          font-size: 1.4rem;
          margin-bottom: 10px;
        }
        
        .section-description {
          color: #64748b;
          font-size: 0.9rem;
          margin-bottom: 15px;
          flex-grow: 1;
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
          width: 100%;
          margin-bottom: 15px;
        }
        
        .debug-button:hover:not(:disabled) {
          background-color: #2563eb;
        }
        
        .debug-button:disabled {
          background-color: #93c5fd;
          cursor: not-allowed;
        }
        
        .debug-button.warning {
          background-color: #f59e0b;
        }
        
        .debug-button.warning:hover:not(:disabled) {
          background-color: #d97706;
        }
        
        .result-box {
          margin-top: 10px;
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }
        
        .result-box.success {
          border-left: 4px solid #10b981;
        }
        
        .result-box.error {
          border-left: 4px solid #ef4444;
        }
        
        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          background-color: #f1f5f9;
          font-size: 0.9rem;
          cursor: pointer;
          user-select: none;
        }
        
        .result-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .status-indicator {
          font-size: 1.1rem;
        }
        
        .test-name {
          font-weight: 500;
        }
        
        .message {
          color: #64748b;
          font-size: 0.85rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 150px;
        }
        
        .result-meta {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .timestamp {
          color: #64748b;
          font-size: 0.8rem;
        }
        
        .expand-icon {
          color: #64748b;
          font-size: 0.8rem;
        }
        
        .result-data {
          margin: 0;
          padding: 12px;
          background-color: #ffffff;
          overflow-x: auto;
          font-size: 0.85rem;
          line-height: 1.5;
          max-height: 300px;
          overflow-y: auto;
        }
        
        .debug-summary {
          padding: 20px;
          border-radius: 8px;
          background-color: #f0f9ff;
          border: 1px solid #bae6fd;
          margin-top: 30px;
        }
        
        .steps-list {
          margin: 0;
          padding-left: 20px;
        }
        
        .steps-list li {
          margin-bottom: 8px;
          color: #0c4a6e;
        }
      `}</style>
    </div>
  );
};

export default StorageDebugPage;

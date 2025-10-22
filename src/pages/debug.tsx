import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import Link from 'next/link';

const DebugPage: React.FC = () => {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const router = useRouter();

  // Create a Supabase client with the browser client credentials
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const runTest = async (testName: string, testFunction: () => Promise<any>) => {
    setLoading(prev => ({ ...prev, [testName]: true }));
    try {
      const result = await testFunction();
      setResults(prev => ({ 
        ...prev, 
        [testName]: { 
          success: true, 
          data: result,
          timestamp: new Date().toISOString()
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

  // Test functions
  const testSupabaseConnection = async () => {
    const { data, error } = await supabase.from('congregations').select('count(*)');
    if (error) throw error;
    return data;
  };

  const testListBuckets = async () => {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) throw error;
    return data;
  };

  const testCheckMapsBucket = async () => {
    try {
      const { data, error } = await supabase.storage.getBucket('maps');
      if (error) throw error;
      return data;
    } catch (error: any) {
      // If bucket doesn't exist, we'll get an error
      if (error.message.includes('Bucket not found')) {
        return { exists: false, message: 'Bucket "maps" does not exist' };
      }
      throw error;
    }
  };

  const testCreateMapsBucket = async () => {
    // First check if it exists
    try {
      const { data: existingBucket, error: checkError } = await supabase.storage.getBucket('maps');
      if (!checkError && existingBucket) {
        return { exists: true, message: 'Bucket "maps" already exists', bucket: existingBucket };
      }
    } catch (error: any) {
      // Continue if bucket doesn't exist
      console.log('Bucket does not exist, will try to create it');
    }

    // Try to create the bucket
    const { data, error } = await supabase.storage.createBucket('maps', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      fileSizeLimit: 5242880 // 5MB
    });
    
    if (error) throw error;
    return { created: true, data };
  };

  const testApiCreateMapsBucket = async () => {
    const response = await fetch('/api/create-storage-bucket', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${errorText}`);
    }
    
    return await response.json();
  };

  const testApiFixAll = async () => {
    const response = await fetch('/api/fix-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${errorText}`);
    }
    
    return await response.json();
  };

  const testEnvironmentVariables = async () => {
    return {
      supabaseUrl: supabaseUrl ? 'Set (hidden for security)' : 'Not set',
      supabaseAnonKey: supabaseAnonKey ? 'Set (hidden for security)' : 'Not set',
      serviceRoleKeyStatus: 'Can only be checked on server side'
    };
  };

  const renderResult = (testName: string) => {
    const result = results[testName];
    if (!result) return null;

    return (
      <div className={`result-box ${result.success ? 'success' : 'error'}`}>
        <div className="result-header">
          <span>{result.success ? '✅ Success' : '❌ Error'}</span>
          <span className="timestamp">{new Date(result.timestamp).toLocaleTimeString()}</span>
        </div>
        <pre className="result-data">
          {JSON.stringify(result.success ? result.data : { error: result.error }, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="debug-container">
      <header>
        <h1>Not At Home - Debug Page</h1>
        <Link href="/" className="back-link">← Back to Home</Link>
      </header>

      <section className="debug-section">
        <h2>Environment & Connection</h2>
        <div className="button-group">
          <button 
            onClick={() => runTest('environmentVariables', testEnvironmentVariables)}
            disabled={loading['environmentVariables']}
            className="debug-button"
          >
            {loading['environmentVariables'] ? 'Checking...' : 'Check Environment Variables'}
          </button>
          <button 
            onClick={() => runTest('supabaseConnection', testSupabaseConnection)}
            disabled={loading['supabaseConnection']}
            className="debug-button"
          >
            {loading['supabaseConnection'] ? 'Testing...' : 'Test Supabase Connection'}
          </button>
        </div>
        {renderResult('environmentVariables')}
        {renderResult('supabaseConnection')}
      </section>

      <section className="debug-section">
        <h2>Storage Buckets</h2>
        <div className="button-group">
          <button 
            onClick={() => runTest('listBuckets', testListBuckets)}
            disabled={loading['listBuckets']}
            className="debug-button"
          >
            {loading['listBuckets'] ? 'Listing...' : 'List All Buckets'}
          </button>
          <button 
            onClick={() => runTest('checkMapsBucket', testCheckMapsBucket)}
            disabled={loading['checkMapsBucket']}
            className="debug-button"
          >
            {loading['checkMapsBucket'] ? 'Checking...' : 'Check Maps Bucket'}
          </button>
          <button 
            onClick={() => runTest('createMapsBucket', testCreateMapsBucket)}
            disabled={loading['createMapsBucket']}
            className="debug-button warning"
          >
            {loading['createMapsBucket'] ? 'Creating...' : 'Create Maps Bucket (Client)'}
          </button>
        </div>
        {renderResult('listBuckets')}
        {renderResult('checkMapsBucket')}
        {renderResult('createMapsBucket')}
      </section>

      <section className="debug-section">
        <h2>API Endpoints</h2>
        <div className="button-group">
          <button 
            onClick={() => runTest('apiCreateMapsBucket', testApiCreateMapsBucket)}
            disabled={loading['apiCreateMapsBucket']}
            className="debug-button warning"
          >
            {loading['apiCreateMapsBucket'] ? 'Creating...' : 'Create Maps Bucket (API)'}
          </button>
          <button 
            onClick={() => runTest('apiFixAll', testApiFixAll)}
            disabled={loading['apiFixAll']}
            className="debug-button warning"
          >
            {loading['apiFixAll'] ? 'Fixing...' : 'Run Fix All API'}
          </button>
        </div>
        {renderResult('apiCreateMapsBucket')}
        {renderResult('apiFixAll')}
      </section>

      <style jsx>{`
        .debug-container {
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
        
        .back-link {
          color: #3b82f6;
          text-decoration: none;
          font-size: 1rem;
        }
        
        .debug-section {
          margin-bottom: 30px;
          padding: 20px;
          border-radius: 8px;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
        }
        
        h2 {
          margin-top: 0;
          color: #334155;
          font-size: 1.4rem;
          margin-bottom: 15px;
        }
        
        .button-group {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 15px;
        }
        
        .debug-button {
          padding: 8px 16px;
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          min-width: 180px;
          transition: background-color 0.2s;
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
          margin-top: 15px;
          border-radius: 4px;
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
          padding: 8px 12px;
          background-color: #f1f5f9;
          font-size: 0.9rem;
          font-weight: 500;
        }
        
        .timestamp {
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
        }
      `}</style>
    </div>
  );
};

export default DebugPage;

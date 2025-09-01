import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function EnvCheck() {
  const [envStatus, setEnvStatus] = useState<{
    url?: string;
    keyDefined?: boolean;
    serviceKeyDefined?: boolean;
    connectionTested?: boolean;
    connectionSuccess?: boolean;
    error?: string;
  }>({});

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKeyDefined = !!process.env.NEXT_PUBLIC_SUPABASE_KEY;
    const serviceKeyDefined = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

    setEnvStatus({
      url: supabaseUrl,
      keyDefined: supabaseKeyDefined,
      serviceKeyDefined: serviceKeyDefined
    });
  }, []);

  const testConnection = async () => {
    setIsLoading(true);
    try {
      // Try a simple query
      const { data, error } = await supabase.from('user_roles').select('count', { count: 'exact' });
      
      if (error) {
        setEnvStatus(prev => ({
          ...prev,
          connectionTested: true,
          connectionSuccess: false,
          error: error.message
        }));
      } else {
        setEnvStatus(prev => ({
          ...prev,
          connectionTested: true,
          connectionSuccess: true,
          error: undefined
        }));
      }
    } catch (err) {
      setEnvStatus(prev => ({
        ...prev,
        connectionTested: true,
        connectionSuccess: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const testApiConnection = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/test-supabase-connection');
      const data = await response.json();
      
      setEnvStatus(prev => ({
        ...prev,
        connectionTested: true,
        connectionSuccess: data.success,
        error: data.success ? undefined : JSON.stringify(data.error)
      }));
    } catch (err) {
      setEnvStatus(prev => ({
        ...prev,
        connectionTested: true,
        connectionSuccess: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Supabase Environment Check</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
        <h2>Environment Variables</h2>
        <p>NEXT_PUBLIC_SUPABASE_URL: {envStatus.url ? 
          <span style={{ color: 'green' }}>✅ {envStatus.url}</span> : 
          <span style={{ color: 'red' }}>❌ Missing</span>}
        </p>
        <p>NEXT_PUBLIC_SUPABASE_KEY: {envStatus.keyDefined ? 
          <span style={{ color: 'green' }}>✅ Defined</span> : 
          <span style={{ color: 'red' }}>❌ Missing</span>}
        </p>
        <p>SUPABASE_SERVICE_ROLE_KEY: {envStatus.serviceKeyDefined ? 
          <span style={{ color: 'green' }}>✅ Defined</span> : 
          <span style={{ color: 'red' }}>❌ Missing</span>}
        </p>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Connection Tests</h2>
        <button 
          onClick={testConnection} 
          disabled={isLoading}
          style={{ 
            padding: '8px 16px', 
            marginRight: '10px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'Testing...' : 'Test Client Connection'}
        </button>
        
        <button 
          onClick={testApiConnection} 
          disabled={isLoading}
          style={{ 
            padding: '8px 16px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'Testing...' : 'Test API Connection'}
        </button>
        
        {envStatus.connectionTested && (
          <div style={{ 
            marginTop: '15px', 
            padding: '10px', 
            backgroundColor: envStatus.connectionSuccess ? '#e8f5e9' : '#ffebee',
            borderRadius: '4px'
          }}>
            {envStatus.connectionSuccess ? (
              <p style={{ color: 'green' }}>✅ Connection successful!</p>
            ) : (
              <>
                <p style={{ color: 'red' }}>❌ Connection failed:</p>
                <pre style={{ 
                  backgroundColor: '#f5f5f5', 
                  padding: '10px', 
                  borderRadius: '4px',
                  overflowX: 'auto' 
                }}>
                  {envStatus.error}
                </pre>
              </>
            )}
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '30px' }}>
        <h2>Troubleshooting</h2>
        <p>If you're seeing missing environment variables:</p>
        <ol>
          <li>Check that your <code>.env.local</code> file exists in the project root</li>
          <li>Ensure it contains the following variables:
            <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
              NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
              NEXT_PUBLIC_SUPABASE_KEY=your-anon-key
              SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
            </pre>
          </li>
          <li>Restart your development server after making changes</li>
        </ol>
        
        <p>If connection tests fail:</p>
        <ul>
          <li>Verify your Supabase project is active</li>
          <li>Check network connectivity</li>
          <li>Ensure your Supabase URL and keys are correct</li>
          <li>Check CORS settings in your Supabase dashboard</li>
        </ul>
      </div>
    </div>
  );
}

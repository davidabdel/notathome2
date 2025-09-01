import React, { useState, useEffect } from 'react';

interface SchemaInfo {
  tables: {
    territory_maps: {
      exists: boolean;
      error: string | null;
    };
    user_roles: {
      exists: boolean;
      error: string | null;
    };
    congregations: {
      exists: boolean;
      error: string | null;
    };
  };
  functions: {
    execute_sql: {
      exists: boolean;
    };
  };
  storage: {
    maps_bucket: {
      exists: boolean;
    };
  };
  security: {
    rls_enabled: boolean;
    policies_exist: boolean;
  };
  environment: {
    supabase_url: boolean;
    supabase_key: boolean;
    service_role_key: boolean;
  };
}

interface DiagnosticResult {
  schema: SchemaInfo;
  issues: string[];
  needs_fixing: boolean;
}

interface DatabaseDiagnosticProps {
  onDiagnosticComplete?: (result: DiagnosticResult) => void;
  autoRun?: boolean;
  showRefreshButton?: boolean;
}

const DatabaseDiagnostic: React.FC<DatabaseDiagnosticProps> = ({
  onDiagnosticComplete,
  autoRun = true,
  showRefreshButton = true,
}) => {
  const [loading, setLoading] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [diagnosticError, setDiagnosticError] = useState('');

  const runDiagnostic = async () => {
    setLoading(true);
    setDiagnosticError('');
    
    try {
      const response = await fetch('/api/check-database');
      
      if (!response.ok) {
        throw new Error('Failed to run diagnostic');
      }
      
      const data = await response.json();
      setDiagnosticResult(data);
      
      if (onDiagnosticComplete) {
        onDiagnosticComplete(data);
      }
    } catch (error: any) {
      console.error('Error running diagnostic:', error);
      setDiagnosticError(error.message || 'An error occurred while running the diagnostic');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoRun) {
      runDiagnostic();
    }
  }, [autoRun]);

  return (
    <div className="database-diagnostic">
      <h2>Database Diagnostic</h2>
      <p className="description">
        This section shows the current state of your database schema and identifies any issues.
      </p>
      
      {loading && !diagnosticResult && (
        <div className="loading">Running diagnostic...</div>
      )}
      
      {diagnosticError && (
        <div className="error-message">
          {diagnosticError}
          <button 
            className="retry-button"
            onClick={runDiagnostic}
          >
            Retry
          </button>
        </div>
      )}
      
      {diagnosticResult && (
        <div className="diagnostic-result">
          <div className="status-section">
            <h3>Status</h3>
            <div className={`status ${diagnosticResult.needs_fixing ? 'error' : 'success'}`}>
              {diagnosticResult.needs_fixing ? 'Issues Detected' : 'All Good'}
            </div>
          </div>
          
          {diagnosticResult.issues.length > 0 && (
            <div className="issues-section">
              <h3>Issues</h3>
              <ul className="issues-list">
                {diagnosticResult.issues.map((issue, index) => (
                  <li key={index} className="issue-item">{issue}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="details-section">
            <h3>Details</h3>
            <div className="details-grid">
              <div className="detail-item">
                <div className="detail-label">Territory Maps Table</div>
                <div className={`detail-value ${diagnosticResult.schema.tables.territory_maps.exists ? 'success' : 'error'}`}>
                  {diagnosticResult.schema.tables.territory_maps.exists ? 'Exists' : 'Missing'}
                </div>
              </div>
              
              <div className="detail-item">
                <div className="detail-label">User Roles Table</div>
                <div className={`detail-value ${diagnosticResult.schema.tables.user_roles.exists ? 'success' : 'error'}`}>
                  {diagnosticResult.schema.tables.user_roles.exists ? 'Exists' : 'Missing'}
                </div>
              </div>
              
              <div className="detail-item">
                <div className="detail-label">Congregations Table</div>
                <div className={`detail-value ${diagnosticResult.schema.tables.congregations.exists ? 'success' : 'error'}`}>
                  {diagnosticResult.schema.tables.congregations.exists ? 'Exists' : 'Missing'}
                </div>
              </div>
              
              <div className="detail-item">
                <div className="detail-label">Execute SQL Function</div>
                <div className={`detail-value ${diagnosticResult.schema.functions.execute_sql.exists ? 'success' : 'error'}`}>
                  {diagnosticResult.schema.functions.execute_sql.exists ? 'Exists' : 'Missing'}
                </div>
              </div>
              
              <div className="detail-item">
                <div className="detail-label">Maps Storage Bucket</div>
                <div className={`detail-value ${diagnosticResult.schema.storage.maps_bucket.exists ? 'success' : 'error'}`}>
                  {diagnosticResult.schema.storage.maps_bucket.exists ? 'Exists' : 'Missing'}
                </div>
              </div>
              
              <div className="detail-item">
                <div className="detail-label">Row Level Security</div>
                <div className={`detail-value ${diagnosticResult.schema.security.rls_enabled ? 'success' : 'error'}`}>
                  {diagnosticResult.schema.security.rls_enabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>
              
              <div className="detail-item">
                <div className="detail-label">Security Policies</div>
                <div className={`detail-value ${diagnosticResult.schema.security.policies_exist ? 'success' : 'error'}`}>
                  {diagnosticResult.schema.security.policies_exist ? 'Exist' : 'Missing'}
                </div>
              </div>
              
              <div className="detail-item">
                <div className="detail-label">Environment Variables</div>
                <div className={`detail-value ${
                  diagnosticResult.schema.environment.supabase_url && 
                  diagnosticResult.schema.environment.supabase_key && 
                  diagnosticResult.schema.environment.service_role_key ? 'success' : 'error'
                }`}>
                  {diagnosticResult.schema.environment.supabase_url && 
                   diagnosticResult.schema.environment.supabase_key && 
                   diagnosticResult.schema.environment.service_role_key ? 'Complete' : 'Incomplete'}
                </div>
              </div>
            </div>
          </div>
          
          {showRefreshButton && (
            <div className="actions-section">
              <button 
                className="refresh-button"
                onClick={runDiagnostic}
              >
                Refresh Diagnostic
              </button>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .database-diagnostic {
          width: 100%;
        }

        h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }

        h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          margin: 1.5rem 0 0.5rem 0;
        }

        .description {
          color: #64748b;
          margin-bottom: 1.5rem;
        }

        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 2rem;
          color: #64748b;
          font-style: italic;
        }

        .error-message {
          background-color: #fee2e2;
          color: #b91c1c;
          padding: 1rem;
          border-radius: 0.375rem;
          margin-bottom: 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .retry-button {
          background-color: #ef4444;
          color: white;
          border: none;
          border-radius: 0.375rem;
          padding: 0.5rem 1rem;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .retry-button:hover {
          background-color: #dc2626;
        }

        .diagnostic-result {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .status-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .status {
          font-weight: 600;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          text-align: center;
        }

        .status.success {
          background-color: #dcfce7;
          color: #166534;
        }

        .status.error {
          background-color: #fee2e2;
          color: #b91c1c;
        }

        .issues-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .issues-list {
          list-style-type: disc;
          margin-left: 1.5rem;
          color: #b91c1c;
        }

        .issue-item {
          margin-bottom: 0.5rem;
        }

        .details-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }

        .detail-item {
          background-color: #f8fafc;
          border-radius: 0.375rem;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .detail-label {
          font-weight: 500;
          color: #334155;
          font-size: 0.875rem;
        }

        .detail-value {
          font-weight: 600;
          text-align: center;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
        }

        .detail-value.success {
          background-color: #dcfce7;
          color: #166534;
        }

        .detail-value.error {
          background-color: #fee2e2;
          color: #b91c1c;
        }

        .actions-section {
          display: flex;
          justify-content: center;
          margin-top: 1rem;
        }

        .refresh-button {
          background-color: #2563eb;
          color: white;
          border: none;
          border-radius: 0.375rem;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .refresh-button:hover {
          background-color: #1d4ed8;
        }
      `}</style>
    </div>
  );
};

export default DatabaseDiagnostic; 
import React, { useState } from 'react';
import Link from 'next/link';

interface FixDatabaseButtonProps {
  buttonText?: string;
  onSuccess?: () => void;
  diagnosticResult?: any;
  fixTarget?: 'all' | 'territory_maps' | 'execute_sql' | 'contact_email' | 'map_count';
}

const FixDatabaseButton: React.FC<FixDatabaseButtonProps> = ({
  buttonText = 'Fix Database Schema',
  onSuccess,
  diagnosticResult,
  fixTarget = 'all'
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [errorDetails, setErrorDetails] = useState('');

  const getFixEndpoint = () => {
    switch (fixTarget) {
      case 'territory_maps':
        return '/api/fix-database?target=territory_maps';
      case 'execute_sql':
        return '/api/fix-database?target=execute_sql';
      case 'contact_email':
        return '/api/admin/add-contact-email-column';
      case 'map_count':
        return '/api/fix-database?target=map_count';
      default:
        return '/api/fix-database';
    }
  };

  const isFixNeeded = () => {
    if (!diagnosticResult) return true;
    
    switch (fixTarget) {
      case 'territory_maps':
        return !diagnosticResult.schema.tables.territory_maps.exists || 
               !diagnosticResult.schema.security.rls_enabled || 
               !diagnosticResult.schema.security.policies_exist;
      case 'execute_sql':
        return !diagnosticResult.schema.functions.execute_sql.exists;
      case 'contact_email':
        // We don't have a specific diagnostic for contact_email column
        return true;
      case 'map_count':
        // Check if the map_count column exists in the diagnostic result
        return !diagnosticResult.schema.tables.congregations?.columns?.includes('map_count');
      default:
        return diagnosticResult.needs_fixing;
    }
  };

  const getButtonText = () => {
    if (diagnosticResult && !isFixNeeded()) {
      return 'No Fix Needed';
    }
    return buttonText;
  };

  const handleFixDatabase = async () => {
    if (diagnosticResult && !isFixNeeded()) {
      setSuccess('No fix needed. The database schema is already correct.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setErrorDetails('');

    try {
      console.log(`Calling API endpoint: ${getFixEndpoint()}`);
      const response = await fetch(getFixEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('API response:', response);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
        try {
          // Try to parse the error as JSON
          const errorJson = JSON.parse(errorText);
          setErrorDetails(JSON.stringify(errorJson, null, 2));
        } catch (e) {
          // If not JSON, just use the text
          setErrorDetails(errorText);
        }
        
        throw new Error(`Failed to fix database schema: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Success data:', data);
      
      if (data.success) {
        setSuccess(data.message || 'Database schema fixed successfully!');
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError(data.message || 'Failed to fix database schema.');
        if (data.details) {
          setErrorDetails(typeof data.details === 'string' ? data.details : JSON.stringify(data.details, null, 2));
        }
      }
    } catch (error: any) {
      console.error('Error fixing database:', error);
      setError(error.message || 'An error occurred while fixing the database schema');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError('');
    setSuccess('');
    setErrorDetails('');
    handleFixDatabase();
  };

  return (
    <div className="fix-database-button-container">
      {error && (
        <div className="error-message">
          <p>{error}</p>
          {errorDetails && (
            <div className="error-details-container">
              <button 
                className="toggle-details-button"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </button>
              
              {showDetails && (
                <pre className="error-details">
                  {errorDetails}
                </pre>
              )}
            </div>
          )}
          <div className="error-actions">
            <button 
              className="retry-button"
              onClick={handleRetry}
              disabled={loading}
            >
              Retry
            </button>
            <Link href="/fix-database">
              <div className="manual-fix-link">Go to Fix Database Page</div>
            </Link>
            <Link href="/manual-fix">
              <div className="manual-fix-link">Go to Manual Fix Page</div>
            </Link>
          </div>
        </div>
      )}

      {success && (
        <div className="success-message">
          <p>{success}</p>
        </div>
      )}

      {!error && !success && (
        <button 
          className={`fix-button ${diagnosticResult && !isFixNeeded() ? 'disabled' : ''}`}
          onClick={handleFixDatabase}
          disabled={loading || (diagnosticResult && !isFixNeeded())}
        >
          {loading ? 'Fixing...' : getButtonText()}
        </button>
      )}

      <style jsx>{`
        .fix-database-button-container {
          margin: 1rem 0;
        }

        .fix-button {
          background-color: #2563eb;
          color: white;
          border: none;
          border-radius: 0.375rem;
          padding: 0.75rem 1.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .fix-button:hover:not(:disabled) {
          background-color: #1d4ed8;
        }

        .fix-button:disabled, .fix-button.disabled {
          background-color: #94a3b8;
          cursor: not-allowed;
        }

        .error-message {
          background-color: #fee2e2;
          color: #b91c1c;
          padding: 1rem;
          border-radius: 0.375rem;
          margin-bottom: 1rem;
        }

        .error-details-container {
          margin-top: 0.5rem;
        }

        .toggle-details-button {
          background-color: transparent;
          color: #b91c1c;
          border: 1px solid #b91c1c;
          border-radius: 0.25rem;
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .toggle-details-button:hover {
          background-color: rgba(185, 28, 28, 0.1);
        }

        .error-details {
          background-color: #fff1f2;
          padding: 0.75rem;
          border-radius: 0.25rem;
          margin-top: 0.5rem;
          font-family: monospace;
          font-size: 0.75rem;
          white-space: pre-wrap;
          overflow-x: auto;
        }

        .error-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
          flex-wrap: wrap;
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

        .retry-button:hover:not(:disabled) {
          background-color: #dc2626;
        }

        .retry-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .manual-fix-link {
          color: #b91c1c;
          text-decoration: underline;
          font-size: 0.75rem;
          cursor: pointer;
          padding: 0.5rem 0;
        }

        .manual-fix-link:hover {
          color: #991b1b;
        }

        .success-message {
          background-color: #dcfce7;
          color: #166534;
          padding: 1rem;
          border-radius: 0.375rem;
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
};

export default FixDatabaseButton; 
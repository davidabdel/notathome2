import React, { useState } from 'react';

const CreateStorageBucket: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState<'idle' | 'fixing' | 'complete'>('idle');

  const handleCreateBucket = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setStep('fixing');

    try {
      // Call the comprehensive fix-all endpoint
      const response = await fetch('/api/fix-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message || 'All issues fixed successfully!');
        setStep('complete');
      } else {
        setError(data.message || 'Failed to fix issues');
      }
    } catch (error: any) {
      console.error('Error fixing issues:', error);
      setError(error.message || 'An error occurred while fixing issues');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-bucket-container">
      <h3>Storage Bucket & Database Setup</h3>
      <p className="description">
        Fix all storage and database issues with a single click. This will:
      </p>
      
      <ul className="feature-list-bullets">
        <li>Create the "maps" storage bucket if it doesn't exist</li>
        <li>Make the bucket public for image access</li>
        <li>Fix Row Level Security (RLS) policies</li>
        <li>Ensure all required database tables and columns exist</li>
      </ul>

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="success-message">
          <p>{success}</p>
        </div>
      )}

      <div className="progress-container">
        {step !== 'idle' && (
          <div className="progress-bar">
            <div 
              className={`progress-fill ${step === 'complete' ? 'complete' : ''}`}
              style={{ width: step === 'complete' ? '100%' : '50%' }}
            ></div>
          </div>
        )}
      </div>

      <button 
        className="create-button"
        onClick={handleCreateBucket}
        disabled={loading || step === 'complete'}
      >
        {loading ? 'Fixing All Issues...' : 
         step === 'complete' ? 'All Issues Fixed!' : 
         'Fix All Storage & Database Issues'}
      </button>

      <style jsx>{`
        .create-bucket-container {
          margin: 1.5rem 0;
          padding: 1.5rem;
          background-color: #f8fafc;
          border-radius: 0.5rem;
          border: 1px solid #e2e8f0;
        }

        h3 {
          margin-top: 0;
          margin-bottom: 0.5rem;
          font-size: 1.25rem;
          font-weight: 600;
          color: #1e293b;
        }

        .description {
          color: #64748b;
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }
        
        .feature-list-bullets {
          margin-bottom: 1.5rem;
          padding-left: 1.5rem;
        }
        
        .feature-list-bullets li {
          color: #64748b;
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
        }

        .error-message {
          background-color: #fee2e2;
          color: #b91c1c;
          padding: 0.75rem;
          border-radius: 0.375rem;
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }

        .success-message {
          background-color: #dcfce7;
          color: #166534;
          padding: 0.75rem;
          border-radius: 0.375rem;
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }

        .progress-container {
          margin: 1.5rem 0;
        }
        
        .progress-bar {
          height: 0.5rem;
          background-color: #e2e8f0;
          border-radius: 0.25rem;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          background-color: #3b82f6;
          transition: width 0.5s ease;
        }
        
        .progress-fill.complete {
          background-color: #10b981;
        }

        .create-button {
          background-color: #2563eb;
          color: white;
          border: none;
          border-radius: 0.375rem;
          padding: 0.75rem 1.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
          width: 100%;
        }

        .create-button:hover:not(:disabled) {
          background-color: #1d4ed8;
        }

        .create-button:disabled {
          background-color: ${step === 'complete' ? '#10b981' : '#93c5fd'};
          cursor: ${step === 'complete' ? 'default' : 'not-allowed'};
        }
      `}</style>
    </div>
  );
};

export default CreateStorageBucket; 
import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/layouts/AdminLayout';

export default function FixDatabase() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);
  const [stepStatus, setStepStatus] = useState({
    addColumn: 'pending',
    verifyColumn: 'pending',
    reloadSchema: 'pending'
  });
  const router = useRouter();

  const fixDatabase = async () => {
    setLoading(true);
    setResult(null);
    setStepStatus({
      addColumn: 'in-progress',
      verifyColumn: 'pending',
      reloadSchema: 'pending'
    });
    
    try {
      // Use the direct SQL endpoint to fix the database
      setStepStatus(prev => ({ ...prev, addColumn: 'in-progress' }));
      
      const response = await fetch('/api/admin/direct-sql-fix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setStepStatus(prev => ({ 
          ...prev, 
          addColumn: 'failed',
          verifyColumn: 'failed',
          reloadSchema: 'failed'
        }));
        
        setResult({ 
          success: false, 
          error: data.error || 'Failed to fix database schema' 
        });
      } else {
        setStepStatus(prev => ({ 
          ...prev, 
          addColumn: 'completed', 
          verifyColumn: 'completed',
          reloadSchema: 'completed'
        }));
        
        setResult({ 
          success: true, 
          message: 'Successfully fixed database schema. The contact_email column has been added to the congregations table and the schema cache has been reloaded.' 
        });
      }
    } catch (err: any) {
      setStepStatus(prev => ({ 
        ...prev, 
        addColumn: 'failed',
        verifyColumn: 'failed',
        reloadSchema: 'failed'
      }));
      
      setResult({ 
        success: false, 
        error: `An unexpected error occurred: ${err.message}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const reloadPage = () => {
    router.reload();
  };

  return (
    <AdminLayout>
      <Head>
        <title>Fix Database | Not At Home Admin</title>
      </Head>
      
      <div className="fix-database-container">
        <div className="header">
          <h1>Fix Database Schema</h1>
          <p className="description">
            This page helps fix issues with the database schema. Use this to resolve the "contact_email column not found" error.
          </p>
        </div>
        
        <div className="card">
          <h2>Fix Database Schema</h2>
          <p>
            The error "Could not find the 'contact_email' column of 'congregations'" occurs because the column is missing in your database.
            Click the button below to fix the database schema by adding the missing column.
          </p>
          
          <div className="steps">
            <div className={`step ${stepStatus.addColumn !== 'pending' ? 'active' : ''}`}>
              <div className={`step-number ${getStepStatusClass(stepStatus.addColumn)}`}>
                {getStepIcon(stepStatus.addColumn)}
              </div>
              <div className="step-content">
                <h3>Add Missing Column</h3>
                <p>Add the 'contact_email' column to the 'congregations' table.</p>
                {stepStatus.addColumn === 'failed' && (
                  <p className="step-error">Failed to add contact_email column</p>
                )}
              </div>
            </div>
            
            <div className={`step ${stepStatus.verifyColumn !== 'pending' ? 'active' : ''}`}>
              <div className={`step-number ${getStepStatusClass(stepStatus.verifyColumn)}`}>
                {getStepIcon(stepStatus.verifyColumn)}
              </div>
              <div className="step-content">
                <h3>Verify Column Addition</h3>
                <p>Verify that the column was successfully added to the table.</p>
                {stepStatus.verifyColumn === 'failed' && (
                  <p className="step-error">Failed to verify column addition</p>
                )}
              </div>
            </div>
            
            <div className={`step ${stepStatus.reloadSchema !== 'pending' ? 'active' : ''}`}>
              <div className={`step-number ${getStepStatusClass(stepStatus.reloadSchema)}`}>
                {getStepIcon(stepStatus.reloadSchema)}
              </div>
              <div className="step-content">
                <h3>Reload Schema Cache</h3>
                <p>Reload the database schema cache to ensure the new column is recognized.</p>
                {stepStatus.reloadSchema === 'failed' && (
                  <p className="step-error">Failed to reload schema cache</p>
                )}
              </div>
            </div>
          </div>
          
          {result && (
            <div className={`result-message ${result.success ? 'success' : 'error'}`}>
              {result.success ? result.message : result.error}
            </div>
          )}
          
          <div className="actions">
            <button
              onClick={fixDatabase}
              disabled={loading}
              className="fix-button"
            >
              {loading ? 'Fixing Database...' : 'Fix Database Schema'}
            </button>
            
            {result?.success && (
              <>
                <button onClick={reloadPage} className="reload-button">
                  Reload Page
                </button>
                <Link href="/admin/requests" className="return-link">
                  Return to Congregation Requests
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .fix-database-container {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .header {
          margin-bottom: 2rem;
        }
        
        h1 {
          margin-top: 0;
          color: #1e293b;
        }
        
        .description {
          color: #64748b;
        }
        
        .card {
          background-color: white;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          padding: 2rem;
          margin-bottom: 2rem;
        }
        
        h2 {
          margin-top: 0;
          color: #1e293b;
        }
        
        .steps {
          margin: 2rem 0;
        }
        
        .step {
          display: flex;
          margin-bottom: 1.5rem;
          opacity: 0.6;
          transition: opacity 0.3s;
        }
        
        .step.active {
          opacity: 1;
        }
        
        .step-number {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          background-color: #94a3b8;
          color: white;
          border-radius: 9999px;
          font-weight: bold;
          margin-right: 1rem;
          flex-shrink: 0;
          transition: background-color 0.3s;
        }
        
        .step-number.in-progress {
          background-color: #3b82f6;
        }
        
        .step-number.completed {
          background-color: #10b981;
        }
        
        .step-number.failed {
          background-color: #ef4444;
        }
        
        .step-content {
          flex: 1;
        }
        
        .step-content h3 {
          margin-top: 0;
          margin-bottom: 0.5rem;
          color: #1e293b;
        }
        
        .step-content p {
          margin: 0;
          color: #64748b;
        }
        
        .step-error {
          color: #ef4444;
          margin-top: 0.5rem;
        }
        
        .result-message {
          padding: 1rem;
          border-radius: 0.375rem;
          margin: 1.5rem 0;
        }
        
        .success {
          background-color: #dcfce7;
          color: #166534;
        }
        
        .error {
          background-color: #fee2e2;
          color: #b91c1c;
        }
        
        .actions {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 1.5rem;
        }
        
        .fix-button {
          padding: 0.75rem 1.5rem;
          background-color: #2563eb;
          color: white;
          border: none;
          border-radius: 0.375rem;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .fix-button:hover {
          background-color: #1d4ed8;
        }
        
        .fix-button:disabled {
          background-color: #93c5fd;
          cursor: not-allowed;
        }
        
        .reload-button {
          padding: 0.75rem 1.5rem;
          background-color: #10b981;
          color: white;
          border: none;
          border-radius: 0.375rem;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .reload-button:hover {
          background-color: #059669;
        }
        
        .return-link {
          display: inline-block;
          padding: 0.75rem 1.5rem;
          background-color: #f8fafc;
          color: #1e293b;
          border: 1px solid #e2e8f0;
          border-radius: 0.375rem;
          font-size: 1rem;
          font-weight: 500;
          text-align: center;
          text-decoration: none;
          transition: background-color 0.2s;
        }
        
        .return-link:hover {
          background-color: #f1f5f9;
        }
        
        @media (max-width: 640px) {
          .card {
            padding: 1.5rem;
          }
          
          .steps {
            margin: 1.5rem 0;
          }
        }
      `}</style>
    </AdminLayout>
  );
}

// Helper functions for step status
function getStepStatusClass(status: string): string {
  switch (status) {
    case 'in-progress':
      return 'in-progress';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    default:
      return '';
  }
}

function getStepIcon(status: string): React.ReactNode {
  switch (status) {
    case 'in-progress':
      return '⋯';
    case 'completed':
      return '✓';
    case 'failed':
      return '✗';
    default:
      return '';
  }
} 
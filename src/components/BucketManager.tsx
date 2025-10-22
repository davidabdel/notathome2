import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const BucketManager: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [bucketInfo, setBucketInfo] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Check bucket status on component mount
  useEffect(() => {
    checkBucketStatus();
  }, []);

  const checkBucketStatus = async () => {
    setStatus('loading');
    setMessage('Checking maps bucket status...');
    
    try {
      // First try to list files in the bucket to see if it exists and is accessible
      const { data: fileData, error: fileError } = await supabase
        .storage
        .from('maps')
        .list();
      
      if (fileError) {
        console.error('Error listing files:', fileError);
        
        // If bucket doesn't exist or isn't accessible, try to create/fix it via API
        setMessage('Maps bucket not accessible. Attempting to fix via API...');
        const response = await fetch('/api/fix-all', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'fix_all' }),
        });
        
        const result = await response.json();
        
        if (result.success) {
          setMessage('Maps bucket fixed successfully. Checking access...');
          
          // Try listing files again after fixing
          const { data: retryData, error: retryError } = await supabase
            .storage
            .from('maps')
            .list();
            
          if (retryError) {
            setStatus('error');
            setMessage(`Maps bucket fixed but still not accessible: ${retryError.message}`);
          } else {
            setStatus('success');
            setMessage('Maps bucket is now accessible');
            setFiles(retryData || []);
            
            // Get bucket info from API
            const bucketInfoResponse = await fetch('/api/debug-storage', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ action: 'check_bucket' }),
            });
            
            const bucketInfoResult = await bucketInfoResponse.json();
            setBucketInfo(bucketInfoResult.bucket || null);
          }
        } else {
          setStatus('error');
          setMessage(`Failed to fix maps bucket: ${result.message || 'Unknown error'}`);
        }
      } else {
        // Bucket exists and is accessible
        setStatus('success');
        setMessage('Maps bucket is accessible');
        setFiles(fileData || []);
        
        // Get bucket info from API
        const bucketInfoResponse = await fetch('/api/debug-storage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'check_bucket' }),
        });
        
        const bucketInfoResult = await bucketInfoResponse.json();
        setBucketInfo(bucketInfoResult.bucket || null);
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(`Error checking bucket status: ${error.message || 'Unknown error'}`);
    }
  };

  const uploadTestFile = async () => {
    if (status !== 'success') {
      setMessage('Please ensure bucket is accessible before uploading');
      return;
    }
    
    setStatus('loading');
    setMessage('Uploading test file...');
    
    try {
      // Create a simple text file
      const testFile = new Blob(['This is a test file'], { type: 'text/plain' });
      const fileName = `test-${Date.now()}.txt`;
      
      const { data, error } = await supabase
        .storage
        .from('maps')
        .upload(fileName, testFile);
        
      if (error) {
        setStatus('error');
        setMessage(`Error uploading test file: ${error.message}`);
      } else {
        setStatus('success');
        setMessage(`Test file uploaded successfully: ${fileName}`);
        
        // Refresh file list
        const { data: fileData } = await supabase
          .storage
          .from('maps')
          .list();
          
        setFiles(fileData || []);
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(`Error uploading test file: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="bucket-manager">
      <h2>Maps Storage Bucket Manager</h2>
      
      <div className={`status-box ${status}`}>
        <div className="status-icon">
          {status === 'loading' && '⏳'}
          {status === 'success' && '✅'}
          {status === 'error' && '❌'}
          {status === 'idle' && 'ℹ️'}
        </div>
        <div className="status-message">{message}</div>
      </div>
      
      <div className="action-buttons">
        <button 
          onClick={checkBucketStatus} 
          disabled={status === 'loading'}
          className="action-button refresh"
        >
          {status === 'loading' ? 'Checking...' : 'Refresh Status'}
        </button>
        
        <button 
          onClick={uploadTestFile} 
          disabled={status !== 'success'}
          className="action-button upload"
        >
          Upload Test File
        </button>
      </div>
      
      {bucketInfo && (
        <div className="bucket-info">
          <h3>Bucket Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Name:</span>
              <span className="info-value">{bucketInfo.name}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Public:</span>
              <span className="info-value">{bucketInfo.public ? 'Yes' : 'No'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Created At:</span>
              <span className="info-value">
                {new Date(bucketInfo.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
      
      {files.length > 0 && (
        <div className="files-list">
          <h3>Files in Bucket</h3>
          <ul>
            {files.map((file: any) => (
              <li key={file.name} className="file-item">
                <span className="file-name">{file.name}</span>
                <span className="file-size">{formatBytes(file.metadata?.size || 0)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <style jsx>{`
        .bucket-manager {
          padding: 20px;
          background-color: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          margin: 20px 0;
        }
        
        h2 {
          margin-top: 0;
          color: #1e293b;
          font-size: 1.5rem;
          margin-bottom: 20px;
        }
        
        h3 {
          color: #334155;
          font-size: 1.2rem;
          margin: 20px 0 10px;
        }
        
        .status-box {
          display: flex;
          align-items: center;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
        }
        
        .status-box.idle {
          background-color: #f1f5f9;
          border-left: 4px solid #64748b;
        }
        
        .status-box.loading {
          background-color: #eff6ff;
          border-left: 4px solid #3b82f6;
        }
        
        .status-box.success {
          background-color: #dcfce7;
          border-left: 4px solid #10b981;
        }
        
        .status-box.error {
          background-color: #fee2e2;
          border-left: 4px solid #ef4444;
        }
        
        .status-icon {
          font-size: 1.5rem;
          margin-right: 15px;
        }
        
        .status-message {
          font-size: 1rem;
          color: #1e293b;
        }
        
        .action-buttons {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }
        
        .action-button {
          padding: 10px 16px;
          border: none;
          border-radius: 4px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .action-button.refresh {
          background-color: #3b82f6;
          color: white;
        }
        
        .action-button.refresh:hover:not(:disabled) {
          background-color: #2563eb;
        }
        
        .action-button.upload {
          background-color: #10b981;
          color: white;
        }
        
        .action-button.upload:hover:not(:disabled) {
          background-color: #059669;
        }
        
        .action-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .bucket-info {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 20px;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 15px;
        }
        
        .info-item {
          display: flex;
          flex-direction: column;
        }
        
        .info-label {
          font-size: 0.8rem;
          color: #64748b;
          margin-bottom: 5px;
        }
        
        .info-value {
          font-size: 0.95rem;
          color: #1e293b;
          font-weight: 500;
        }
        
        .files-list {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 15px;
        }
        
        .files-list ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .file-item {
          display: flex;
          justify-content: space-between;
          padding: 10px;
          border-bottom: 1px solid #f1f5f9;
        }
        
        .file-item:last-child {
          border-bottom: none;
        }
        
        .file-name {
          font-size: 0.9rem;
          color: #1e293b;
        }
        
        .file-size {
          font-size: 0.85rem;
          color: #64748b;
        }
      `}</style>
    </div>
  );
};

// Helper function to format bytes
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default BucketManager;

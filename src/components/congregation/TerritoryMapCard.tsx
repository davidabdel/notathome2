import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase/config';

interface TerritoryMap {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  status: string;
}

interface TerritoryMapCardProps {
  map: TerritoryMap;
  onUpdate: () => void;
}

interface UploadProgressEvent {
  loaded: number;
  total: number;
}

// Component to create the maps bucket and fix RLS policies
const CreateBucketButton: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState<'idle' | 'creating_bucket' | 'fixing_rls' | 'complete'>('idle');
  const [detailedError, setDetailedError] = useState<string | null>(null);
  
  const createBucketAndFixRLS = async () => {
    setLoading(true);
    setError('');
    setDetailedError(null);
    setSuccess(false);
    setStep('creating_bucket');
    
    try {
      // Call the comprehensive fix-all endpoint
      const response = await fetch('/api/fix-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          action: 'fix_all',
          timestamp: new Date().toISOString() // Add timestamp to prevent caching
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
        console.error('API error response:', errorData);
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }
      
      const result = await response.json().catch(() => ({ success: false, message: 'Failed to parse response' }));
      console.log('Comprehensive fix result:', result);
      
      if (!result.success) {
        setDetailedError(JSON.stringify(result.details || {}, null, 2));
        throw new Error(result.message || 'Operation failed with unknown error');
      }
      
      setStep('complete');
      setSuccess(true);
      
      // Reload the page after a short delay to reflect the changes
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      console.error('Error in createBucketAndFixRLS:', err);
      setError(err.message || 'An unexpected error occurred');
      setStep('idle');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="create-bucket-container">
      <h3>Storage and Database Issues</h3>
      <p>There are issues that need to be fixed before you can upload images:</p>
      <ol>
        <li>The "maps" storage bucket doesn't exist or isn't accessible.</li>
        <li>The database may have row-level security policy issues.</li>
      </ol>
      
      <button 
        className="fix-button"
        onClick={createBucketAndFixRLS}
        disabled={loading || success}
      >
        {loading ? `Fixing Issues (${step.replace('_', ' ')})...` : 
         success ? 'Issues Fixed! Reloading...' : 
         'Fix Storage & Database Issues'}
      </button>
      
      {error && (
        <div className="error-container">
          <p className="error-message">{error}</p>
          {detailedError && (
            <details>
              <summary>Technical Details</summary>
              <pre className="error-details">{detailedError}</pre>
            </details>
          )}
          <p className="error-help">
            If this error persists, please try the following:
            <ol>
              <li>Refresh the page and try again</li>
              <li>Check your internet connection</li>
              <li>Contact support if the issue continues</li>
            </ol>
          </p>
        </div>
      )}
      
      {success && (
        <div className="success-message">
          <p>Issues fixed successfully! Please try the following:</p>
          <ol>
            <li>Refresh the page</li>
            <li>Try uploading the image again</li>
          </ol>
        </div>
      )}
      
      <style jsx>{`
        .create-bucket-container {
          margin-top: 1rem;
          padding: 1rem;
          background-color: #fff8e1;
          border: 1px solid #ffd54f;
          border-radius: 0.375rem;
        }
        
        .fix-button {
          background-color: #ff9800;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 0.25rem;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s;
        }
        
        .fix-button:hover:not(:disabled) {
          background-color: #f57c00;
        }
        
        .fix-button:disabled {
          background-color: #ffcc80;
          cursor: not-allowed;
        }
        
        .error-container {
          margin-top: 1rem;
          padding: 0.75rem;
          background-color: #ffebee;
          border: 1px solid #ef9a9a;
          border-radius: 0.25rem;
        }
        
        .error-message {
          color: #c62828;
          margin: 0 0 0.5rem 0;
          font-weight: 500;
        }
        
        .error-details {
          background-color: #f5f5f5;
          padding: 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.8rem;
          overflow-x: auto;
          white-space: pre-wrap;
          margin-top: 0.5rem;
        }
        
        .error-help {
          margin-top: 0.5rem;
          font-size: 0.9rem;
        }
        
        .success-message {
          margin-top: 1rem;
          padding: 0.75rem;
          background-color: #e8f5e9;
          border: 1px solid #a5d6a7;
          border-radius: 0.25rem;
          color: #2e7d32;
        }
      `}</style>
    </div>
  );
};

const TerritoryMapCard: React.FC<TerritoryMapCardProps> = ({ map, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(map.name);
  const [description, setDescription] = useState(map.description);
  const [imageUrl, setImageUrl] = useState(map.image_url || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [imageErrorMessage, setImageErrorMessage] = useState('');

  // Check if the maps bucket is public and create it if it doesn't exist
  useEffect(() => {
    const checkAndCreateBucket = async () => {
      try {
        // First check if the bucket exists
        const { data, error } = await supabase
          .storage
          .getBucket('maps');
        
        if (error) {
          console.error('Error checking bucket:', error);
          
          // If the bucket doesn't exist, create it
          if (error.message.includes('Bucket not found')) {
            console.log('Bucket not found, attempting to create it...');
            
            try {
              const { data: createData, error: createError } = await supabase
                .storage
                .createBucket('maps', {
                  public: true,
                  fileSizeLimit: 5242880 // 5MB
                });
              
              if (createError) {
                console.error('Error creating bucket:', createError);
                return;
              }
              
              console.log('Bucket created successfully:', createData);
            } catch (createErr) {
              console.error('Error in bucket creation:', createErr);
            }
          }
          return;
        }
        
        console.log('Bucket info:', data);
        console.log('Is bucket public:', data.public);
        
        // If bucket exists but is not public, make it public
        if (data && !data.public) {
          console.log('Bucket is not public, updating...');
          
          try {
            const { data: updateData, error: updateError } = await supabase
              .storage
              .updateBucket('maps', {
                public: true
              });
            
            if (updateError) {
              console.error('Error updating bucket:', updateError);
              return;
            }
            
            console.log('Bucket updated successfully:', updateData);
          } catch (updateErr) {
            console.error('Error in bucket update:', updateErr);
          }
        }
      } catch (err) {
        console.error('Error in checkAndCreateBucket:', err);
      }
    };
    
    checkAndCreateBucket();
  }, []);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setName(map.name);
    setDescription(map.description);
    setImageUrl(map.image_url || '');
    setIsEditing(false);
    setError('');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Map name is required');
      return;
    }

    setLoading(true);
    setError('');
    
    console.log('Saving map with data:', { name, description, imageUrl });

    try {
      const { data, error: updateError } = await supabase
        .from('territory_maps')
        .update({
          name,
          description,
          image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', map.id)
        .select();

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }
      
      console.log('Map updated successfully:', data);

      setIsEditing(false);
      onUpdate();
    } catch (err: any) {
      console.error('Error updating map:', err);
      setError(err.message || 'Failed to update map');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('File must be an image');
      return;
    }

    setLoading(true);
    setError('');
    setUploadProgress(0);

    try {
      // First, ensure the bucket exists
      const { data: bucketData, error: bucketError } = await supabase
        .storage
        .getBucket('maps');
      
      if (bucketError) {
        console.error('Bucket check error:', bucketError);
        
        // If bucket doesn't exist, try to create it using the API endpoint
        if (bucketError.message.includes('Bucket not found')) {
          console.log('Bucket not found, attempting to fix via API...');
          
          try {
            // Use the fix-all API endpoint instead of direct bucket creation
            const response = await fetch('/api/fix-all', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ action: 'create_bucket' }),
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              console.error('API error creating bucket:', errorData);
              throw new Error(`Failed to create storage bucket: ${errorData.message || 'Please try again later'}`);
            }
            
            const result = await response.json();
            console.log('Bucket creation API result:', result);
            
            if (!result.success) {
              throw new Error(`Failed to create storage bucket: ${result.message || 'Please try again later'}`);
            }
            
            console.log('Bucket created successfully via API');
          } catch (apiError: any) {
            console.error('API bucket creation error:', apiError);
            setImageErrorMessage('Storage bucket creation failed. Please use the "Fix Storage & Database Issues" button below and try again.');
            setImageLoadError(true);
            setLoading(false);
            return;
          }
        } else {
          throw bucketError;
        }
      }
      
      // Upload image to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${map.id}-${Date.now()}.${fileExt}`;
      // Use a simpler path without subfolders
      const filePath = fileName;
      
      console.log('Uploading file:', { fileName, filePath, fileType: file.type, fileSize: file.size });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('maps')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        
        // Check if it's an RLS error or bucket not found
        if (uploadError.message && uploadError.message.includes('row-level security')) {
          setImageErrorMessage('Row-level security policy error. Please use the "Fix Storage & Database Issues" button below.');
          setImageLoadError(true);
          setLoading(false);
          return;
        } else if (uploadError.message && uploadError.message.includes('Bucket not found')) {
          setImageErrorMessage('Storage bucket not found. Please use the "Fix Storage & Database Issues" button below and try again.');
          setImageLoadError(true);
          setLoading(false);
          return;
        }
        
        throw uploadError;
      }
      
      console.log('Upload successful:', uploadData);

      // Get the public URL
      const { data } = supabase.storage
        .from('maps')
        .getPublicUrl(filePath);
      
      const publicUrl = data.publicUrl;
      console.log('Public URL:', publicUrl);
      
      // Test if the URL is accessible
      try {
        const testResponse = await fetch(publicUrl, { method: 'HEAD', mode: 'no-cors' });
        console.log('URL test response:', testResponse);
      } catch (testErr) {
        console.warn('URL test error (this may be normal with no-cors):', testErr);
      }
      
      // Set the image URL in state
      setImageUrl(publicUrl);
      
      // Immediately save the image URL to the database
      try {
        const { error: updateError } = await supabase
          .from('territory_maps')
          .update({
            image_url: publicUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', map.id);
          
        if (updateError) {
          console.error('Error updating image URL:', updateError);
          
          // Check if it's an RLS error
          if (updateError.message && updateError.message.includes('row-level security')) {
            setError('Row-level security policy error when saving to database. Please use the "Fix Storage & Database Issues" button below.');
            setImageLoadError(true);
            // Don't throw here, we still uploaded the image successfully
          } else {
            throw updateError;
          }
        } else {
          console.log('Image URL saved to database');
        }
      } catch (dbErr) {
        console.error('Database update error:', dbErr);
        // Don't throw here, we still uploaded the image successfully
        setError('Image uploaded but failed to update database. The image might not appear until you refresh.');
      }
      
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setError(err.message || 'Failed to upload image');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="territory-map-card">
      {isEditing ? (
        <div className="edit-form">
          <div className="form-group">
            <label htmlFor={`map-name-${map.id}`}>Map Name:</label>
            <input
              type="text"
              id={`map-name-${map.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor={`map-description-${map.id}`}>Description:</label>
            <textarea
              id={`map-description-${map.id}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor={`map-image-${map.id}`}>Map Image:</label>
            <input
              type="file"
              id={`map-image-${map.id}`}
              accept="image/*"
              onChange={handleImageUpload}
              disabled={loading}
            />
            {uploadProgress > 0 && (
              <div className="progress-bar">
                <div 
                  className="progress" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
                <span>{uploadProgress}%</span>
              </div>
            )}
            {imageUrl && (
              <div className="image-preview">
                <img src={imageUrl} alt="Map preview" />
              </div>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="button-group">
            <button
              type="button"
              className="cancel-button"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="save-button"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
        <div className="map-display">
          <div className="map-header">
            <h3>{map.name}</h3>
            <button
              type="button"
              className="edit-button"
              onClick={handleEdit}
            >
              Edit
            </button>
          </div>
          
          <p className="map-description">{map.description}</p>
          
          {map.image_url ? (
            <div className="map-image">
              <img 
                src={map.image_url} 
                alt={map.name} 
                crossOrigin="anonymous"
                onLoad={() => {
                  console.log('Image loaded successfully');
                  setImageLoadError(false);
                }}
                onError={(e) => {
                  console.error('Image failed to load:', e, map.image_url);
                  setImageLoadError(true);
                  setImageErrorMessage('Failed to load image. The storage bucket may not exist or you may not have permission to access it.');
                  // Try to fetch the image directly to see if there's a CORS issue
                  if (map.image_url) {
                    fetch(map.image_url, { mode: 'no-cors' })
                      .then(() => console.log('Image fetch successful (no-cors)'))
                      .catch(err => {
                        console.error('Image fetch failed:', err);
                        setImageErrorMessage(`Failed to load image: ${err.message || 'Unknown error'}`);
                      });
                  }
                }}
                style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
              />
              {imageErrorMessage && (
                <p className="image-error-message">{imageErrorMessage}</p>
              )}
              {imageLoadError && <CreateBucketButton />}
            </div>
          ) : (
            <div className="map-placeholder">
              <p>No map image uploaded yet</p>
              <button
                type="button"
                className="upload-button"
                onClick={handleEdit}
              >
                Upload Map
              </button>
            </div>
          )}
        </div>
      )}
      
      <style jsx>{`
        .territory-map-card {
          background-color: white;
          border-radius: 0.5rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        
        .map-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        
        h3 {
          margin: 0;
          color: #1e293b;
        }
        
        .map-description {
          margin-bottom: 1rem;
          color: #6b7280;
          font-size: 0.875rem;
          white-space: pre-line;
        }
        
        .map-image {
          margin-top: 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.375rem;
          overflow: hidden;
        }
        
        .map-image img {
          width: 100%;
          height: auto;
          display: block;
        }
        
        .image-error-message {
          font-size: 0.875rem;
          color: #ef4444;
          margin-top: 0.5rem;
          padding: 0.5rem;
          background-color: #fee2e2;
          border-radius: 0.25rem;
        }
        
        .map-placeholder {
          background-color: #f1f5f9;
          border: 2px dashed #cbd5e1;
          border-radius: 0.375rem;
          padding: 2rem;
          text-align: center;
          color: #64748b;
        }
        
        .edit-button, .upload-button {
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
        
        .edit-button:hover, .upload-button:hover {
          background-color: #1d4ed8;
        }
        
        .edit-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        label {
          font-weight: 500;
          color: #334155;
        }
        
        input, textarea {
          padding: 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 0.375rem;
          font-size: 1rem;
          width: 100%;
        }
        
        .error-message {
          background-color: #fee2e2;
          color: #b91c1c;
          padding: 0.75rem;
          border-radius: 0.375rem;
        }
        
        .button-group {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
        }
        
        .cancel-button {
          background-color: #f1f5f9;
          color: #334155;
          border: 1px solid #cbd5e1;
          border-radius: 0.375rem;
          padding: 0.75rem 1.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .cancel-button:hover {
          background-color: #e2e8f0;
        }
        
        .save-button {
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
        
        .save-button:hover {
          background-color: #1d4ed8;
        }
        
        .save-button:disabled, .cancel-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .progress-bar {
          height: 0.5rem;
          background-color: #e2e8f0;
          border-radius: 9999px;
          margin-top: 0.5rem;
          position: relative;
        }
        
        .progress {
          height: 100%;
          background-color: #2563eb;
          border-radius: 9999px;
          transition: width 0.3s ease;
        }
        
        .progress-bar span {
          position: absolute;
          top: -1.25rem;
          right: 0;
          font-size: 0.75rem;
          color: #64748b;
        }
        
        .image-preview {
          margin-top: 1rem;
          border-radius: 0.375rem;
          overflow: hidden;
        }
        
        .image-preview img {
          width: 100%;
          height: auto;
          display: block;
        }
      `}</style>
    </div>
  );
};

export default TerritoryMapCard; 
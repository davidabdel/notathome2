import React, { useState } from 'react';
import { supabase } from '../../../supabase/config';

interface MapSetupFormProps {
  congregationId: string;
  onSetupComplete: () => void;
}

const MapSetupForm: React.FC<MapSetupFormProps> = ({ congregationId, onSetupComplete }) => {
  const [mapCount, setMapCount] = useState<number>(1);
  const [defaultDescription, setDefaultDescription] = useState<string>('Do Not Call addresses');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mapCount < 1) {
      setError('Please enter at least 1 map');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // First, update the congregation with the map count
      const { error: updateError } = await supabase
        .from('congregations')
        .update({ map_count: mapCount })
        .eq('id', congregationId);
      
      if (updateError) {
        throw updateError;
      }
      
      // Then create placeholder maps
      const maps = Array.from({ length: mapCount }, (_, index) => ({
        congregation_id: congregationId,
        name: `Territory Map ${index + 1}`,
        description: defaultDescription.trim() || 'Do Not Call addresses',
        status: 'active',
        created_at: new Date().toISOString()
      }));
      
      const { error: insertError } = await supabase
        .from('territory_maps')
        .insert(maps);
      
      if (insertError) {
        throw insertError;
      }
      
      // Call the callback to refresh the parent component
      onSetupComplete();
    } catch (err: any) {
      console.error('Error setting up maps:', err);
      setError(err.message || 'Failed to set up territory maps');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="map-setup-form">
      <h2>Set Up Territory Maps</h2>
      <p className="description">
        Please enter the number of territory maps for your congregation and a default description.
        You'll be able to customize each map after setup.
      </p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="map-count">Number of Territory Maps:</label>
          <input
            type="number"
            id="map-count"
            min="1"
            max="100"
            value={mapCount}
            onChange={(e) => setMapCount(parseInt(e.target.value) || 1)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="default-description">Default Map Description:</label>
          <textarea
            id="default-description"
            rows={3}
            value={defaultDescription}
            onChange={(e) => setDefaultDescription(e.target.value)}
            placeholder="Enter a description that will be used for all maps"
          />
          <p className="help-text">This description will appear under each map image.</p>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <button 
          type="submit" 
          className="submit-button"
          disabled={loading}
        >
          {loading ? 'Setting Up Maps...' : 'Create Maps'}
        </button>
      </form>
      
      <style jsx>{`
        .map-setup-form {
          background-color: white;
          border-radius: 0.5rem;
          padding: 2rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          max-width: 600px;
          margin: 0 auto;
        }
        
        h2 {
          margin-top: 0;
          color: #1e293b;
        }
        
        .description {
          color: #64748b;
          margin-bottom: 1.5rem;
        }
        
        .form-group {
          margin-bottom: 1.5rem;
        }
        
        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #334155;
        }
        
        input, textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 0.375rem;
          font-size: 1rem;
        }
        
        textarea {
          resize: vertical;
          min-height: 80px;
        }
        
        .help-text {
          margin-top: 0.5rem;
          font-size: 0.875rem;
          color: #64748b;
        }
        
        .error-message {
          background-color: #fee2e2;
          color: #b91c1c;
          padding: 0.75rem;
          border-radius: 0.375rem;
          margin-bottom: 1.5rem;
        }
        
        .submit-button {
          background-color: #2563eb;
          color: white;
          border: none;
          border-radius: 0.375rem;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .submit-button:hover {
          background-color: #1d4ed8;
        }
        
        .submit-button:disabled {
          background-color: #93c5fd;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default MapSetupForm; 
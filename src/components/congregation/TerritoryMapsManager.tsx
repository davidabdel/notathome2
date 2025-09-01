import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase/config';
import MapSetupForm from './MapSetupForm';
import TerritoryMapCard from './TerritoryMapCard';

interface TerritoryMap {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  status: string;
  congregation_id: string;
}

interface TerritoryMapsManagerProps {
  congregationId: string;
  onError?: (errorMessage: string) => void;
}

const TerritoryMapsManager: React.FC<TerritoryMapsManagerProps> = ({ congregationId, onError }) => {
  const [maps, setMaps] = useState<TerritoryMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [setupComplete, setSetupComplete] = useState(false);
  const [addingMap, setAddingMap] = useState(false);

  useEffect(() => {
    if (congregationId) {
      fetchMaps();
    }
  }, [congregationId]);

  const fetchMaps = async () => {
    if (!congregationId) return;

    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('territory_maps')
        .select('*')
        .eq('congregation_id', congregationId)
        .order('name');

      if (fetchError) {
        throw fetchError;
      }

      // Sort maps numerically by extracting the number from the name
      const sortedMaps = [...(data || [])].sort((a, b) => {
        // Extract numbers from map names (e.g., "Territory Map 1" -> 1)
        const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
        return numA - numB;
      });

      setMaps(sortedMaps);
      setSetupComplete(data && data.length > 0);
    } catch (err: any) {
      console.error('Error fetching territory maps:', err);
      const errorMessage = 'Failed to load territory maps. Please try again later.';
      setError(errorMessage);
      
      // Call the onError prop if provided
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMapSetupComplete = () => {
    fetchMaps();
  };

  const handleMapUpdate = () => {
    fetchMaps();
  };

  const handleAddMap = async () => {
    setAddingMap(true);
    setError('');
    
    try {
      // Get the current map count to determine the next map number
      const nextMapNumber = maps.length + 1;
      
      // Create a new map
      const newMap = {
        congregation_id: congregationId,
        name: `Territory Map ${nextMapNumber}`,
        description: 'Do Not Call addresses',
        status: 'active',
        created_at: new Date().toISOString()
      };
      
      const { data, error: insertError } = await supabase
        .from('territory_maps')
        .insert(newMap)
        .select();
      
      if (insertError) {
        throw insertError;
      }
      
      console.log('New map created:', data);
      
      // Update the congregation's map count
      const { error: updateError } = await supabase
        .from('congregations')
        .update({ map_count: nextMapNumber })
        .eq('id', congregationId);
      
      if (updateError) {
        console.warn('Failed to update congregation map count:', updateError);
        // Continue anyway since the map was created
      }
      
      // Refresh the maps list
      fetchMaps();
    } catch (err: any) {
      console.error('Error adding new map:', err);
      setError('Failed to add new map. Please try again.');
      
      // Call the onError prop if provided
      if (onError) {
        onError('Failed to add new map. Please try again.');
      }
    } finally {
      setAddingMap(false);
    }
  };

  if (loading && maps.length === 0) {
    return (
      <div className="loading-container">
        <p>Loading territory maps...</p>
      </div>
    );
  }

  if (error && !onError) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button 
          className="retry-button"
          onClick={fetchMaps}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!setupComplete) {
    return <MapSetupForm congregationId={congregationId} onSetupComplete={handleMapSetupComplete} />;
  }

  return (
    <div className="territory-maps-manager">
      <div className="header">
        <h2>Territory Maps</h2>
        <p className="map-count">
          {maps.length} {maps.length === 1 ? 'map' : 'maps'} available
        </p>
      </div>

      {maps.length === 0 ? (
        <div className="no-maps">
          <p>No territory maps have been added yet.</p>
          <button 
            className="setup-button"
            onClick={() => setSetupComplete(false)}
          >
            Set Up Territory Maps
          </button>
        </div>
      ) : (
        <div className="maps-grid">
          {maps.map((map) => (
            <TerritoryMapCard 
              key={map.id} 
              map={map} 
              onUpdate={handleMapUpdate} 
            />
          ))}
          
          {/* Add Map Button */}
          <div className="add-map-card">
            <button 
              className="add-map-button"
              onClick={handleAddMap}
              disabled={addingMap}
              aria-label="Add new territory map"
            >
              {addingMap ? '...' : '+'}
            </button>
            <p className="add-map-text">Add Map</p>
          </div>
        </div>
      )}

      <style jsx>{`
        .territory-maps-manager {
          padding: 1.5rem;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 1rem;
        }

        h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }

        .map-count {
          color: #64748b;
          font-size: 0.875rem;
        }

        .maps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 200px;
          color: #64748b;
        }

        .error-container {
          background-color: #fee2e2;
          border-radius: 0.5rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .error-message {
          color: #b91c1c;
          margin-bottom: 1rem;
        }

        .retry-button {
          background-color: #ef4444;
          color: white;
          border: none;
          border-radius: 0.375rem;
          padding: 0.75rem 1.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .retry-button:hover {
          background-color: #dc2626;
        }

        .no-maps {
          background-color: #f8fafc;
          border-radius: 0.5rem;
          padding: 3rem;
          text-align: center;
          color: #64748b;
        }

        .setup-button {
          background-color: #2563eb;
          color: white;
          border: none;
          border-radius: 0.375rem;
          padding: 0.75rem 1.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
          margin-top: 1rem;
        }

        .setup-button:hover {
          background-color: #1d4ed8;
        }

        .add-map-card {
          background-color: #f8fafc;
          border: 2px dashed #cbd5e1;
          border-radius: 0.5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 2rem;
          min-height: 200px;
          transition: background-color 0.2s;
        }

        .add-map-card:hover {
          background-color: #f1f5f9;
        }

        .add-map-button {
          background-color: #2563eb;
          color: white;
          border: none;
          border-radius: 50%;
          width: 60px;
          height: 60px;
          font-size: 2rem;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          transition: background-color 0.2s;
          margin-bottom: 1rem;
        }

        .add-map-button:hover {
          background-color: #1d4ed8;
        }

        .add-map-button:disabled {
          background-color: #93c5fd;
          cursor: not-allowed;
        }

        .add-map-text {
          color: #64748b;
          font-size: 1rem;
          font-weight: 500;
        }

        @media (max-width: 640px) {
          .maps-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default TerritoryMapsManager; 
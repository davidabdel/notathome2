import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase/config';
import MapSetupForm from './MapSetupForm';
import TerritoryMapCard from './TerritoryMapCard';
import { Plus, AlertCircle, RefreshCw } from 'lucide-react';

interface TerritoryMap {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  status: string;
  congregation_id: string;
  blocks?: number;
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMapBlocks, setNewMapBlocks] = useState<number | string>(10);

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

  const handleAddMap = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setAddingMap(true);
    setError('');

    try {
      // Get the current map count to determine the next map number
      const nextMapNumber = maps.length + 1;
      const blocksToSave = typeof newMapBlocks === 'string' ? (parseInt(newMapBlocks) || 10) : newMapBlocks;

      // Create a new map
      const newMap = {
        congregation_id: congregationId,
        name: `Territory Map ${nextMapNumber}`,
        description: 'Do Not Call addresses',
        status: 'active',
        blocks: blocksToSave,
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

      // Reset form and refresh
      setShowAddForm(false);
      setNewMapBlocks(10);
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
        <div className="spinner"></div>
        <p>Loading territory maps...</p>
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 200px;
            color: var(--color-text-secondary);
          }
          .spinner {
            width: 32px;
            height: 32px;
            border: 3px solid rgba(37, 99, 235, 0.1);
            border-radius: 50%;
            border-top-color: var(--color-primary);
            animation: spin 1s linear infinite;
            margin-bottom: var(--space-3);
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error && !onError) {
    return (
      <div className="error-container">
        <AlertCircle size={32} className="error-icon" />
        <p className="error-message">{error}</p>
        <button
          className="btn btn-primary"
          onClick={fetchMaps}
        >
          <RefreshCw size={16} className="mr-2" />
          Try Again
        </button>
        <style jsx>{`
          .error-container {
            background-color: var(--color-error-bg);
            border: 1px solid rgba(239, 68, 68, 0.2);
            border-radius: var(--radius-lg);
            padding: var(--space-8);
            margin-bottom: var(--space-6);
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .error-icon {
            color: var(--color-error);
            margin-bottom: var(--space-4);
          }
          .error-message {
            color: var(--color-error);
            margin-bottom: var(--space-6);
            font-weight: 500;
          }
          .mr-2 { margin-right: var(--space-2); }
        `}</style>
      </div>
    );
  }

  if (!setupComplete) {
    return <MapSetupForm congregationId={congregationId} onSetupComplete={handleMapSetupComplete} />;
  }

  return (
    <div className="territory-maps-manager">
      <div className="header">
        <h2 className="section-title">Territory Maps</h2>
        <span className="map-count-badge">
          {maps.length} {maps.length === 1 ? 'map' : 'maps'} available
        </span>
      </div>

      {maps.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon-wrapper">
            <AlertCircle size={32} />
          </div>
          <h3 className="empty-title">No Maps Yet</h3>
          <p className="empty-description">No territory maps have been added yet.</p>
          <button
            className="btn btn-primary"
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

          {/* Add Map Card / Form */}
          {showAddForm ? (
            <div className="add-map-form-card">
              <h3>Add New Map</h3>
              <form onSubmit={handleAddMap}>
                <div className="form-group">
                  <label htmlFor="new-map-blocks">Number of Blocks</label>
                  <input
                    id="new-map-blocks"
                    type="number"
                    min="1"
                    max="50"
                    value={newMapBlocks}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setNewMapBlocks('');
                      } else {
                        setNewMapBlocks(parseInt(val));
                      }
                    }}
                    className="blocks-input"
                    autoFocus
                  />
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setShowAddForm(false)}
                    disabled={addingMap}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="create-btn"
                    disabled={addingMap}
                  >
                    {addingMap ? 'Creating...' : 'Create Map'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <button
              className="add-map-card"
              onClick={() => setShowAddForm(true)}
              aria-label="Add new territory map"
            >
              <div className="add-icon-wrapper">
                <Plus size={32} />
              </div>
              <span className="add-map-text">Add New Map</span>
            </button>
          )}
        </div>
      )}

      <style jsx>{`
        .territory-maps-manager {
          width: 100%;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-6);
          border-bottom: 1px solid var(--color-border);
          padding-bottom: var(--space-4);
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text-main);
          margin: 0;
          letter-spacing: -0.025em;
        }

        .map-count-badge {
          background-color: var(--color-primary-light);
          color: var(--color-primary);
          font-size: 0.875rem;
          font-weight: 600;
          padding: var(--space-1) var(--space-3);
          border-radius: 9999px;
        }

        .maps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: var(--space-6);
        }

        .empty-state {
          background-color: var(--color-bg-body);
          border-radius: var(--radius-lg);
          padding: var(--space-12);
          text-align: center;
          color: var(--color-text-secondary);
          border: 1px dashed var(--color-border);
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .empty-icon-wrapper {
          width: 64px;
          height: 64px;
          background-color: var(--color-bg-input);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: var(--space-4);
          color: var(--color-text-tertiary);
        }
        
        .empty-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-text-main);
          margin: 0 0 var(--space-2) 0;
        }
        
        .empty-description {
          margin: 0 0 var(--space-6) 0;
          color: var(--color-text-secondary);
        }

        .add-map-card {
          background-color: var(--color-bg-body);
          border: 2px dashed var(--color-border);
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: var(--space-8);
          min-height: 280px;
          transition: all 0.2s ease;
          cursor: pointer;
          width: 100%;
        }

        .add-map-card:hover:not(:disabled) {
          border-color: var(--color-primary);
          background-color: var(--color-primary-light);
        }
        
        .add-map-card:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .add-icon-wrapper {
          background-color: var(--color-bg-card);
          color: var(--color-primary);
          border-radius: 50%;
          width: 64px;
          height: 64px;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: var(--space-4);
          box-shadow: var(--shadow-sm);
          transition: transform 0.2s ease;
        }
        
        .add-map-card:hover:not(:disabled) .add-icon-wrapper {
          transform: scale(1.1);
          background-color: var(--color-primary);
          color: white;
        }

        .add-map-text {
          color: var(--color-text-main);
          font-size: 1.125rem;
          font-weight: 600;
        }
        
        .spinner-sm {
          width: 24px;
          height: 24px;
          border: 2px solid rgba(37, 99, 235, 0.1);
          border-radius: 50%;
          border-top-color: var(--color-primary);
          animation: spin 1s linear infinite;
        }

        .add-map-form-card {
          background-color: white;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-6);
          min-height: 280px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          box-shadow: var(--shadow-sm);
        }

        .add-map-form-card h3 {
          margin-top: 0;
          margin-bottom: var(--space-4);
          text-align: center;
          color: var(--color-text-main);
        }

        .form-group {
          margin-bottom: var(--space-4);
        }

        .form-group label {
          display: block;
          margin-bottom: var(--space-2);
          font-weight: 500;
          color: var(--color-text-secondary);
        }

        .blocks-input {
          width: 100%;
          padding: var(--space-3);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 1rem;
          text-align: center;
        }

        .form-actions {
          display: flex;
          gap: var(--space-3);
          margin-top: var(--space-4);
        }

        .cancel-btn, .create-btn {
          flex: 1;
          padding: var(--space-2) var(--space-4);
          border-radius: var(--radius-md);
          font-weight: 500;
          cursor: pointer;
          border: none;
          font-size: 0.9rem;
        }

        .cancel-btn {
          background-color: var(--color-bg-input);
          color: var(--color-text-secondary);
        }

        .create-btn {
          background-color: var(--color-primary);
          color: white;
        }

        .create-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
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
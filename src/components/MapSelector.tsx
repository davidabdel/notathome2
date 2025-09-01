import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/config';

interface MapSelectorProps {
  sessionId: string;
  onMapSelected: (mapNumber: number) => void;
}

interface TerritoryMap {
  id: string;
  map_number: number;
  name: string;
  description: string;
  image_url: string;
  congregation_id: string;
}

const MapSelector: React.FC<MapSelectorProps> = ({ sessionId, onMapSelected }) => {
  const [maps, setMaps] = useState<TerritoryMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMap, setSelectedMap] = useState<number | null>(null);

  useEffect(() => {
    fetchMaps();
  }, [sessionId]);

  const fetchMaps = async () => {
    try {
      setLoading(true);
      setError(null);

      // First get the congregation_id from the session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('congregation_id')
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        throw sessionError;
      }

      if (!sessionData?.congregation_id) {
        throw new Error('No congregation found for this session');
      }

      // Then fetch maps for this congregation
      const { data: mapsData, error: mapsError } = await supabase
        .from('territory_maps')
        .select('*')
        .eq('congregation_id', sessionData.congregation_id)
        .order('map_number', { ascending: true });

      if (mapsError) {
        throw mapsError;
      }

      setMaps(mapsData || []);
      
      // If there's only one map, select it automatically
      if (mapsData && mapsData.length === 1) {
        setSelectedMap(mapsData[0].map_number);
        onMapSelected(mapsData[0].map_number);
      }
    } catch (err) {
      console.error('Error fetching maps:', err);
      setError('Failed to load territory maps. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMapSelect = (mapNumber: number) => {
    setSelectedMap(mapNumber);
    onMapSelected(mapNumber);
  };

  if (loading) {
    return <div className="loading">Loading territory maps...</div>;
  }

  if (maps.length === 0) {
    return (
      <div className="empty-state">
        No territory maps found for this congregation. Please contact your administrator.
      </div>
    );
  }

  return (
    <div className="map-selector">
      <h3 className="selector-title">Select Territory Map</h3>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <div className="maps-grid">
        {maps.map(map => (
          <div 
            key={map.id}
            className={`map-card ${selectedMap === map.map_number ? 'selected' : ''}`}
            onClick={() => handleMapSelect(map.map_number)}
          >
            <div className="map-number">Map {map.map_number}</div>
            <div className="map-name">{map.name}</div>
            {map.description && (
              <div className="map-description-preview">
                {map.description.length > 60 
                  ? `${map.description.replace(/\n/g, ' ').substring(0, 60)}...` 
                  : map.description.replace(/\n/g, ' ')}
              </div>
            )}
            {map.image_url && (
              <div className="map-thumbnail">
                <img src={map.image_url} alt={`Map ${map.map_number}`} />
              </div>
            )}
          </div>
        ))}
      </div>
      
      <style jsx>{`
        .map-selector {
          margin-bottom: 1.5rem;
        }
        
        .selector-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #1f2937;
        }
        
        .loading, .empty-state {
          padding: 1.5rem;
          text-align: center;
          background-color: #f9fafb;
          border-radius: 6px;
          color: #6b7280;
          font-size: 0.875rem;
        }
        
        .error-message {
          margin-bottom: 1rem;
          padding: 0.75rem;
          background-color: rgba(239, 68, 68, 0.1);
          border-radius: 6px;
          color: #ef4444;
          font-size: 0.875rem;
        }
        
        .maps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 1rem;
        }
        
        .map-card {
          display: flex;
          flex-direction: column;
          padding: 1rem;
          background-color: white;
          border: 2px solid #e5e7eb;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .map-card:hover {
          border-color: #93c5fd;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }
        
        .map-card.selected {
          border-color: #3b82f6;
          background-color: #eff6ff;
        }
        
        .map-number {
          font-size: 0.875rem;
          font-weight: 600;
          color: #1f2937;
        }
        
        .map-name {
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 0.25rem;
          margin-bottom: 0.5rem;
        }
        
        .map-description-preview {
          font-size: 0.7rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
          font-style: italic;
          line-height: 1.2;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        
        .map-thumbnail {
          width: 100%;
          height: 100px;
          overflow: hidden;
          border-radius: 4px;
          background-color: #f3f4f6;
        }
        
        .map-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      `}</style>
    </div>
  );
};

export default MapSelector; 
import React, { useState, useEffect } from 'react';
import useGeotagging, { Coordinates } from '../hooks/useGeotagging';
import { subscribeToLocationUpdates } from '../../supabase/realtime-setup';

interface LocationTrackerProps {
  sessionId: string;
  isActive?: boolean;
}

interface LocationEntry {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  session_id: string;
}

const LocationTracker: React.FC<LocationTrackerProps> = ({ sessionId, isActive = false }) => {
  const [locations, setLocations] = useState<LocationEntry[]>([]);
  const [isTracking, setIsTracking] = useState(isActive);
  const [error, setError] = useState<string | null>(null);
  
  // Use our geotagging hook
  const {
    coordinates,
    loading,
    error: geoError,
    startWatching,
    stopWatching,
    isWatching,
    getCurrentLocation
  } = useGeotagging({
    sessionId: isTracking ? sessionId : undefined,
    enabled: isTracking,
    onError: (err) => {
      setError(`Geolocation error: ${err.message}`);
    }
  });

  // Subscribe to location updates from other users
  useEffect(() => {
    if (!sessionId) return;
    
    // Subscribe to real-time location updates
    const unsubscribe = subscribeToLocationUpdates(sessionId, (location) => {
      setLocations((prevLocations) => {
        // Check if we already have this location
        if (prevLocations.some(loc => loc.id === location.id)) {
          return prevLocations;
        }
        return [...prevLocations, location as LocationEntry];
      });
    });
    
    return () => {
      unsubscribe();
    };
  }, [sessionId]);

  // Toggle tracking
  const toggleTracking = () => {
    if (isTracking) {
      stopWatching();
      setIsTracking(false);
    } else {
      setIsTracking(true);
    }
  };

  // Get current location once
  const handleGetCurrentLocation = async () => {
    try {
      await getCurrentLocation();
    } catch (err) {
      setError(`Failed to get location: ${err}`);
    }
  };

  return (
    <div className="location-tracker">
      <div className="tracker-header">
        <h3>Location Tracker</h3>
        <div className="status">
          {isTracking ? (
            <span className="status-active">Tracking Active</span>
          ) : (
            <span className="status-inactive">Tracking Inactive</span>
          )}
        </div>
      </div>

      <div className="controls">
        <button 
          className={`control-button ${isTracking ? 'stop' : 'start'}`}
          onClick={toggleTracking}
        >
          {isTracking ? 'Stop Tracking' : 'Start Tracking'}
        </button>
        
        <button 
          className="control-button get-location"
          onClick={handleGetCurrentLocation}
          disabled={loading}
        >
          {loading ? 'Getting Location...' : 'Get Current Location'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {coordinates && (
        <div className="current-location">
          <h4>Your Current Location</h4>
          <div className="coordinates">
            <div>Latitude: {coordinates.lat.toFixed(6)}</div>
            <div>Longitude: {coordinates.lng.toFixed(6)}</div>
          </div>
        </div>
      )}

      <div className="locations-list">
        <h4>Recent Locations ({locations.length})</h4>
        {locations.length > 0 ? (
          <ul>
            {locations.slice(-5).map((location) => (
              <li key={location.id} className="location-item">
                <div className="location-coords">
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </div>
                <div className="location-time">
                  {new Date(location.timestamp).toLocaleTimeString()}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="no-locations">No locations recorded yet</p>
        )}
      </div>

      <style jsx>{`
        .location-tracker {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .tracker-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
        }

        h4 {
          margin: 1rem 0 0.5rem;
          font-size: 1rem;
          font-weight: 500;
        }

        .status {
          font-size: 0.875rem;
          font-weight: 500;
        }

        .status-active {
          color: #10b981;
        }

        .status-inactive {
          color: #6b7280;
        }

        .controls {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .control-button {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: background-color 0.15s ease;
        }

        .control-button.start {
          background-color: #10b981;
          color: white;
        }

        .control-button.start:hover {
          background-color: #059669;
        }

        .control-button.stop {
          background-color: #ef4444;
          color: white;
        }

        .control-button.stop:hover {
          background-color: #dc2626;
        }

        .control-button.get-location {
          background-color: #3b82f6;
          color: white;
        }

        .control-button.get-location:hover {
          background-color: #2563eb;
        }

        .control-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-message {
          margin: 1rem 0;
          padding: 0.75rem;
          background-color: rgba(239, 68, 68, 0.1);
          border-radius: 6px;
          color: #ef4444;
          font-size: 0.875rem;
        }

        .current-location {
          margin-top: 1rem;
          padding: 0.75rem;
          background-color: rgba(59, 130, 246, 0.1);
          border-radius: 6px;
        }

        .coordinates {
          font-family: monospace;
          font-size: 0.875rem;
        }

        .locations-list {
          margin-top: 1.5rem;
        }

        ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .location-item {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .location-coords {
          font-family: monospace;
          font-size: 0.875rem;
        }

        .location-time {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .no-locations {
          color: #6b7280;
          font-size: 0.875rem;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default LocationTracker; 
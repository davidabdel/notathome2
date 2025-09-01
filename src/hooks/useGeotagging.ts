import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

export interface Coordinates {
  lat: number;
  lng: number;
}

interface UseGeotaggingProps {
  sessionId?: string;
  enabled?: boolean;
  onError?: (error: GeolocationPositionError) => void;
}

export const useGeotagging = ({
  sessionId,
  enabled = false,
  onError
}: UseGeotaggingProps = {}) => {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<GeolocationPositionError | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  // This is the protected function from the architecture document
  const captureLocation = useCallback(() => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setCoordinates({ 
        lat: pos.coords.latitude, 
        lng: pos.coords.longitude 
      });
    });
  }, []);

  // Function to handle geolocation errors
  const handleError = useCallback((err: GeolocationPositionError) => {
    setError(err);
    setLoading(false);
    if (onError) {
      onError(err);
    }
  }, [onError]);

  // Function to start watching location
  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setError({
        code: 0,
        message: 'Geolocation is not supported by this browser.',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      });
      return;
    }

    setLoading(true);
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const newCoordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setCoordinates(newCoordinates);
        setLoading(false);
        
        // If we have a session ID, send the coordinates to the server
        if (sessionId) {
          sendCoordinatesToServer(sessionId, newCoordinates);
        }
      },
      handleError,
      {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 27000
      }
    );
    
    setWatchId(id);
    return id;
  }, [sessionId, handleError]);

  // Function to stop watching location
  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchId]);

  // Function to manually get current location once
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError({
        code: 0,
        message: 'Geolocation is not supported by this browser.',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      });
      return Promise.reject('Geolocation not supported');
    }

    setLoading(true);
    return new Promise<Coordinates>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCoordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCoordinates(newCoordinates);
          setLoading(false);
          resolve(newCoordinates);
        },
        (err) => {
          handleError(err);
          reject(err);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 30000,
          timeout: 27000
        }
      );
    });
  }, [handleError]);

  // Function to send coordinates to the server
  const sendCoordinatesToServer = async (sessionId: string, coords: Coordinates) => {
    try {
      const { error } = await supabase
        .from('locations')
        .insert({
          session_id: sessionId,
          latitude: coords.lat,
          longitude: coords.lng,
          timestamp: new Date().toISOString()
        });
      
      if (error) {
        console.error('Error sending coordinates to server:', error);
      }
    } catch (err) {
      console.error('Failed to send coordinates:', err);
    }
  };

  // Start or stop watching based on enabled prop
  useEffect(() => {
    if (enabled) {
      startWatching();
    } else {
      stopWatching();
    }

    return () => {
      stopWatching();
    };
  }, [enabled, startWatching, stopWatching]);

  return {
    coordinates,
    loading,
    error,
    captureLocation,
    getCurrentLocation,
    startWatching,
    stopWatching,
    isWatching: watchId !== null
  };
};

export default useGeotagging; 
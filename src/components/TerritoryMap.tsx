import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";

interface TerritoryMapProps {
  mapNumber: number;
}

// Remove the MAP_URLS mapping as we'll fetch directly from the database

const TerritoryMap: React.FC<TerritoryMapProps> = ({ mapNumber }) => {
  const router = useRouter();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [mapDescription, setMapDescription] = useState<string | null>(null);

  useEffect(() => {
    // Reset states when map number changes
    setError(null);
    setLoading(true);
    setMapDescription(null);
    
    console.log(`Fetching Territory Map ${mapNumber}`);
    
    const fetchMapImage = async () => {
      try {
        // Get session ID from URL
        const { id } = router.query;
        if (!id) {
          setError("No session ID found");
          setLoading(false);
          return;
        }

        // Get session data to find congregation ID
        const { data: sessionData, error: sessionError } = await supabase
          .from("sessions")
          .select("congregation_id")
          .eq("id", id)
          .single();

        if (sessionError || !sessionData) {
          console.error("Error fetching session:", sessionError);
          setError(`Error fetching session: ${sessionError?.message || "Unknown error"}`);
          setLoading(false);
          return;
        }

        const congregationId = sessionData.congregation_id;
        console.log(`Found congregation ID: ${congregationId}`);

        // Get maps for this congregation - using territory_maps table instead of maps
        const { data: maps, error: mapsError } = await supabase
          .from("territory_maps")
          .select("*")
          .eq("congregation_id", congregationId);

        if (mapsError || !maps) {
          console.error("Error fetching maps:", mapsError);
          setError(`Error fetching maps: ${mapsError?.message || "Unknown error"}`);
          setLoading(false);
          return;
        }

        console.log(`Found ${maps.length} maps for congregation ${congregationId}`);
        console.log("Available maps:", maps);
        
        // Look for a map with name "Territory Map X"
        const exactMapName = `Territory Map ${mapNumber}`;
        const matchingMap = maps.find(map => map.name === exactMapName);
        
        if (matchingMap) {
          console.log(`Found exact match for "${exactMapName}":`, matchingMap);
          if (matchingMap.image_url) {
            setImageSrc(matchingMap.image_url);
          }
          if (matchingMap.description) {
            setMapDescription(matchingMap.description);
          }
          setLoading(false);
          return;
        }
        
        // If no exact match by name, try to find by map_number
        const mapByNumber = maps.find(map => Number(map.map_number) === Number(mapNumber));
        
        if (mapByNumber) {
          console.log(`Found map by number ${mapNumber}:`, mapByNumber);
          if (mapByNumber.image_url) {
            setImageSrc(mapByNumber.image_url);
          }
          if (mapByNumber.description) {
            setMapDescription(mapByNumber.description);
          }
          setLoading(false);
          return;
        }
        
        // If still no match, check if any map has this number in its name
        const mapWithNumberInName = maps.find(map => 
          map.name && map.name.includes(`${mapNumber}`)
        );
        
        if (mapWithNumberInName) {
          console.log(`Found map with "${mapNumber}" in name:`, mapWithNumberInName);
          if (mapWithNumberInName.image_url) {
            setImageSrc(mapWithNumberInName.image_url);
          }
          if (mapWithNumberInName.description) {
            setMapDescription(mapWithNumberInName.description);
          }
          setLoading(false);
          return;
        }

        // If we still don't have a match, try to find files in storage
        if (maps.length > 0) {
          // Store debug info for troubleshooting
          setDebugInfo({
            requestedMap: mapNumber,
            congregationId,
            availableMaps: maps,
          });
          
          setError(`Could not find Territory Map ${mapNumber}. Please check the map configuration.`);
          setLoading(false);
        } else {
          setError(`No maps found for congregation ${congregationId}`);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error in fetchMapImage:", err);
        setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
        setLoading(false);
      }
    };

    if (mapNumber) {
      fetchMapImage();
    } else {
      setError("No map number provided");
      setLoading(false);
    }
  }, [mapNumber, router.query]);

  if (loading) {
    return (
      <div className="territory-map-loading">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading Territory Map {mapNumber}...</p>
        <style jsx>{`
          .territory-map-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 16px;
          }
          .loading-spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 2s linear infinite;
          }
          .loading-text {
            margin-top: 16px;
            font-size: 14px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="territory-map-error">
        <p className="error-message">{error}</p>
        {debugInfo && (
          <div className="debug-info">
            <h4>Debug Information:</h4>
            <p>Requested Map: {debugInfo.requestedMap}</p>
            <p>Congregation ID: {debugInfo.congregationId}</p>
            <p>Available Maps: {debugInfo.availableMaps.length}</p>
            <div>
              <p>Map Names:</p>
              <ul>
                {debugInfo.availableMaps.map((map: any, index: number) => (
                  <li key={index}>
                    {map.name} (#{map.map_number}) - {map.image_url ? "Has URL" : "No URL"}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        <style jsx>{`
          .territory-map-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 16px;
          }
          .error-message {
            color: #e53e3e;
            margin-bottom: 16px;
          }
          .debug-info {
            margin-top: 16px;
            padding: 16px;
            background-color: #f5f5f5;
            border-radius: 4px;
            width: 100%;
            font-size: 14px;
          }
          .debug-info h4 {
            margin-top: 0;
            margin-bottom: 8px;
          }
          .debug-info p {
            margin: 4px 0;
          }
          .debug-info ul {
            margin-top: 4px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="territory-map-container">
      <div className="map-content">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={`Territory Map ${mapNumber}`}
            className="territory-map-image"
          />
        ) : (
          <p className="no-image-text">No image available</p>
        )}
        
        {mapDescription && (
          <div className="map-description">
            <div className="description-text">{mapDescription}</div>
          </div>
        )}
      </div>
      <style jsx>{`
        .territory-map-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          overflow: hidden;
        }
        .map-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
        }
        .territory-map-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        .no-image-text {
          color: #718096;
        }
        .map-description {
          margin-top: 1rem;
          padding: 0.75rem;
          width: 100%;
          background-color: #f9fafb;
          border-radius: 0.375rem;
          border: 1px solid #e5e7eb;
        }
        .description-text {
          margin: 0;
          color: #4b5563;
          font-size: 0.875rem;
          line-height: 1.5;
          white-space: pre-line;
        }
      `}</style>
    </div>
  );
};

export default TerritoryMap; 
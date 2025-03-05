import React, { useEffect, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

const GoogleMapsTest: React.FC = () => {
  const [status, setStatus] = useState<string>('Loading...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testGoogleMaps = async () => {
      try {
        setStatus('Initializing Google Maps loader...');
        
        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
          version: "weekly",
          libraries: ["places", "geocoding"]
        });

        setStatus('Loading Google Maps...');
        await loader.load();
        
        setStatus('Creating Geocoder...');
        const geocoder = new google.maps.Geocoder();
        
        // Test geocoding with a sample address
        setStatus('Testing geocoding...');
        const result = await geocoder.geocode({
          address: "1600 Amphitheatre Parkway, Mountain View, CA"
        });

        if (result.results && result.results.length > 0) {
          const location = result.results[0].geometry.location;
          setStatus(`Success! Sample coordinates: ${location.lat()}, ${location.lng()}`);
        } else {
          setStatus('Geocoding worked but no results found');
        }
      } catch (err) {
        console.error('Google Maps test failed:', err);
        setError(err instanceof Error ? err.message : String(err));
        setStatus('Failed');
      }
    };

    testGoogleMaps();
  }, []);

  return (
    <div className="google-maps-test">
      <h3>Google Maps API Test</h3>
      <p>Status: {status}</p>
      {error && (
        <div className="error">
          Error: {error}
        </div>
      )}

      <style jsx>{`
        .google-maps-test {
          padding: 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }

        .error {
          color: #ef4444;
          margin-top: 0.5rem;
          padding: 0.5rem;
          background-color: #fee2e2;
          border-radius: 0.25rem;
        }
      `}</style>
    </div>
  );
};

export default GoogleMapsTest; 
import React, { useState, useEffect } from 'react';
import { useGeotagging } from '../hooks/useGeotagging';
import { supabase } from '../utils/supabaseClient';
import { Loader } from '@googlemaps/js-api-loader';
import { useRouter } from 'next/router';
import { SupabaseClient } from '@supabase/supabase-js';

// Explicitly type the supabase client
const supabaseClient: SupabaseClient = supabase;

interface LocationRecorderProps {
  sessionId: string;
  selectedBlock: number | null;
  onLocationRecorded?: () => void;
}

interface AddressFields {
  unitNumber: string;
  houseNumber: string;
  streetName: string;
  suburb: string;
}

const LocationRecorder: React.FC<LocationRecorderProps> = ({
  sessionId,
  selectedBlock,
  onLocationRecorded
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [detailedError, setDetailedError] = useState<string | null>(null);
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [capturedLocation, setCapturedLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [addressFields, setAddressFields] = useState<AddressFields>({
    unitNumber: '',
    houseNumber: '',
    streetName: '',
    suburb: ''
  });

  const {
    coordinates,
    loading: geoLoading,
    error: geoError,
    getCurrentLocation
  } = useGeotagging({ sessionId, enabled: false });

  // Initialize Google Maps Geocoder
  useEffect(() => {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      version: "weekly",
      libraries: ["places", "geocoding"]
    });

    loader.load().then(() => {
      setGeocoder(new google.maps.Geocoder());
    }).catch((err) => {
      console.error('Error loading Google Maps:', err);
      setError('Failed to load mapping service');
    });
  }, []);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
    setDetailedError(null);
  };

  const showSuccessMessage = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  const parseAddressComponents = (results: google.maps.GeocoderResult[]): AddressFields => {
    let unitNumber = '';
    let houseNumber = '';
    let streetName = '';
    let suburb = '';

    // We primarily look at the first result
    if (results.length > 0) {
      const components = results[0].address_components;

      components.forEach(component => {
        const types = component.types;
        if (types.includes('subpremise') || types.includes('room') || types.includes('floor') || types.includes('unit')) {
          unitNumber = component.long_name;
        } else if (types.includes('street_number')) {
          houseNumber = component.long_name;
        } else if (types.includes('route')) {
          streetName = component.long_name;
        } else if (types.includes('locality')) {
          suburb = component.long_name;
        }
      });

      // Fallback: If we didn't find a house number in the first result, 
      // check if it's a 'premise' which might be the house number/name
      if (!houseNumber && results[0].types.includes('premise')) {
        // Sometimes the premise name is the house number or building name
        // But be careful not to use a business name as a house number
        // Let's check if it looks like a number
        if (/^\d+/.test(results[0].address_components[0].long_name)) {
          houseNumber = results[0].address_components[0].long_name;
        }
      }

      // Fallback: If we still don't have street name, try to parse formatted_address
      // This is a last resort for when components are missing but the string has it
      if (!streetName && results[0].formatted_address) {
        // Very basic heuristic for "Number Street, Suburb" format
        const parts = results[0].formatted_address.split(',');
        if (parts.length > 0) {
          const firstPart = parts[0].trim();
          // If it starts with a number, split it
          const match = firstPart.match(/^(\d+[\w\-]*)?\s*(.+)$/);
          if (match) {
            if (!houseNumber && match[1]) houseNumber = match[1];
            if (!streetName && match[2]) streetName = match[2];
          }
        }
      }
    }

    return { unitNumber, houseNumber, streetName, suburb };
  };

  const handleCaptureLocation = async () => {
    clearMessages();

    if (!sessionId) {
      setError('Session ID is required');
      return;
    }

    if (!selectedBlock) {
      setError('Please select a block number first');
      return;
    }

    if (!geocoder) {
      setError('Geocoding service not available');
      return;
    }

    setLoading(true);
    try {
      const location = await getCurrentLocation();

      if (!location) {
        setError('Failed to get current location');
        setLoading(false);
        return;
      }

      setCapturedLocation({ lat: location.lat, lng: location.lng });

      // Get address from coordinates
      const results = await geocoder.geocode({
        location: { lat: location.lat, lng: location.lng }
      });

      if (results.results && results.results.length > 0) {
        const parsedAddress = parseAddressComponents(results.results);
        setAddressFields(parsedAddress);
      } else {
        // If no address found, leave fields empty but still allow manual entry
        setAddressFields({
          unitNumber: '',
          houseNumber: '',
          streetName: '',
          suburb: ''
        });
      }

      // Open the modal for confirmation/editing
      setShowManualEntry(true);

    } catch (err) {
      setError('Failed to capture location');
      setDetailedError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleManualEntry = () => {
    setCapturedLocation(null); // Clear any captured location for purely manual entry
    setAddressFields({
      unitNumber: '',
      houseNumber: '',
      streetName: '',
      suburb: ''
    });
    setShowManualEntry(true);
  };

  const handleInputChange = (field: keyof AddressFields, value: string) => {
    setAddressFields(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!sessionId) {
      setError('Session ID is required');
      return;
    }

    if (!selectedBlock) {
      setError('Please select a block number first');
      return;
    }

    // Require at least house number and street name
    if (!addressFields.houseNumber.trim() || !addressFields.streetName.trim()) {
      setError('Please enter at least house number and street name');
      return;
    }

    setLoading(true);
    try {
      // Format the address from the fields
      const formattedAddress = [
        addressFields.unitNumber ? `Unit ${addressFields.unitNumber},` : '',
        `${addressFields.houseNumber} ${addressFields.streetName}`,
        addressFields.suburb
      ].filter(Boolean).join(' ');

      let userId = null;
      try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        userId = user?.id;
      } catch (userErr) {
        console.warn('Could not get user ID:', userErr);
      }

      const insertData: any = {
        session_id: sessionId,
        block_number: selectedBlock,
        address: formattedAddress,
        created_by: userId
      };

      // Include coordinates if they were captured
      if (capturedLocation) {
        insertData.latitude = capturedLocation.lat;
        insertData.longitude = capturedLocation.lng;
      }

      const { error: insertError } = await supabaseClient.from('not_at_home_addresses')
        .insert([insertData]);

      if (insertError) {
        throw insertError;
      }

      showSuccessMessage('Location recorded successfully');
      setAddressFields({
        unitNumber: '',
        houseNumber: '',
        streetName: '',
        suburb: ''
      });
      setCapturedLocation(null);
      setShowManualEntry(false);
      if (onLocationRecorded) onLocationRecorded();
    } catch (err) {
      setError('Failed to record address');
      setDetailedError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowManualEntry(false);
    setCapturedLocation(null);
    setAddressFields({
      unitNumber: '',
      houseNumber: '',
      streetName: '',
      suburb: ''
    });
  };

  return (
    <div>
      {!showManualEntry ? (
        <div className="button-container">
          <button
            onClick={handleCaptureLocation}
            disabled={loading || !selectedBlock}
            className="record-button location-button"
          >
            <span className="button-icon">📍</span> {loading ? 'Locating...' : 'Record Location'}
          </button>

          <button
            onClick={handleManualEntry}
            disabled={loading || !selectedBlock}
            className="record-button manual-button"
          >
            <span className="button-icon">+</span> Record Manually
          </button>
        </div>
      ) : (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">
                {capturedLocation ? 'Confirm Location' : 'Record Location Manually'}
              </h2>
              <button onClick={handleCloseModal} className="close-button">
                ✕
              </button>
            </div>
            <p className="modal-subtitle">
              {capturedLocation
                ? 'Please confirm or edit the detected address details'
                : 'Enter the address details for this location'}
            </p>

            <form onSubmit={handleManualSubmit} className="address-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="unitNumber" className="form-label">Unit Number</label>
                  <input
                    id="unitNumber"
                    type="text"
                    value={addressFields.unitNumber}
                    onChange={(e) => handleInputChange('unitNumber', e.target.value)}
                    placeholder="Optional"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="houseNumber" className="form-label">House Number</label>
                  <input
                    id="houseNumber"
                    type="text"
                    value={addressFields.houseNumber}
                    onChange={(e) => handleInputChange('houseNumber', e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="streetName" className="form-label">Street Name</label>
                <input
                  id="streetName"
                  type="text"
                  value={addressFields.streetName}
                  onChange={(e) => handleInputChange('streetName', e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="suburb" className="form-label">Suburb</label>
                <input
                  id="suburb"
                  type="text"
                  value={addressFields.suburb}
                  onChange={(e) => handleInputChange('suburb', e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="cancel-button"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !addressFields.houseNumber.trim() || !addressFields.streetName.trim()}
                  className="save-button"
                >
                  {capturedLocation ? 'Confirm & Save' : 'Save Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}
      {detailedError && <div className="detailed-error">{detailedError}</div>}
      {success && <div className="success-message">{success}</div>}

      <style jsx>{`
        .button-container {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        
        .record-button {
          flex: 1;
          padding: 0.75rem 1rem;
          font-size: 0.95rem;
          font-weight: 600;
          border-radius: 0.75rem;
          cursor: pointer;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          height: 3rem;
          border: 1px solid transparent;
        }
        
        .location-button {
          background-color: #10b981;
          color: white;
          box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.3), 0 2px 4px -1px rgba(16, 185, 129, 0.1);
        }
        
        .location-button:hover:not(:disabled) {
          background-color: #059669;
          transform: translateY(-1px);
          box-shadow: 0 6px 8px -1px rgba(16, 185, 129, 0.4);
        }
        
        .manual-button {
          background-color: white;
          border: 1px solid #e2e8f0;
          color: #475569;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        
        .manual-button:hover:not(:disabled) {
          background-color: #f8fafc;
          border-color: #cbd5e1;
          color: #1e293b;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        
        .button-icon {
          font-size: 1.1rem;
          margin-right: 0.5rem;
          margin-bottom: 0;
        }
        
        .record-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
          box-shadow: none !important;
        }
        
        /* Modal styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .modal-content {
          background-color: white;
          border-radius: 0.5rem;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          padding: 1.5rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        
        .modal-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }
        
        .close-button {
          background: transparent;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          color: #6B7280;
        }
        
        .modal-subtitle {
          color: #6B7280;
          font-size: 1rem;
          margin-top: 0.5rem;
          margin-bottom: 1.5rem;
        }
        
        .address-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        
        .form-row {
          display: flex;
          gap: 1rem;
        }
        
        .form-group {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .form-label {
          font-weight: 500;
          margin-bottom: 0.5rem;
          color: #111827;
        }
        
        .form-input {
          padding: 0.75rem;
          border: 1px solid #D1D5DB;
          border-radius: 0.375rem;
          font-size: 1rem;
          width: 100%;
        }
        
        .form-input:focus {
          outline: none;
          border-color: #2563EB;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
        }
        
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 1rem;
        }
        
        .cancel-button {
          padding: 0.75rem 1.5rem;
          background-color: white;
          border: 1px solid #D1D5DB;
          border-radius: 0.375rem;
          font-size: 1rem;
          cursor: pointer;
          color: #111827;
        }
        
        .save-button {
          padding: 0.75rem 1.5rem;
          background-color: #0F172A;
          color: white;
          border: none;
          border-radius: 0.375rem;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
        }
        
        .save-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .error-message {
          color: #ef4444;
          margin-top: 0.75rem;
          font-size: 0.875rem;
        }
        
        .detailed-error {
          color: #6b7280;
          font-size: 0.75rem;
          margin-top: 0.375rem;
        }
        
        .success-message {
          color: #10b981;
          margin-top: 0.75rem;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
};

export default LocationRecorder;
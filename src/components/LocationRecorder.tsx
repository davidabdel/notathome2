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
        return;
      }

      // Get address from coordinates
      const results = await geocoder.geocode({
        location: { lat: location.lat, lng: location.lng }
      });

      if (!results.results?.[0]) {
        setError('Could not determine address from location');
        return;
      }

      const address = results.results[0].formatted_address;

      let userId = null;
      try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        userId = user?.id;
      } catch (userErr) {
        console.warn('Could not get user ID:', userErr);
      }

      const { error: insertError } = await supabaseClient.from('not_at_home_addresses')
        .insert([{ 
          session_id: sessionId,
          block_number: selectedBlock,
          latitude: location.lat,
          longitude: location.lng,
          address: address,
          created_by: userId
        }]);

      if (insertError) {
        throw insertError;
      }

      showSuccessMessage('Location recorded successfully');
      if (onLocationRecorded) onLocationRecorded();
    } catch (err) {
      setError('Failed to record location');
      setDetailedError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleManualEntry = () => {
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

      const { error: insertError } = await supabaseClient.from('not_at_home_addresses')
        .insert([{ 
          session_id: sessionId,
          block_number: selectedBlock,
          address: formattedAddress,
          created_by: userId
        }]);

      if (insertError) {
        throw insertError;
      }

      showSuccessMessage('Address recorded successfully');
      setAddressFields({
        unitNumber: '',
        houseNumber: '',
        streetName: '',
        suburb: ''
      });
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
            <span className="button-icon">📍</span> Record Location
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
              <h2 className="modal-title">Record Location Manually</h2>
              <button onClick={handleCloseModal} className="close-button">
                ✕
              </button>
            </div>
            <p className="modal-subtitle">Enter the address details for this location</p>
            
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
                  Save Location
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
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }
        
        .record-button {
          flex: 1;
          padding: 0.5rem;
          font-size: 0.85rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          background-color: #f9fafb;
          color: #111827;
          cursor: pointer;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          height: 2.25rem;
        }
        
        .location-button {
          background-color: #ecfdf5;
        }
        
        .location-button:hover:not(:disabled) {
          background-color: #d1fae5;
        }
        
        .manual-button {
          background-color: white;
        }
        
        .manual-button:hover:not(:disabled) {
          background-color: #f3f4f6;
        }
        
        .button-icon {
          font-size: 1rem;
          margin-right: 0.375rem;
          margin-bottom: 0;
        }
        
        .record-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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
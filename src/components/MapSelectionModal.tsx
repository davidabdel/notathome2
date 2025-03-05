import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/config';

interface MapSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMap: (mapNumber: number) => void;
  congregationId: string;
}

const MapSelectionModal: React.FC<MapSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectMap,
  congregationId
}) => {
  const [selectedMap, setSelectedMap] = useState<number | null>(null);
  const [mapCount, setMapCount] = useState<number>(35); // Default to 35 maps
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && congregationId) {
      fetchMapCount();
    }
  }, [isOpen, congregationId]);

  const fetchMapCount = async () => {
    try {
      setLoading(true);
      
      // Try to get the actual count of maps from the territory_maps table
      const { data, error } = await supabase
        .from('territory_maps')
        .select('id')
        .eq('congregation_id', congregationId)
        .eq('status', 'active');
      
      if (!error && data) {
        // If we have maps, use the actual count
        setMapCount(Math.max(data.length, 35)); // Ensure at least 35 maps
      }
    } catch (err) {
      console.error('Error fetching map count:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMapSelect = (mapNumber: number) => {
    setSelectedMap(mapNumber);
  };

  const handleConfirm = () => {
    if (selectedMap !== null) {
      onSelectMap(selectedMap);
    }
  };

  if (!isOpen) return null;

  // Generate map number buttons (5 columns x 7 rows = 35 maps)
  const renderMapButtons = () => {
    const buttons = [];
    for (let i = 1; i <= mapCount; i++) {
      buttons.push(
        <button
          key={i}
          className={`map-button ${selectedMap === i ? 'selected' : ''}`}
          onClick={() => handleMapSelect(i)}
        >
          {i}
        </button>
      );
    }
    return buttons;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-button" onClick={onClose}>
          ×
        </button>
        
        <h2>Create New Session</h2>
        <p className="subtitle">Select a map number for this session</p>
        
        <div className="map-grid">
          {renderMapButtons()}
        </div>
        
        <div className="modal-actions">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="confirm-button" 
            onClick={handleConfirm}
            disabled={selectedMap === null}
          >
            Create Session
          </button>
        </div>
      </div>
      
      <style jsx>{`
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
          padding: 1.5rem;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
        }
        
        .close-button {
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6b7280;
        }
        
        h2 {
          margin-top: 0;
          margin-bottom: 0.5rem;
          font-size: 1.5rem;
          font-weight: 600;
          color: #111827;
        }
        
        .subtitle {
          color: #6b7280;
          margin-bottom: 1.5rem;
        }
        
        .map-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }
        
        .map-button {
          background-color: white;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          padding: 0.75rem 0;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .map-button:hover {
          background-color: #f3f4f6;
        }
        
        .map-button.selected {
          background-color: #d9f99d;
          border-color: #84cc16;
          color: #365314;
          font-weight: 500;
        }
        
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }
        
        .cancel-button {
          background-color: white;
          border: 1px solid #d1d5db;
          color: #374151;
          font-size: 0.875rem;
          font-weight: 500;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .cancel-button:hover {
          background-color: #f3f4f6;
        }
        
        .confirm-button {
          background-color: #d9f99d;
          border: none;
          color: #365314;
          font-size: 0.875rem;
          font-weight: 500;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .confirm-button:hover:not(:disabled) {
          background-color: #bef264;
        }
        
        .confirm-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default MapSelectionModal; 
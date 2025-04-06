import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/config';

interface MapSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMap: (mapNumber: number) => void;
  congregationId: string;
}

const EnhancedMapSelectionModal: React.FC<MapSelectionModalProps> = ({
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
      console.log('EnhancedMapSelectionModal: Modal opened, fetching map count');
      // Reset selected map when modal opens
      setSelectedMap(null);
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
    console.log('EnhancedMapSelectionModal: Selected map:', mapNumber);
    setSelectedMap(mapNumber);
  };

  const handleConfirm = () => {
    if (selectedMap !== null) {
      console.log('EnhancedMapSelectionModal: Confirming map selection:', selectedMap);
      onSelectMap(selectedMap);
    }
  };

  if (!isOpen) return null;
  
  console.log('EnhancedMapSelectionModal: Rendering with selectedMap:', selectedMap, 'mapCount:', mapCount);

  // Generate map number buttons (5 columns x 7 rows = 35 maps)
  const renderMapButtons = () => {
    const buttons = [];
    for (let i = 1; i <= mapCount; i++) {
      buttons.push(
        <button
          key={i}
          className={`enhanced-map-button ${selectedMap === i ? 'enhanced-selected' : ''}`}
          onClick={() => handleMapSelect(i)}
        >
          {i}
        </button>
      );
    }
    return buttons;
  };

  return (
    <div className="enhanced-modal-overlay">
      <div className="enhanced-modal-content">
        <button className="enhanced-close-button" onClick={onClose}>
          ×
        </button>
        
        <h2>Create New Session</h2>
        <p className="enhanced-subtitle">Select a map number for this session</p>
        
        <div className="enhanced-map-grid">
          {renderMapButtons()}
        </div>
        
        <div className="enhanced-modal-actions">
          <button className="enhanced-cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="enhanced-confirm-button" 
            onClick={handleConfirm}
            disabled={selectedMap === null}
          >
            Create Session
          </button>
        </div>
      </div>
      
      <style jsx global>{`
        .enhanced-modal-overlay {
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
        
        .enhanced-modal-content {
          background-color: white;
          border-radius: 0.5rem;
          padding: 1.5rem;
          width: 95%;
          max-width: 550px;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }
        
        .enhanced-close-button {
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
        
        .enhanced-subtitle {
          color: #6b7280;
          margin-bottom: 1.5rem;
        }
        
        .enhanced-map-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }
        
        .enhanced-map-button {
          background-color: #f9fafb;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          padding: 0.5rem 0;
          font-size: 1.25rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          height: 4rem;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
        }
        
        .enhanced-map-button:hover {
          background-color: #f3f4f6;
          border-color: #9ca3af;
        }
        
        .enhanced-map-button.enhanced-selected {
          background-color: #4f46e5;
          border-color: #4f46e5;
          color: white;
          font-weight: 600;
        }
        
        .enhanced-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }
        
        .enhanced-cancel-button {
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
        
        .enhanced-cancel-button:hover {
          background-color: #f3f4f6;
        }
        
        .enhanced-confirm-button {
          background-color: #4f46e5;
          border: none;
          color: white;
          font-size: 0.875rem;
          font-weight: 500;
          padding: 0.75rem 1.25rem;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .enhanced-confirm-button:hover:not(:disabled) {
          background-color: #4338ca;
        }
        
        .enhanced-confirm-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        @media (max-width: 640px) {
          .enhanced-map-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          
          .enhanced-map-button {
            height: 4.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default EnhancedMapSelectionModal; 
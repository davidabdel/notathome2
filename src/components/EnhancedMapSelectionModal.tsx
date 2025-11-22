import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/config';
import { X, MapPin, Loader2 } from 'lucide-react';

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
          <X size={24} />
        </button>

        <div className="modal-header">
          <div className="icon-wrapper">
            <MapPin size={24} />
          </div>
          <div>
            <h2>Create New Session</h2>
            <p className="enhanced-subtitle">Select a map number for this session</p>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <Loader2 className="animate-spin" size={32} />
          </div>
        ) : (
          <div className="enhanced-map-grid">
            {renderMapButtons()}
          </div>
        )}

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
          backdrop-filter: blur(4px);
        }
        
        .enhanced-modal-content {
          background-color: var(--color-bg-card);
          border-radius: var(--radius-xl);
          padding: var(--space-6);
          width: 95%;
          max-width: 550px;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          box-shadow: var(--shadow-xl);
          border: 1px solid var(--color-border);
        }
        
        .enhanced-close-button {
          position: absolute;
          top: var(--space-4);
          right: var(--space-4);
          background: none;
          border: none;
          cursor: pointer;
          color: var(--color-text-tertiary);
          padding: var(--space-1);
          border-radius: var(--radius-md);
          transition: all 0.2s;
        }
        
        .enhanced-close-button:hover {
          background-color: var(--color-bg-surface);
          color: var(--color-text-main);
        }
        
        .modal-header {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          margin-bottom: var(--space-6);
        }
        
        .icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-lg);
          background-color: #eff6ff;
          color: var(--color-primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        h2 {
          margin: 0 0 var(--space-1) 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-text-main);
        }
        
        .enhanced-subtitle {
          color: var(--color-text-secondary);
          margin: 0;
          font-size: 0.875rem;
        }
        
        .loading-container {
          display: flex;
          justify-content: center;
          padding: var(--space-8);
          color: var(--color-primary);
        }
        
        .enhanced-map-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: var(--space-3);
          margin-bottom: var(--space-6);
        }
        
        .enhanced-map-button {
          background-color: var(--color-bg-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-2) 0;
          font-size: 1.125rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          height: 3.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          color: var(--color-text-main);
        }
        
        .enhanced-map-button:hover {
          border-color: var(--color-primary-light);
          color: var(--color-primary);
          transform: translateY(-1px);
        }
        
        .enhanced-map-button.enhanced-selected {
          background-color: var(--color-primary);
          border-color: var(--color-primary);
          color: white;
          box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
        }
        
        .enhanced-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--space-3);
        }
        
        .enhanced-cancel-button {
          background-color: transparent;
          border: 1px solid var(--color-border);
          color: var(--color-text-secondary);
          font-size: 0.875rem;
          font-weight: 600;
          padding: 0.625rem 1rem;
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .enhanced-cancel-button:hover {
          background-color: var(--color-bg-surface);
          color: var(--color-text-main);
        }
        
        .enhanced-confirm-button {
          background-color: var(--color-primary);
          border: none;
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
          padding: 0.625rem 1.25rem;
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .enhanced-confirm-button:hover:not(:disabled) {
          background-color: var(--color-primary-hover);
          transform: translateY(-1px);
        }
        
        .enhanced-confirm-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @media (max-width: 640px) {
          .enhanced-map-grid {
            grid-template-columns: repeat(4, 1fr);
          }
          
          .enhanced-map-button {
            height: 3rem;
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default EnhancedMapSelectionModal;
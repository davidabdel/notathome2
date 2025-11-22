import React, { useState, useEffect } from 'react';
import { X, Settings, MapPin } from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen,
    onClose
}) => {
    const [locationEnabled, setLocationEnabled] = useState(true);

    useEffect(() => {
        // Check if location permission is already granted or stored in local storage
        const checkLocationSettings = async () => {
            const storedSetting = localStorage.getItem('locationServicesEnabled');
            if (storedSetting !== null) {
                setLocationEnabled(storedSetting === 'true');
            } else {
                // Default to true if not set
                setLocationEnabled(true);
            }
        };

        if (isOpen) {
            checkLocationSettings();
        }
    }, [isOpen]);

    const toggleLocation = () => {
        const newState = !locationEnabled;
        setLocationEnabled(newState);
        localStorage.setItem('locationServicesEnabled', String(newState));
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="close-button" onClick={onClose}>
                    <X size={24} />
                </button>

                <div className="modal-header">
                    <div className="icon-wrapper">
                        <Settings size={24} />
                    </div>
                    <div>
                        <h2>Settings</h2>
                        <p className="subtitle">Manage your app preferences</p>
                    </div>
                </div>

                <div className="settings-list">
                    <div className="setting-item">
                        <div className="setting-info">
                            <div className="setting-label">
                                <MapPin size={18} className="setting-icon" />
                                <span>Location Services</span>
                            </div>
                            <p className="setting-description">
                                Allow the app to access your location for mapping features.
                            </p>
                        </div>
                        <button
                            className={`toggle-switch ${locationEnabled ? 'active' : ''}`}
                            onClick={toggleLocation}
                            aria-label="Toggle location services"
                        >
                            <div className="toggle-thumb"></div>
                        </button>
                    </div>
                </div>

                <div className="modal-actions">
                    <button className="btn-primary" onClick={onClose}>
                        Done
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
          backdrop-filter: blur(4px);
        }
        
        .modal-content {
          background-color: var(--color-bg-card);
          border-radius: var(--radius-xl);
          padding: var(--space-6);
          width: 90%;
          max-width: 400px;
          position: relative;
          box-shadow: var(--shadow-xl);
          border: 1px solid var(--color-border);
        }
        
        .close-button {
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
        
        .close-button:hover {
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
        
        .subtitle {
          color: var(--color-text-secondary);
          margin: 0;
          font-size: 0.875rem;
        }
        
        .settings-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          margin-bottom: var(--space-6);
        }
        
        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-3);
          background-color: var(--color-bg-surface);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
        }
        
        .setting-info {
          flex: 1;
          margin-right: var(--space-4);
        }
        
        .setting-label {
          display: flex;
          align-items: center;
          font-weight: 600;
          color: var(--color-text-main);
          margin-bottom: var(--space-1);
        }
        
        .setting-icon {
          margin-right: var(--space-2);
          color: var(--color-text-secondary);
        }
        
        .setting-description {
          margin: 0;
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          line-height: 1.4;
        }
        
        .toggle-switch {
          width: 48px;
          height: 28px;
          background-color: var(--color-border);
          border-radius: 14px;
          border: none;
          position: relative;
          cursor: pointer;
          transition: background-color 0.2s;
          flex-shrink: 0;
          padding: 0;
        }
        
        .toggle-switch.active {
          background-color: var(--color-primary);
        }
        
        .toggle-thumb {
          width: 24px;
          height: 24px;
          background-color: white;
          border-radius: 50%;
          position: absolute;
          top: 2px;
          left: 2px;
          transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        
        .toggle-switch.active .toggle-thumb {
          transform: translateX(20px);
        }
        
        .modal-actions {
          display: flex;
          justify-content: flex-end;
        }
        
        .btn-primary {
          background-color: var(--color-primary);
          color: white;
          border: none;
          border-radius: var(--radius-lg);
          padding: 0.625rem 1.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-primary:hover {
          background-color: var(--color-primary-hover);
          transform: translateY(-1px);
        }
      `}</style>
        </div>
    );
};

export default SettingsModal;

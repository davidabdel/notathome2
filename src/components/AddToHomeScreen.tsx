import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    MSStream?: any;
  }
}

export default function AddToHomeScreen() {
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    // Check if device is iOS - MSStream check helps differentiate between iOS and Windows Phone
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window.MSStream);
    setIsIOS(isIOSDevice);

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      setDeferredPrompt(null);
      setShowInstallButton(false);
    } catch (err) {
      console.error('Error installing PWA:', err);
    }
  };

  if (!isIOS && !showInstallButton) return null;

  return (
    <div className="a2hs-container">
      {isIOS ? (
        <div className="ios-instructions">
          {!showIOSInstructions ? (
            <button 
              onClick={() => setShowIOSInstructions(true)}
              className="install-button"
            >
              Add to Home Screen
            </button>
          ) : (
            <div className="instructions-content">
              <h3>Install this app on your iPhone:</h3>
              <ol>
                <li>Tap the Share button <span className="icon">⎋</span></li>
                <li>Scroll down and tap "Add to Home Screen" <span className="icon">+</span></li>
                <li>Tap "Add" to install</li>
              </ol>
              <button 
                onClick={() => setShowIOSInstructions(false)}
                className="close-button"
              >
                Close
              </button>
            </div>
          )}
        </div>
      ) : (
        <button 
          onClick={handleInstallClick}
          className="install-button"
        >
          Install App
        </button>
      )}

      <style jsx>{`
        .a2hs-container {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          width: 90%;
          max-width: 400px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          padding: 16px;
        }

        .ios-instructions {
          text-align: center;
        }

        .instructions-content {
          text-align: left;
        }

        .instructions-content h3 {
          margin: 0 0 16px;
          font-size: 1.1rem;
          color: #1f2937;
        }

        .instructions-content ol {
          margin: 0;
          padding-left: 24px;
          color: #4b5563;
        }

        .instructions-content li {
          margin-bottom: 12px;
          line-height: 1.5;
        }

        .icon {
          display: inline-block;
          margin: 0 4px;
          font-weight: bold;
        }

        .install-button {
          width: 100%;
          padding: 12px 24px;
          background-color: #2563eb;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .install-button:hover {
          background-color: #1d4ed8;
        }

        .close-button {
          width: 100%;
          padding: 8px 16px;
          margin-top: 16px;
          background-color: #e5e7eb;
          color: #4b5563;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .close-button:hover {
          background-color: #d1d5db;
        }

        @media (max-width: 640px) {
          .a2hs-container {
            bottom: 16px;
            width: calc(100% - 32px);
          }
        }
      `}</style>
    </div>
  );
} 
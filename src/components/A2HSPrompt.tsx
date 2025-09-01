import React, { useState, useEffect } from 'react';
import { FaPlus, FaHome, FaTimes } from 'react-icons/fa';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface WindowEventMap {
    'beforeinstallprompt': BeforeInstallPromptEvent;
  }
}

const A2HSPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if it's iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // For iOS, check if the app is already installed
    if (isIOSDevice) {
      // Check if the app is in standalone mode (already installed)
      const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                                (window.navigator as any).standalone || 
                                document.referrer.includes('ios-app://');
      
      // Only show the prompt if not already installed and not recently dismissed
      const hasPromptBeenDismissed = localStorage.getItem('a2hsPromptDismissed');
      const dismissedTime = hasPromptBeenDismissed ? parseInt(hasPromptBeenDismissed, 10) : 0;
      const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
      
      if (!isInStandaloneMode && (!hasPromptBeenDismissed || Date.now() - dismissedTime > oneWeekInMs)) {
        // Show iOS instructions after a delay
        setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
      }
    } else {
      // For other browsers, listen for the beforeinstallprompt event
      const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        // Stash the event so it can be triggered later
        setDeferredPrompt(e);
        
        // Check if the prompt has been dismissed recently
        const hasPromptBeenDismissed = localStorage.getItem('a2hsPromptDismissed');
        const dismissedTime = hasPromptBeenDismissed ? parseInt(hasPromptBeenDismissed, 10) : 0;
        const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
        
        if (!hasPromptBeenDismissed || Date.now() - dismissedTime > oneWeekInMs) {
          // Show the prompt after a delay
          setTimeout(() => {
            setShowPrompt(true);
          }, 3000);
        }
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt && !isIOS) return;

    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      // We no longer need the prompt. Clear it up
      setDeferredPrompt(null);
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
        // Store the dismissal time
        localStorage.setItem('a2hsPromptDismissed', Date.now().toString());
      }
    }
    
    // Hide the prompt
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    // Store the dismissal time
    localStorage.setItem('a2hsPromptDismissed', Date.now().toString());
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="a2hs-prompt">
      <div className="a2hs-content">
        <div className="a2hs-icon">
          <FaHome />
        </div>
        <div className="a2hs-message">
          {isIOS ? (
            <>
              <h3>Add to Home Screen</h3>
              <p>Install this app on your home screen for quick and easy access.</p>
              <div className="ios-instructions">
                <p>Tap <FaPlus /> and then "Add to Home Screen"</p>
              </div>
            </>
          ) : (
            <>
              <h3>Add to Home Screen</h3>
              <p>Install this app on your device for quick and easy access when you're on the go.</p>
              <button onClick={handleInstallClick} className="a2hs-button">
                Install App
              </button>
            </>
          )}
        </div>
        <button onClick={handleDismiss} className="a2hs-dismiss">
          <FaTimes />
        </button>
      </div>

      <style jsx>{`
        .a2hs-prompt {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background-color: white;
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          padding: 16px;
          border-top-left-radius: 16px;
          border-top-right-radius: 16px;
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        .a2hs-content {
          display: flex;
          align-items: center;
          max-width: 600px;
          margin: 0 auto;
          position: relative;
        }

        .a2hs-icon {
          background-color: #1e293b;
          color: white;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          margin-right: 16px;
          flex-shrink: 0;
        }

        .a2hs-message {
          flex: 1;
        }

        .a2hs-message h3 {
          margin: 0 0 4px 0;
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
        }

        .a2hs-message p {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #4b5563;
        }

        .ios-instructions {
          background-color: #f3f4f6;
          padding: 10px;
          border-radius: 8px;
          margin-top: 8px;
        }

        .ios-instructions p {
          margin: 0;
          display: flex;
          align-items: center;
          font-size: 14px;
          color: #4b5563;
        }

        .ios-instructions p :global(svg) {
          margin: 0 4px;
        }

        .a2hs-button {
          background-color: #2563eb;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .a2hs-button:hover {
          background-color: #1d4ed8;
        }

        .a2hs-dismiss {
          background: none;
          border: none;
          color: #9ca3af;
          font-size: 20px;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: absolute;
          top: 0;
          right: 0;
        }

        .a2hs-dismiss:hover {
          color: #6b7280;
        }

        @media (max-width: 480px) {
          .a2hs-prompt {
            padding: 12px;
          }

          .a2hs-icon {
            width: 40px;
            height: 40px;
            font-size: 20px;
            margin-right: 12px;
          }

          .a2hs-message h3 {
            font-size: 16px;
          }

          .a2hs-message p {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
};

export default A2HSPrompt; 
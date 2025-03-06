import React, { useState, useEffect } from 'react';
import { FaPlus, FaShareAlt, FaTimes } from 'react-icons/fa';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface WindowEventMap {
    'beforeinstallprompt': BeforeInstallPromptEvent;
  }
  interface Window {
    MSStream?: any;
  }
}

export default function AddToHomeScreen() {
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already in standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
    
    if (standalone) {
      // App is already installed, don't show the prompt
      return;
    }

    // Check if device is iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window.MSStream);
    setIsIOS(isIOSDevice);

    // Check if we should show the prompt based on previous dismissals
    const checkPromptHistory = () => {
      const lastPrompt = localStorage.getItem('a2hsLastPrompt');
      if (!lastPrompt) {
        // First visit, set a delay before showing
        setTimeout(() => setShowPrompt(true), 30000); // 30 seconds delay for first visit
        return;
      }

      const lastPromptTime = parseInt(lastPrompt, 10);
      const now = Date.now();
      const daysSinceLastPrompt = (now - lastPromptTime) / (1000 * 60 * 60 * 24);
      
      const dismissCount = parseInt(localStorage.getItem('a2hsDismissCount') || '0', 10);
      
      // Gradually increase the delay between prompts based on dismiss count
      let daysToWait = 1;
      if (dismissCount === 1) daysToWait = 3;
      if (dismissCount === 2) daysToWait = 7;
      if (dismissCount >= 3) daysToWait = 30;
      
      if (daysSinceLastPrompt >= daysToWait) {
        // Enough time has passed, show the prompt again
        setTimeout(() => setShowPrompt(true), 5000); // 5 seconds delay for returning visitors
      }
    };

    // For non-iOS devices, listen for the beforeinstallprompt event
    if (!isIOSDevice) {
      const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
        e.preventDefault();
        setDeferredPrompt(e);
        checkPromptHistory();
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    } else {
      // For iOS, check prompt history directly
      checkPromptHistory();
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        // Reset dismiss count on acceptance
        localStorage.setItem('a2hsDismissCount', '0');
      } else {
        console.log('User dismissed the install prompt');
        incrementDismissCount();
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (err) {
      console.error('Error installing PWA:', err);
    }
  };

  const handleDismiss = () => {
    incrementDismissCount();
    setShowPrompt(false);
  };

  const incrementDismissCount = () => {
    // Update last prompt time
    localStorage.setItem('a2hsLastPrompt', Date.now().toString());
    
    // Increment dismiss count
    const currentCount = parseInt(localStorage.getItem('a2hsDismissCount') || '0', 10);
    localStorage.setItem('a2hsDismissCount', (currentCount + 1).toString());
  };

  // Don't show if already in standalone mode or if prompt is hidden
  if (isStandalone || !showPrompt) return null;

  return (
    <div className="a2hs-container">
      <div className="a2hs-content">
        <div className="a2hs-message">
          <h3>Add to Home Screen</h3>
          {isIOS ? (
            <>
              <p>Install this app on your iPhone for quick access:</p>
              <ol className="ios-steps">
                <li>
                  <span className="step-icon"><FaShareAlt /></span>
                  <span>Tap the Share button</span>
                </li>
                <li>
                  <span className="step-icon"><FaPlus /></span>
                  <span>Tap "Add to Home Screen"</span>
                </li>
                <li>
                  <span>Tap "Add" in the top right</span>
                </li>
              </ol>
            </>
          ) : (
            <>
              <p>Install this app on your device for quick access when you're on the go.</p>
              <button onClick={handleInstallClick} className="install-button">
                Install App
              </button>
            </>
          )}
        </div>
        <button onClick={handleDismiss} className="dismiss-button" aria-label="Dismiss">
          <FaTimes />
        </button>
      </div>

      <style jsx>{`
        .a2hs-container {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background-color: white;
          box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          padding: 16px;
          border-top-left-radius: 16px;
          border-top-right-radius: 16px;
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .a2hs-content {
          position: relative;
          max-width: 600px;
          margin: 0 auto;
          padding-right: 24px;
        }

        .a2hs-message h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
        }

        .a2hs-message p {
          margin: 0 0 16px 0;
          font-size: 14px;
          color: #4b5563;
        }

        .ios-steps {
          margin: 0;
          padding: 0 0 0 16px;
          list-style-position: outside;
        }

        .ios-steps li {
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          font-size: 14px;
          color: #4b5563;
        }

        .step-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-right: 8px;
          color: #2563eb;
        }

        .install-button {
          background-color: #2563eb;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .install-button:hover {
          background-color: #1d4ed8;
        }

        .dismiss-button {
          position: absolute;
          top: 0;
          right: 0;
          background: none;
          border: none;
          color: #9ca3af;
          font-size: 18px;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .dismiss-button:hover {
          color: #6b7280;
        }

        @media (max-width: 480px) {
          .a2hs-container {
            padding: 12px;
          }

          .a2hs-message h3 {
            font-size: 16px;
          }

          .a2hs-message p,
          .ios-steps li {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
} 
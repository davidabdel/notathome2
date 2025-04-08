import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useEffect } from 'react';
import AddToHomeScreen from '../components/AddToHomeScreen';
import { setupExpirationChecker } from '../utils/sessionExpiration';
import '../styles/globals.css';
import { loadEmailConfigFromDatabase } from '../utils/load-env-config';

// Load email configuration on server startup
if (typeof window === 'undefined') {
  loadEmailConfigFromDatabase()
    .catch(err => console.error('Error loading email config:', err));
}

function MyApp({ Component, pageProps }: AppProps) {
  // Set up session expiration checker
  useEffect(() => {
    // Check for expired sessions every 15 minutes
    const clearExpirationChecker = setupExpirationChecker(15);
    
    // Clean up when component unmounts
    return () => {
      clearExpirationChecker();
    };
  }, []);
  
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="theme-color" content="#10b981" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Not at Home" />
        
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512x512.png" />
      </Head>
      
      <Component {...pageProps} />
      <AddToHomeScreen />
      
      <style jsx global>{`
        /* Hide browser UI in standalone mode */
        @media all and (display-mode: standalone) {
          header {
            padding-top: env(safe-area-inset-top);
          }
          
          /* Add bottom spacing for iOS home indicator */
          main {
            padding-bottom: env(safe-area-inset-bottom);
          }
        }
      `}</style>
    </>
  );
}

export default MyApp; 
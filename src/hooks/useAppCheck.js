import { useEffect, useState } from 'react';
import { initializeAppCheckForClient } from '../firebase/firebaseConfig';

export function useAppCheck() {
  const [isAppCheckInitialized, setIsAppCheckInitialized] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Only run on the client side
    if (typeof window === 'undefined') return;
    
    try {
      // Initialize App Check
      const appCheck = initializeAppCheckForClient();
      
      if (appCheck) {
        setIsAppCheckInitialized(true);
      } else {
        setError('Failed to initialize App Check');
      }
    } catch (err) {
      console.error('Error initializing App Check:', err);
      setError(err.message);
    }
    
    return () => {
      // Cleanup if necessary
    };
  }, []);

  return { isAppCheckInitialized, error };
} 
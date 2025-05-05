// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize App Check only on the client side

let appCheckInstance = null;

export const initializeAppCheckForClient = () => {
  if (appCheckInstance) {
    return appCheckInstance;
  }
  // Ensure this runs only on client
  if (typeof window !== 'undefined') {
    // Check if the environment variable is set
    if (!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
      console.error("App Check Error: NEXT_PUBLIC_RECAPTCHA_SITE_KEY environment variable is not set.");
      return null; // Or throw an error
    }

    try {
      // Pass your reCAPTCHA v3 site key (from Google Cloud Console) here.
      // It's crucial this key is stored in an environment variable.
      appCheckInstance = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
        // Optional: default assumes true, but you can set false for environments
        // where App Check should be disabled (e.g., local testing without tokens)
        isTokenAutoRefreshEnabled: true
      });
      console.log("App Check initialized successfully.");
      return appCheckInstance;
    } catch (e) {
      console.error("Error initializing App Check provider:", e);
      return null; // Or handle error appropriately
    }
  }
  return null;
};

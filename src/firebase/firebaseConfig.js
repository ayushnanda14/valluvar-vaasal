// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// console.log("Firebase API Key Used:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
// console.log("reCAPTCHA Site Key Used:", process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY);

// Your web app's Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize Firebase Authentication and other services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// --- App Check Initialization ---
let appCheckInstance = null; // Variable to store the App Check instance

// This function initializes App Check. It should be called once on the client-side.
export const initializeAppCheckForClient = () => {
  // Prevent re-initialization
  if (appCheckInstance) {
    return appCheckInstance;
  }

  // Ensure this code runs only in the browser
  if (typeof window !== 'undefined') {
    // For local development ONLY: Enable debug token generation.
    // This line MUST be executed BEFORE initializeAppCheck() is called.
    if (process.env.NODE_ENV === 'development') {
      console.log("App Check: Development mode detected. Enabling debug token logging.");
      // IMPORTANT: The 'self' keyword is used here as per Firebase documentation for debug tokens.
      // @ts-ignore
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }

    // Check if the reCAPTCHA site key environment variable is set
    if (!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
      console.error("App Check Error: The NEXT_PUBLIC_RECAPTCHA_SITE_KEY environment variable is not set. App Check will not be initialized.");
      return null; // Stop initialization if the key is missing
    }

    try {
      // Initialize App Check with your reCAPTCHA v3 Site Key
      appCheckInstance = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
        isTokenAutoRefreshEnabled: true // Keep tokens refreshed automatically
      });
      console.log("Firebase App Check initialized successfully.", appCheckInstance);
      return appCheckInstance;
    } catch (error) {
      console.error("Firebase App Check: Error during initialization -", error);
      // appCheckInstance will remain null
      return null;
    }
  }
  return null;
};

// Export the app instance for use in other parts of the application
export { app };

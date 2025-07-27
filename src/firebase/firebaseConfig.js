import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Configure auth persistence
setPersistence(auth, browserLocalPersistence);

// --- App Check ---------------------------------------------------------
// In local/dev environments we **skip** real App Check entirely.
// This prevents noisy console errors and avoids the need for a
// reCAPTCHA site‑key on localhost/127.0.0.1.
let appCheckInstance = null;
export const initializeAppCheckForClient = () => {
  if (appCheckInstance || typeof window === 'undefined') return appCheckInstance;

  // 🚫  Skip in non‑production builds
  if (process.env.NODE_ENV !== 'production') {
    console.info('[AppCheck] Skipped – NODE_ENV is not "production"');
    return null;
  }

  const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!SITE_KEY) {
    console.warn('[AppCheck] NEXT_PUBLIC_RECAPTCHA_SITE_KEY missing – AppCheck disabled');
    return null;
  }

  appCheckInstance = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(SITE_KEY),
    isTokenAutoRefreshEnabled: true
  });
  console.info('[AppCheck] reCAPTCHA v3 initialised');
  return appCheckInstance;
};

export { app };
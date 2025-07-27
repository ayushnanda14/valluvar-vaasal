import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// --- 📌 Single RecaptchaVerifier instance (per page load) -------------
let recaptchaVerifierSingleton = null;
let recaptchaWidgetId = null;

function getOrCreateRecaptcha(containerId) {
  if (typeof window === 'undefined') return null; // SSR safety

  if (recaptchaVerifierSingleton) return recaptchaVerifierSingleton;

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`[Auth] reCAPTCHA container #${containerId} not found`);
    return null;
  }

  recaptchaVerifierSingleton = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => console.debug('[Auth] reCAPTCHA solved'),
    'expired-callback': () => console.warn('[Auth] reCAPTCHA expired – will refresh on next verify')
  });

  recaptchaVerifierSingleton.render().then(id => (recaptchaWidgetId = id));
  return recaptchaVerifierSingleton;
}

// ---------------------------------------------------------------------
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // ---- 🔐  Auth helpers -------------------------------------------------
  const signupWithEmail = async (email, password, displayName, roles = ['client']) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName });
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName,
      roles,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return user;
  };

  const sendVerificationCode = async (phoneNumber, containerId) => {
    const verifier = getOrCreateRecaptcha(containerId);
    if (!verifier) throw new Error('reCAPTCHA failed to initialise');

    try {
      return await signInWithPhoneNumber(auth, phoneNumber, verifier);
    } catch (err) {
      const map = {
        'auth/invalid-app-credential': 'Invalid app credential – is the API key restricted or the app opened from an authorised domain?',
        'auth/operation-not-allowed': 'Phone auth is not enabled for this Firebase project',
        'auth/quota-exceeded': 'SMS quota exceeded – try again later',
        'auth/captcha-check-failed': `reCAPTCHA check failed. Verify that:
• The domain (e.g. http://127.0.0.1) is listed under Authentication → Settings → Authorised domains in Firebase.
• Third‑party cookies aren\'t blocked in the browser.
• No ad/script‑blocker is hiding www.gstatic.com/recaptcha/ assets.`
      };
      throw new Error(map[err.code] || err.message);
    }
  };

  const verifyCodeAndSignUp = async (confirmationResult, code, displayName, roles = ['client']) => {
    const { user } = await confirmationResult.confirm(code);
    if (displayName) await updateProfile(user, { displayName });

    const docRef = doc(db, 'users', user.uid);
    if (!(await getDoc(docRef)).exists()) {
      await setDoc(docRef, {
        uid: user.uid,
        phoneNumber: user.phoneNumber,
        displayName: displayName || user.displayName || 'User',
        roles,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    return user;
  };

  const loginWithEmail = (email, pw) => signInWithEmailAndPassword(auth, email, pw);
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const { user } = await signInWithPopup(auth, provider);
    const ref = doc(db, 'users', user.uid);
    if (!(await getDoc(ref)).exists()) {
      await setDoc(ref, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        roles: ['client'],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    return user;
  };

  const logout = () => signOut(auth);
  const resetPassword = email => sendPasswordResetEmail(auth, email);

  const hasRole = async role => {
    if (!currentUser) return false;
    const snap = await getDoc(doc(db, 'users', currentUser.uid));
    return snap.exists() && (snap.data().roles || []).includes(role);
  };

  // Restore getAllUsers function
  const getAllUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef);
      const querySnapshot = await getDocs(q);
      
      const users = [];
      querySnapshot.forEach((doc) => {
        users.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  };

  useEffect(() => {
    // Mark that we're on the client side
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Only set up auth listeners on the client side
    if (!isClient) return;

    // Set up auth state listener
    const unsub = onAuthStateChanged(auth, async user => {
      console.log('Auth state changed:', user ? 'User found' : 'No user');
      
      setCurrentUser(user);
      
      if (user) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          const roles = snap.exists() ? snap.data().roles || [] : [];
          console.log('User roles loaded:', roles);
          setUserRoles(roles);
        } catch (error) {
          console.error('Error fetching user roles:', error);
          setUserRoles([]);
        }
      } else {
        console.log('No user, clearing roles');
        setUserRoles([]);
      }
      
      setLoading(false);
      setAuthInitialized(true);
    });

    // Also check if there's already a user session
    const checkCurrentUser = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          console.log('Found existing user session:', currentUser.uid);
          setCurrentUser(currentUser);
          
          const snap = await getDoc(doc(db, 'users', currentUser.uid));
          const roles = snap.exists() ? snap.data().roles || [] : [];
          setUserRoles(roles);
        }
      } catch (error) {
        console.error('Error checking current user:', error);
      }
    };
    
    checkCurrentUser();
    
    return () => unsub();
  }, [isClient]);

  const value = {
    currentUser,
    userRoles,
    loading: isClient ? loading : true,
    authInitialized: isClient ? authInitialized : false,
    signupWithEmail,
    sendVerificationCode,
    verifyCodeAndSignUp,
    loginWithEmail,
    loginWithGoogle,
    logout,
    resetPassword,
    hasRole,
    getAllUsers
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 👉 Export the singleton‑helper so other modules (e.g. Login page) can grab
// the already‑rendered invisible reCAPTCHA.
export { getOrCreateRecaptcha };
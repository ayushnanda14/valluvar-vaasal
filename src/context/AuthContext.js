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
  PhoneAuthProvider,
  signInWithPhoneNumber,
  RecaptchaVerifier
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

export function useAuth() {
  return useContext(AuthContext);
}

// Utility: singleton invisible reCAPTCHA verifier for phone auth
// Keep track of the current verifier and its associated container ID at the module level
let currentRecaptchaVerifier = null;
let currentRecaptchaContainerId = null;

// Debug function to check reCAPTCHA state
function debugRecaptchaState() {
  console.log('[debugRecaptchaState] Current verifier:', currentRecaptchaVerifier);
  console.log('[debugRecaptchaState] Current container ID:', currentRecaptchaContainerId);
  if (currentRecaptchaContainerId) {
    const container = document.getElementById(currentRecaptchaContainerId);
    console.log('[debugRecaptchaState] Container in DOM:', container);
    console.log('[debugRecaptchaState] Container HTML:', container?.innerHTML);
  }
}

export function getOrCreateRecaptcha(containerId) { // Made containerId mandatory
  if (typeof window === 'undefined') return null;

  console.log(`[getOrCreateRecaptcha] Called with containerId: ${containerId}`);
  debugRecaptchaState();

  // If a verifier exists but is for a different container, 
  // or if the container element for the old verifier is gone, clear the old one.
  if (currentRecaptchaVerifier) {
    console.log(`[getOrCreateRecaptcha] Existing verifier found for container: ${currentRecaptchaContainerId}`);
    
    if (currentRecaptchaContainerId !== containerId || !document.getElementById(currentRecaptchaContainerId)) {
      console.log(`[getOrCreateRecaptcha] Clearing old verifier due to container mismatch or missing DOM element`);
      try {
        currentRecaptchaVerifier.clear(); // Clear the widget from the old container
      } catch (e) {
        console.warn("[getOrCreateRecaptcha] Error clearing old reCAPTCHA verifier:", e);
      }
      currentRecaptchaVerifier = null; // Discard the verifier instance
      currentRecaptchaContainerId = null;
    } else {
      // Check if the existing verifier is still valid
      try {
        // Try to access a property to see if the verifier is still valid
        if (currentRecaptchaVerifier._delegate) {
          console.log(`[getOrCreateRecaptcha] Reusing existing verifier for container: ${containerId}`);
          return currentRecaptchaVerifier;
        }
      } catch (e) {
        console.warn("[getOrCreateRecaptcha] Existing verifier seems invalid, will create new one:", e);
        currentRecaptchaVerifier = null;
        currentRecaptchaContainerId = null;
      }
    }
  }

  if (!currentRecaptchaVerifier) {
    const containerElement = document.getElementById(containerId);
    if (!containerElement) {
      console.error(`[getOrCreateRecaptcha] reCAPTCHA container element with id '${containerId}' not found in the DOM.`);
      // This will be caught by the calling function (sendVerificationCode)
      return null; 
    }

    console.log(`[getOrCreateRecaptcha] Creating new RecaptchaVerifier for container: ${containerId}`);
    
    try {
      // Clear any existing content in the container
      containerElement.innerHTML = '';
      
      // Create a new verifier
      const verifier = new RecaptchaVerifier(auth, containerId, { // Pass containerId (string)
        size: 'invisible',
        'callback': (response) => {
          console.log("[getOrCreateRecaptcha] reCAPTCHA challenge successful");
        },
        'expired-callback': () => {
          console.warn("[getOrCreateRecaptcha] reCAPTCHA challenge expired.");
          // Don't immediately clear - let the auth flow complete first
          // The verifier will be cleared on next attempt or component unmount
        },
        'error-callback': (error) => {
          console.error("[getOrCreateRecaptcha] reCAPTCHA error-callback:", error);
          // Don't immediately clear - let the auth flow complete first
        },
        // Disable enterprise features
        'badge': 'bottomright',
        'tabindex': 0
      });
      
      currentRecaptchaVerifier = verifier;
      currentRecaptchaContainerId = containerId;
      console.log(`[getOrCreateRecaptcha] Successfully created new RecaptchaVerifier`);
    } catch (e) {
      console.error("[getOrCreateRecaptcha] Error creating new RecaptchaVerifier:", e);
      // This error will be caught by sendVerificationCode and re-thrown
      throw new Error(`Failed to initialize reCAPTCHA system: ${e.message}. Please ensure Firebase is configured, third-party scripts (Google reCAPTCHA) are not blocked, and the container element '#${containerId}' exists. If the issue persists, try refreshing the page.`);
    }
  }
  return currentRecaptchaVerifier;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Function to check if user has a specific role
  const hasRole = async (role) => {
    if (!currentUser) return false;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const roles = userData.roles || [];
        return roles.includes(role);
      }
      return false;
    } catch (error) {
      console.error('Error checking role:', error);
      return false;
    }
  };
  
  // Function to check if user is admin
  const isAdmin = () => {
    return hasRole('admin');
  };
  
  // Function to check if user is astrologer
  const isAstrologer = () => {
    return hasRole('astrologer');
  };
  
  // Function to fetch user roles from Firestore
  const fetchUserRoles = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.roles || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }
  };
  
  // Function to register a new user with email
  async function signupWithEmail(email, password, displayName, roles = ['client']) {
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update profile with display name
      await updateProfile(user, { displayName });
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName,
        roles: roles,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return user;
    } catch (error) {
      throw error;
    }
  }
  
  // Function to send verification code
  async function sendVerificationCode(phoneNumber, recaptchaContainerId) {
    try {
      const verifier = getOrCreateRecaptcha(recaptchaContainerId);
      if (!verifier) {
        // This means getOrCreateRecaptcha decided it couldn't create one (e.g., container not found and it returned null)
        throw new Error(`Failed to obtain reCAPTCHA verifier. Ensure the reCAPTCHA container element with ID #${recaptchaContainerId} exists in the DOM and is visible.`);
      }
      
      console.log('[sendVerificationCode] About to render reCAPTCHA verifier');
      
      // Render the reCAPTCHA widget (for invisible reCAPTCHA, this prepares it)
      try {
        await verifier.render();
        console.log('[sendVerificationCode] reCAPTCHA verifier rendered successfully');
      } catch (renderError) {
        // If already rendered, that's okay
        if (renderError.message && renderError.message.includes('already rendered')) {
          console.log('[sendVerificationCode] reCAPTCHA verifier was already rendered');
        } else {
          console.error('[sendVerificationCode] Error rendering reCAPTCHA:', renderError);
          throw new Error('Failed to render reCAPTCHA. Please refresh the page and try again.');
        }
      }
      
      // Add a small delay to ensure reCAPTCHA is fully ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('[sendVerificationCode] Calling signInWithPhoneNumber');
      
      // Send verification code
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
      
      console.log('[sendVerificationCode] Successfully sent verification code');
      
      return confirmationResult;
    } catch (error) {
      console.error("Error sending verification code:", error);
      
      // Improved error handling for phone authentication
      if (error.message && (error.message.startsWith("Failed to initialize reCAPTCHA system") || error.message.startsWith("Failed to obtain reCAPTCHA verifier"))) {
          throw error; // Rethrow the specific reCAPTCHA initialization error
      }
      if (error.code === 'auth/operation-not-allowed') {
        throw new Error('Phone authentication is not enabled in Firebase. Please contact the administrator.');
      } else if (error.code === 'auth/invalid-phone-number') {
        throw new Error('The phone number is invalid. Please enter a valid phone number with country code (e.g., +1234567890).');
      } else if (error.code === 'auth/quota-exceeded') {
        throw new Error('SMS quota exceeded. Please try again later.');
      } else if (error.code === 'auth/captcha-check-failed') {
        throw new Error('reCAPTCHA verification failed. Please refresh the page and try again.');
      } else if (error.code === 'auth/billing-not-enabled') {
        throw new Error('Firebase billing is not properly configured. Please contact the administrator.');
      } else if (error.code === 'auth/invalid-app-credential') {
        // Clear the verifier and suggest refresh
        currentRecaptchaVerifier = null;
        currentRecaptchaContainerId = null;
        throw new Error('Invalid app credential. Please refresh the page and try again.');
      } else if (error.message && error.message.includes('reCAPTCHA')) {
        // Clear the verifier for any reCAPTCHA related errors
        currentRecaptchaVerifier = null;
        currentRecaptchaContainerId = null;
        throw new Error('reCAPTCHA error. Please refresh the page and try again.');
      } else {
        throw new Error(`Failed to send verification code: ${error.message}`);
      }
    }
  }
  
  // Function to verify code and sign up with phone
  async function verifyCodeAndSignUp(confirmationResult, verificationCode, displayName, roles = ['client']) {
    try {
      // Confirm the verification code
      const userCredential = await confirmationResult.confirm(verificationCode);
      const user = userCredential.user;
      
      // Update profile with display name if provided
      if (displayName) {
        await updateProfile(user, { displayName });
      }
      
      // Check if user document already exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // Create user document in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          phoneNumber: user.phoneNumber,
          displayName: displayName || user.displayName || 'User',
          roles: roles,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      return user;
    } catch (error) {
      console.error("Error verifying code:", error);
      
      if (error.code === 'auth/invalid-verification-code') {
        throw new Error('The verification code is invalid. Please check and try again.');
      } else if (error.code === 'auth/code-expired') {
        throw new Error('The verification code has expired. Please request a new code.');
      } else {
        throw new Error(`Failed to verify code: ${error.message}`);
      }
    }
  }
  
  // Function to sign in with email and password
  function loginWithEmail(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }
  
  // Function to sign in with Google
  async function loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user document already exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // Create user document in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          roles: ['client'], // Default role
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      return user;
    } catch (error) {
      throw error;
    }
  }
  
  // Function to sign out
  function logout() {
    return signOut(auth);
  }
  
  // Function to reset password
  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }
  
  // Function to update user roles
  async function updateUserRoles(userId, roles) {
    try {
      await setDoc(doc(db, 'users', userId), {
        roles,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      // If updating current user, update state
      if (currentUser && currentUser.uid === userId) {
        setUserRoles(roles);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating user roles:', error);
      throw error;
    }
  }
  
  // Function to get all users (admin only)
  async function getAllUsers() {
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
  }
  
  // Function to get all astrologers
  async function getAstrologers() {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('roles', 'array-contains', 'astrologer'));
      const querySnapshot = await getDocs(q);
      
      const astrologers = [];
      querySnapshot.forEach((doc) => {
        astrologers.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return astrologers;
    } catch (error) {
      console.error('Error fetching astrologers:', error);
      throw error;
    }
  }
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const roles = await fetchUserRoles(user.uid);
        setUserRoles(roles);
      } else {
        setCurrentUser(null);
        setUserRoles([]);
      }
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);
  
  const value = {
    currentUser,
    userRoles,
    hasRole,
    isAdmin,
    isAstrologer,
    signupWithEmail,
    sendVerificationCode,
    verifyCodeAndSignUp,
    loginWithEmail,
    loginWithGoogle,
    logout,
    resetPassword,
    updateUserRoles,
    getAllUsers,
    getAstrologers
  };
  
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 
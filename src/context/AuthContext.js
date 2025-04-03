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

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Function to check if user has a specific role
  const hasRole = (role) => {
    return userRoles.includes(role);
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
  
  // Function to set up reCAPTCHA
  function setupRecaptcha(containerId) {
    try {
      // Clear any existing reCAPTCHA instances first
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }
      
      // Create a new reCAPTCHA verifier
      window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        'size': 'normal',
        'callback': (response) => {
          // reCAPTCHA solved, allow the user to sign in
          console.log('reCAPTCHA verified');
        },
        'expired-callback': () => {
          // Response expired. Ask user to solve reCAPTCHA again.
          console.log('reCAPTCHA expired');
        }
      });
      
      // Render the reCAPTCHA
      window.recaptchaVerifier.render().then((widgetId) => {
        window.recaptchaWidgetId = widgetId;
      });
      
      return window.recaptchaVerifier;
    } catch (error) {
      console.error('Error setting up reCAPTCHA:', error);
      throw new Error('Failed to set up verification. Please refresh the page and try again.');
    }
  }
  
  // Function to send verification code
  async function sendVerificationCode(phoneNumber, recaptchaContainerId) {
    try {
      // Make sure the container exists
      const container = document.getElementById(recaptchaContainerId);
      if (!container) {
        throw new Error('reCAPTCHA container not found. Please refresh the page and try again.');
      }
      
      const verifier = setupRecaptcha(recaptchaContainerId);
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
      return confirmationResult;
    } catch (error) {
      console.error("Error sending verification code:", error);
      
      // Improved error handling for phone authentication
      if (error.code === 'auth/operation-not-allowed') {
        throw new Error('Phone authentication is not enabled in Firebase. Please contact the administrator.');
      } else if (error.code === 'auth/invalid-phone-number') {
        throw new Error('The phone number is invalid. Please enter a valid phone number with country code (e.g., +1234567890).');
      } else if (error.code === 'auth/quota-exceeded') {
        throw new Error('SMS quota exceeded. Please try again later.');
      } else if (error.code === 'auth/captcha-check-failed') {
        throw new Error('reCAPTCHA verification failed. Please refresh the page and try again.');
      } else if (error.code === 'auth/billing-not-enabled') {
        throw new Error(`Firebase billing is not properly configured. 

For developers: You need to:
1. Ensure you have a valid payment method in Firebase console
2. Upgrade to the Blaze plan (pay-as-you-go)
3. Make sure your billing account is in good standing
4. Verify your project's quota settings for phone authentication`);
      } else if (error.code === 'auth/invalid-app-credential') {
        throw new Error(`Invalid app credential. This often happens after changing Firebase plans or settings.

For developers:
1. Make sure your Firebase project is properly configured
2. Verify that your app domain is added to the authorized domains in Firebase console
3. Check that reCAPTCHA v2 is enabled for your project
4. Try clearing your browser cache and cookies
5. It may take some time for plan changes to propagate - wait 15-30 minutes and try again`);
      } else if (error.message && error.message.includes('reCAPTCHA')) {
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
    getAstrologers,
    setupRecaptcha
  };
  
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 
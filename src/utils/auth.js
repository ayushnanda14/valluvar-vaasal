import { auth } from '../firebase/firebaseConfig';

// CLIENT-SIDE FUNCTIONS
// Get the current user's ID token (client-side only)
export async function getIdToken() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  return user.getIdToken();
}

// SERVER-SIDE FUNCTIONS
// This will only be imported in API routes
export async function verifyAuth(req) {
  // Dynamic import to avoid client-side loading
  const { adminAuth, adminDb } = await import('../firebase/firebaseAdmin');
  
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false };
    }

    // Extract the token
    const token = authHeader.split('Bearer ')[1];
    if (!token) {
      return { success: false };
    }

    // Verify the token
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Get user roles from Firestore
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const roles = userDoc.exists ? (userDoc.data().roles || []) : [];

    return { 
      success: true, 
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.name,
      roles
    };
  } catch (error) {
    console.error('Error verifying auth:', error);
    return { success: false };
  }
}
import { 
  doc, 
  updateDoc, 
  serverTimestamp,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { uploadFiles } from './fileService';

// Update astrologer profile with services and pricing
export const updateAstrologerServices = async (userId, services, pricing) => {
  try {
    // Create service charges object
    const serviceCharges = {};
    
    if (services.marriageMatching) {
      serviceCharges.marriageMatching = parseInt(pricing.marriageMatching);
    }
    
    if (services.jathakPrediction) {
      serviceCharges.jathakPrediction = parseInt(pricing.jathakPrediction);
    }
    
    if (services.jathakWriting) {
      serviceCharges.jathakWriting = parseInt(pricing.jathakWriting);
    }
    
    // Update user document
    await updateDoc(doc(db, 'users', userId), {
      services: Object.keys(services).filter(key => services[key]),
      serviceCharges,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating astrologer services:', error);
    throw new Error(`Failed to update services: ${error.message}`);
  }
};

// Upload verification documents
export const uploadVerificationDocuments = async (userId, aadharFiles, certificateFiles, experienceFiles) => {
  try {
    // Upload Aadhar card
    let aadharDocs = [];
    if (aadharFiles && aadharFiles.length > 0) {
      aadharDocs = await uploadFiles(
        aadharFiles, 
        `users/${userId}/verification/aadhar`
      );
    }
    
    // Upload certificates
    let certificateDocs = [];
    if (certificateFiles && certificateFiles.length > 0) {
      certificateDocs = await uploadFiles(
        certificateFiles, 
        `users/${userId}/verification/certificates`
      );
    }
    
    // Upload experience proof
    let experienceDocs = [];
    if (experienceFiles && experienceFiles.length > 0) {
      experienceDocs = await uploadFiles(
        experienceFiles, 
        `users/${userId}/verification/experience`
      );
    }
    
    // Update user document with verification status
    await updateDoc(doc(db, 'users', userId), {
      verificationDocuments: {
        aadhar: aadharDocs,
        certificates: certificateDocs,
        experience: experienceDocs,
        submittedAt: serverTimestamp()
      },
      verificationStatus: 'pending',
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error uploading verification documents:', error);
    throw new Error(`Failed to upload documents: ${error.message}`);
  }
};

// Complete astrologer signup process
export const completeAstrologerSignup = async (
  userId, 
  services, 
  pricing, 
  aadharFiles, 
  certificateFiles, 
  experienceFiles
) => {
  try {
    // Update services and pricing
    await updateAstrologerServices(userId, services, pricing);
    
    // Upload verification documents
    await uploadVerificationDocuments(userId, aadharFiles, certificateFiles, experienceFiles);
    
    return true;
  } catch (error) {
    console.error('Error completing astrologer signup:', error);
    throw new Error(`Failed to complete signup: ${error.message}`);
  }
};

// Get astrologer verification status
export const getAstrologerVerificationStatus = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    
    return {
      verificationStatus: userData.verificationStatus || 'not_submitted',
      verificationDocuments: userData.verificationDocuments || null,
      services: userData.services || [],
      serviceCharges: userData.serviceCharges || {}
    };
  } catch (error) {
    console.error('Error getting astrologer verification status:', error);
    throw new Error(`Failed to get verification status: ${error.message}`);
  }
};

// Get all verified astrologers
export const getVerifiedAstrologers = async (serviceType = null) => {
  try {
    let astrologersQuery;
    
    if (serviceType) {
      // Get astrologers who provide the specific service
      astrologersQuery = query(
        collection(db, 'users'),
        where('roles', 'array-contains', 'astrologer'),
        where('verificationStatus', '==', 'verified'),
        where('services', 'array-contains', serviceType),
        orderBy('createdAt', 'desc')
      );
    } else {
      // Get all verified astrologers
      astrologersQuery = query(
        collection(db, 'users'),
        where('roles', 'array-contains', 'astrologer'),
        where('verificationStatus', '==', 'verified'),
        orderBy('createdAt', 'desc')
      );
    }
    
    const querySnapshot = await getDocs(astrologersQuery);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting verified astrologers:', error);
    throw new Error(`Failed to get astrologers: ${error.message}`);
  }
};

// Get astrologer profile
export const getAstrologerProfile = async (astrologerId) => {
  try {
    const astrologerDoc = await getDoc(doc(db, 'users', astrologerId));
    
    if (!astrologerDoc.exists()) {
      throw new Error('Astrologer not found');
    }
    
    const astrologerData = astrologerDoc.data();
    
    // Don't return sensitive information
    const { email, phoneNumber, verificationDocuments, ...safeData } = astrologerData;
    
    return {
      id: astrologerDoc.id,
      ...safeData
    };
  } catch (error) {
    console.error('Error getting astrologer profile:', error);
    throw new Error(`Failed to get astrologer profile: ${error.message}`);
  }
}; 
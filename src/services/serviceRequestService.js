import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc,
  arrayUnion,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { uploadFiles } from './fileService';

// Create a new service request
export const createServiceRequest = async (data) => {
  try {
    // Create the service request document
    const serviceRequestRef = await addDoc(collection(db, 'serviceRequests'), {
      userId: data.userId,
      serviceType: data.serviceType,
      astrologers: data.astrologers.map(a => ({
        id: a.id,
        displayName: a.displayName,
        charge: a.serviceCharges?.[data.serviceType] || 0
      })),
      status: 'pending',
      totalAmount: data.totalAmount,
      paymentStatus: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Upload files
    let uploadedFiles = [];
    if (data.files && data.files.length > 0) {
      uploadedFiles = await uploadFiles(
        data.files, 
        `serviceRequests/${serviceRequestRef.id}/files`
      );
    }
    
    // Upload second set of files (for marriage matching)
    let uploadedSecondFiles = [];
    if (data.secondFiles && data.secondFiles.length > 0) {
      uploadedSecondFiles = await uploadFiles(
        data.secondFiles, 
        `serviceRequests/${serviceRequestRef.id}/secondFiles`
      );
    }
    
    // Update the service request with file information
    await updateDoc(serviceRequestRef, {
      files: uploadedFiles,
      secondFiles: uploadedSecondFiles,
      updatedAt: serverTimestamp()
    });
    
    // Create conversation threads with each astrologer
    for (const astrologer of data.astrologers) {
      await createConversation(
        data.userId,
        astrologer.id,
        serviceRequestRef.id,
        data.serviceType
      );
    }
    
    return serviceRequestRef.id;
  } catch (error) {
    console.error('Error creating service request:', error);
    throw new Error(`Failed to create service request: ${error.message}`);
  }
};

// Create a conversation between user and astrologer
const createConversation = async (userId, astrologerId, serviceRequestId, serviceType) => {
  try {
    // Get user and astrologer details
    const userDoc = await getDoc(doc(db, 'users', userId));
    const astrologerDoc = await getDoc(doc(db, 'users', astrologerId));
    
    if (!userDoc.exists() || !astrologerDoc.exists()) {
      throw new Error('User or astrologer not found');
    }
    
    const userData = userDoc.data();
    const astrologerData = astrologerDoc.data();
    
    // Create the conversation
    const conversationRef = await addDoc(collection(db, 'conversations'), {
      participants: [userId, astrologerId],
      serviceRequestId,
      serviceType,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: {
        text: `New ${serviceType} service request`,
        createdAt: serverTimestamp(),
        senderId: userId
      }
    });
    
    // Add initial system message
    await addDoc(collection(db, 'conversations', conversationRef.id, 'messages'), {
      text: `${userData.displayName} has requested a ${serviceType} service. The astrologer will review the uploaded documents and provide insights soon.`,
      senderId: 'system',
      createdAt: serverTimestamp(),
      isSystemMessage: true
    });
    
    // Update user's conversations list
    await updateDoc(doc(db, 'users', userId), {
      conversations: arrayUnion({
        id: conversationRef.id,
        with: astrologerId,
        withName: astrologerData.displayName,
        withPhoto: astrologerData.photoURL || '',
        serviceType,
        lastUpdated: serverTimestamp()
      })
    });
    
    // Update astrologer's conversations list
    await updateDoc(doc(db, 'users', astrologerId), {
      conversations: arrayUnion({
        id: conversationRef.id,
        with: userId,
        withName: userData.displayName,
        withPhoto: userData.photoURL || '',
        serviceType,
        lastUpdated: serverTimestamp()
      })
    });
    
    return conversationRef.id;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw new Error(`Failed to create conversation: ${error.message}`);
  }
};

// Process payment for a service request
export const processPayment = async (serviceRequestId, paymentDetails) => {
  try {
    // In a real implementation, this would integrate with a payment gateway
    // For now, we'll just update the service request status
    
    await updateDoc(doc(db, 'serviceRequests', serviceRequestId), {
      paymentStatus: 'completed',
      paymentDetails: {
        method: paymentDetails.method,
        amount: paymentDetails.amount,
        transactionId: `TRANS_${Date.now()}`,
        timestamp: serverTimestamp()
      },
      status: 'in_progress',
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error processing payment:', error);
    throw new Error(`Failed to process payment: ${error.message}`);
  }
}; 
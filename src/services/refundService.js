import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

// Get payment details for a chat
export const getPaymentForChat = async (chatId) => {
  try {
    console.log('chatId', chatId);
    // First get the chat to find serviceRequestId
    const chatQuery = query(
      collection(db, 'chats'),
      where('id', '==', chatId)
    );
    const chatSnapshot = await getDocs(chatQuery);
    console.log('chatSnapshot', chatSnapshot, chatSnapshot.empty);
    if (chatSnapshot.empty) {
      console.log('Chat not found');
      return null;
    }
    
    const chatData = chatSnapshot.docs[0].data();
    const serviceRequestId = chatData.serviceRequestId;
    
    if (!serviceRequestId) {
      return null;
    }
    
    // Get payment using serviceRequestId
    const paymentQuery = query(
      collection(db, 'payments'),
      where('serviceRequestId', '==', serviceRequestId),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    
    const paymentSnapshot = await getDocs(paymentQuery);
    
    if (paymentSnapshot.empty) {
      return null;
    }
    
    const paymentData = paymentSnapshot.docs[0].data();
    return {
      id: paymentSnapshot.docs[0].id,
      ...paymentData
    };
  } catch (error) {
    console.error('Error getting payment for chat:', error);
    throw error;
  }
};

// Get refund history for a payment
export const getRefundHistory = async (paymentId) => {
  try {
    const refundQuery = query(
      collection(db, 'refunds'),
      where('paymentId', '==', paymentId),
      orderBy('processedAt', 'desc')
    );
    
    const refundSnapshot = await getDocs(refundQuery);
    const refunds = refundSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return refunds;
  } catch (error) {
    console.error('Error getting refund history:', error);
    throw error;
  }
};

// Process refund
export const processRefund = async (refundData) => {
  try {
    const functions = getFunctions();
    const processRefundFunc = httpsCallable(functions, 'processRefund');
    
    const result = await processRefundFunc(refundData);
    return result.data;
  } catch (error) {
    console.error('Error processing refund:', error);
    throw error;
  }
};

// Check if refund is eligible (within 7 days)
export const isRefundEligible = (paymentTimestamp) => {
  if (!paymentTimestamp) return false;
  
  const paymentDate = paymentTimestamp.toDate ? paymentTimestamp.toDate() : new Date(paymentTimestamp);
  const currentDate = new Date();
  const daysDifference = (currentDate - paymentDate) / (1000 * 60 * 60 * 24);
  
  return daysDifference <= 7;
};

// Get remaining refundable amount
export const getRemainingRefundableAmount = (paymentAmount, refundHistory) => {
  if (!paymentAmount) return 0;
  
  const totalRefunded = refundHistory.reduce((sum, refund) => {
    return sum + (refund.refundAmount || refund.amount || 0);
  }, 0);
  
  return Math.max(0, paymentAmount - totalRefunded);
}; 
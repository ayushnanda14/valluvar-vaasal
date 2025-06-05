import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

export async function createPaymentRecords({
  selectedAstrologers,
  currentUser,
  serviceType,
  paymentResponse,
  serviceRequestRef
}) {
  for (const astrologer of selectedAstrologers) {
    await addDoc(collection(db, 'payments'), {
      astrologerId: astrologer.id,
      astrologerName: astrologer.displayName || '',
      clientId: currentUser.uid,
      clientName: currentUser.displayName || '',
      serviceType: serviceType,
      amount: (astrologer.serviceCharges?.[serviceType] || 0) + Math.round((astrologer.serviceCharges?.[serviceType] || 0) * 0.18),
      currency: 'INR',
      razorpay_payment_id: paymentResponse.razorpay_payment_id,
      razorpay_order_id: paymentResponse.razorpay_order_id,
      razorpay_signature: paymentResponse.razorpay_signature,
      serviceRequestId: serviceRequestRef.id,
      timestamp: serverTimestamp(),
    });
  }
} 
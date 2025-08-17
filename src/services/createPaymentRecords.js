import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

export async function createPaymentRecords({
  selectedAstrologers,
  currentUser,
  serviceType,
  paymentResponse,
  serviceRequestRef
}) {
  const isDemoPayment = paymentResponse.razorpay_payment_id && paymentResponse.razorpay_payment_id.startsWith('demo_');
  
  for (const astrologer of selectedAstrologers) {
    const paymentData = {
      astrologerId: astrologer.id,
      astrologerName: astrologer.displayName || '',
      clientId: currentUser.uid,
      clientName: currentUser.displayName || '',
      serviceType: serviceType,
      // Keep the actual amount for demo payments so clients can see the real value
      amount: (astrologer.serviceCharges?.[serviceType] || 0) + Math.round((astrologer.serviceCharges?.[serviceType] || 0) * 0.18),
      currency: 'INR',
      razorpay_payment_id: paymentResponse.razorpay_payment_id,
      serviceRequestId: serviceRequestRef.id,
      isDemoPayment: isDemoPayment,
      timestamp: serverTimestamp(),
    };

    // Only add Razorpay-specific fields for non-demo payments
    if (!isDemoPayment) {
      paymentData.razorpay_order_id = paymentResponse.razorpay_order_id || null;
      paymentData.razorpay_signature = paymentResponse.razorpay_signature || null;
    }

    await addDoc(collection(db, 'payments'), paymentData);
  }
} 
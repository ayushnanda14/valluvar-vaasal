import { addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

export async function createPaymentRecords({
  selectedAstrologers,
  currentUser,
  serviceType,
  paymentResponse,
  serviceRequestRef
}) {
  const isDemoPayment = paymentResponse.razorpay_payment_id && paymentResponse.razorpay_payment_id.startsWith('demo_');
  // Capture partner referral code from localStorage (client-side)
  let partnerRef = null;
  try {
    if (typeof window !== 'undefined') {
      partnerRef = localStorage.getItem('vv_partner_ref');
    }
  } catch (_) {}
  
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
      partnerReferralCode: partnerRef || null,
      timestamp: serverTimestamp(),
    };

    // Only add Razorpay-specific fields for non-demo payments
    if (!isDemoPayment) {
      paymentData.razorpay_order_id = paymentResponse.razorpay_order_id || null;
      paymentData.razorpay_signature = paymentResponse.razorpay_signature || null;
    }

    await addDoc(collection(db, 'payments'), paymentData);

    // Create partner commission if referral present and not demo (still log for demo if needed)
    if (partnerRef) {
      try {
        const q = query(collection(db, 'partnerProfiles'), where('referralCode', '==', partnerRef));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const pp = snap.docs[0];
          const pdata = pp.data();
          const base = astrologer.serviceCharges?.[serviceType] || 0;
          let calculatedAmount = 0;
          if (pdata.commissionMode === 'percent' || pdata.commissionMode === 'both') {
            calculatedAmount = Math.max(calculatedAmount, Math.round((pdata.percent || 0) * base / 100));
          }
          if (pdata.commissionMode === 'fixed' || pdata.commissionMode === 'both') {
            calculatedAmount = Math.max(calculatedAmount, pdata.fixedAmount || 0);
          }
          await addDoc(collection(db, 'partnerCommissions'), {
            partnerId: pp.id,
            referralCode: pdata.referralCode,
            serviceType,
            clientId: currentUser.uid,
            serviceRequestId: serviceRequestRef.id,
            paymentId: paymentResponse.razorpay_payment_id || null,
            calculatedAmount,
            modeSnapshot: pdata.commissionMode,
            percentSnapshot: pdata.percent || 0,
            fixedAmountSnapshot: pdata.fixedAmount || 0,
            status: 'pending',
            notes: '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      } catch (e) {
        console.warn('Failed to create partner commission record', e);
      }
    }
  }
} 
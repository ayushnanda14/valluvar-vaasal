import { addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { getPlanBase, getPlanGST, getPlanTotal } from './pricingService';

// Revenue split configuration for matrimony referrals
const MATRIMONY_SPLITS = {
  pothigai: {
    base: 85,
    gst: 15,
    total: 100,
    matrimony: 40,
    astrologer: 40,
    vvip: 5
  },
  ganga: {
    base: 424,
    gst: 76,
    total: 500,
    matrimony: 200,
    astrologer: 200,
    vvip: 24
  },
  himalaya: {
    base: 1695,
    gst: 305,
    total: 2000,
    matrimony: 800,
    astrologer: 800,
    vvip: 95
  }
};

export async function createPaymentRecords({
  currentUser,
  serviceType,
  paymentResponse,
  serviceRequestRef,
  pricingCategory // 'pothigai', 'ganga', or 'himalaya'
}) {
  const isDemoPayment = paymentResponse.razorpay_payment_id && paymentResponse.razorpay_payment_id.startsWith('demo_');
  
  // Capture partner referral code from localStorage (client-side)
  let partnerRef = null;
  try {
    if (typeof window !== 'undefined') {
      partnerRef = localStorage.getItem('vv_partner_ref');
    }
  } catch (_) {}
  
  // Calculate plan-based amounts
  const planBase = pricingCategory ? await getPlanBase(pricingCategory) : 0;
  const planGST = pricingCategory ? await getPlanGST(pricingCategory) : 0;
  const planTotal = planBase + planGST;

  // Check if this is a matrimony referral
  let isMatrimonyReferral = false;
  let partnerProfile = null;
  if (partnerRef) {
    try {
      const q = query(collection(db, 'partnerProfiles'), where('referralCode', '==', partnerRef));
      const snap = await getDocs(q);
      if (!snap.empty) {
        partnerProfile = { id: snap.docs[0].id, ...snap.docs[0].data() };
        isMatrimonyReferral = partnerProfile.program === 'matrimony';
      }
    } catch (e) {
      console.warn('Failed to check partner profile:', e);
    }
  }

  // Create a single payment document
  const paymentData = {
    astrologerId: null, // Will be assigned later by support
    astrologerName: null,
    clientId: currentUser.uid,
    clientName: currentUser.displayName || '',
    serviceType: serviceType,
    pricingCategory: pricingCategory || null,
    baseAmount: planBase,
    gstAmount: planGST,
    amount: planTotal,
    currency: 'INR',
    razorpay_payment_id: paymentResponse.razorpay_payment_id,
    serviceRequestId: serviceRequestRef.id,
    isDemoPayment: isDemoPayment,
    partnerReferralCode: partnerRef || null,
    isMatrimonyReferral: isMatrimonyReferral,
    timestamp: serverTimestamp(),
  };

  // Only add Razorpay-specific fields for non-demo payments
  if (!isDemoPayment) {
    paymentData.razorpay_order_id = paymentResponse.razorpay_order_id || null;
    paymentData.razorpay_signature = paymentResponse.razorpay_signature || null;
  }

  const paymentRef = await addDoc(collection(db, 'payments'), paymentData);

  // Create partner commission if referral present
  if (partnerRef && partnerProfile) {
    try {
      // Idempotency: skip if a commission already exists for this partner and serviceRequest
      const existingQ = query(
        collection(db, 'partnerCommissions'),
        where('partnerId', '==', partnerProfile.id),
        where('serviceRequestId', '==', serviceRequestRef.id)
      );
      const existingSnap = await getDocs(existingQ);
      
      if (existingSnap.empty) {
        let calculatedAmount = 0;
        
        if (isMatrimonyReferral && pricingCategory && MATRIMONY_SPLITS[pricingCategory]) {
          // Use fixed matrimony split
          calculatedAmount = MATRIMONY_SPLITS[pricingCategory].matrimony;
        } else {
          // Use existing commissionMode logic for non-matrimony referrals
          const base = planBase;
          if (partnerProfile.commissionMode === 'percent' || partnerProfile.commissionMode === 'both') {
            calculatedAmount = Math.max(calculatedAmount, Math.round((partnerProfile.percent || 0) * base / 100));
          }
          if (partnerProfile.commissionMode === 'fixed' || partnerProfile.commissionMode === 'both') {
            calculatedAmount = Math.max(calculatedAmount, partnerProfile.fixedAmount || 0);
          }
        }

        await addDoc(collection(db, 'partnerCommissions'), {
          partnerId: partnerProfile.id,
          referralCode: partnerProfile.referralCode,
          serviceType,
          clientId: currentUser.uid,
          serviceRequestId: serviceRequestRef.id,
          paymentId: paymentRef.id,
          calculatedAmount,
          modeSnapshot: partnerProfile.commissionMode || 'percent',
          percentSnapshot: partnerProfile.percent || 0,
          fixedAmountSnapshot: partnerProfile.fixedAmount || 0,
          isMatrimonyReferral: isMatrimonyReferral,
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
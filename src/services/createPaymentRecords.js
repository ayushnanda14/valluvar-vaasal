import { addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { getPlanBase, getPlanGST, getPlanTotal } from './pricingService';

export async function createPaymentRecords({
  selectedAstrologers,
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
  
  const count = Math.max(1, selectedAstrologers.length || 1);

  // Split base/GST deterministically so that sums match exactly (distribute remainders)
  const baseFloor = Math.floor(planBase / count);
  const baseRemainder = planBase - baseFloor * count;
  const gstFloor = Math.floor(planGST / count);
  const gstRemainder = planGST - gstFloor * count;

  for (let idx = 0; idx < selectedAstrologers.length; idx++) {
    const astrologer = selectedAstrologers[idx];
    const baseAmount = baseFloor + (idx < baseRemainder ? 1 : 0);
    const gstAmount = gstFloor + (idx < gstRemainder ? 1 : 0);
    const amount = baseAmount + gstAmount;

    const paymentData = {
      astrologerId: astrologer.id,
      astrologerName: astrologer.displayName || '',
      clientId: currentUser.uid,
      clientName: currentUser.displayName || '',
      serviceType: serviceType,
      pricingCategory: pricingCategory || null, // Store plan category
      baseAmount, // Base amount (excluding GST)
      gstAmount, // GST amount
      amount, // Total amount (base + GST)
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
          // Use plan base amount instead of astrologer pricing
          const base = baseAmount;
          let calculatedAmount = 0;
          if (pdata.commissionMode === 'percent' || pdata.commissionMode === 'both') {
            calculatedAmount = Math.max(calculatedAmount, Math.round((pdata.percent || 0) * base / 100));
          }
          if (pdata.commissionMode === 'fixed' || pdata.commissionMode === 'both') {
            calculatedAmount = Math.max(calculatedAmount, pdata.fixedAmount || 0);
          }
          // Idempotency: skip if a commission already exists for this partner and serviceRequest
          const existingQ = query(
            collection(db, 'partnerCommissions'),
            where('partnerId', '==', pp.id),
            where('serviceRequestId', '==', serviceRequestRef.id)
          );
          const existingSnap = await getDocs(existingQ);
          if (existingSnap.empty) {
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
        }
      } catch (e) {
        console.warn('Failed to create partner commission record', e);
      }
    }
  }
} 
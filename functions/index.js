const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');
const Razorpay = require('razorpay');
// For v2 onCall, we use specific imports
const { onCall, HttpsError } = require('firebase-functions/v2/https');

admin.initializeApp();

// Global variable for Razorpay instance - initialize lazily or check before use
let razorpayInstance;

function getRazorpayInstance() {
    if (!razorpayInstance) {
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            console.error('FATAL ERROR: Razorpay Key ID or Key Secret is not set in Firebase Function environment variables.');
            // This error will prevent the instance from being created.
            // The function calling this should handle the null/undefined instance.
            return null;
        }
        razorpayInstance = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        });
    }
    return razorpayInstance;
}

// --- checkPhone function (uses v2 onCall) ---
// In development you may not have App Check configured. Make it optional.
exports.checkPhone = onCall(
    { region: 'us-central1', enforceAppCheck: false, consumeAppCheck: 'optional' },
    async (request) => {
        const phone = request.data.phone;
        if (!phone) {
            throw new HttpsError('invalid-argument', 'Missing "phone" parameter');
        }
        try {
            await admin.auth().getUserByPhoneNumber(phone);
            return { exists: true };
        } catch (err) {
            if (err.code === 'auth/user-not-found') return { exists: false };
            console.error('checkPhone error:', err);
            throw new HttpsError('internal', 'Phone lookup failed');
        }
    });

// --- verifyRazorpayPayment function (ensure it uses v2 onCall) --- 
exports.verifyRazorpayPayment = onCall(
    { region: 'us-central1', enforceAppCheck: false },
    async (req) => {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.data;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing Razorpay payment details.');
        }

        const secret = functions.config().razorpay.key_secret;  // <-- see step 4
        const expected = crypto
            .createHmac('sha256', secret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (expected !== razorpay_signature) {
            throw new functions.https.HttpsError('permission-denied', 'Invalid Razorpay signature');
        }

        return { success: true };
    }
);

// --- createRazorpayOrder function (ensure it uses v2 onCall) ---
exports.createRazorpayOrder = onCall(
    { region: 'us-central1', enforceAppCheck: false, consumeAppCheck: 'optional' },
    async (request) => {
        const rzpInstance = getRazorpayInstance();
        if (!rzpInstance) {
            console.error('Razorpay instance not initialized. Check Firebase config for razorpay.key_id and razorpay.key_secret.');
            throw new HttpsError('internal', 'Payment service configuration error.');
        }

        const amount = request.data.amount;
        const currency = request.data.currency || 'INR';
        if (!amount || typeof amount !== 'number' || amount <= 0) {
            throw new HttpsError('invalid-argument', 'Invalid or missing amount.');
        }
        const options = {
            amount: amount,
            currency: currency,
            receipt: `receipt_order_${Date.now()}`,
        };
        try {
            const order = await rzpInstance.orders.create(options);
            if (!order) {
                throw new HttpsError('internal', 'Razorpay order creation returned empty.');
            }
            console.log('Razorpay Order Created:', order.id);
            return { orderId: order.id, amount: order.amount, currency: order.currency };
        } catch (error) {
            console.error('createRazorpayOrder error:', error);
            const errorMessage = error.description || error.message || 'Failed to create payment order.';
            throw new HttpsError('internal', errorMessage, error.code); // Include error code if available
        }
    });

// Razorpay refund function
exports.processRefund = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated and is an admin
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { uid } = context.auth;
  
  // Check if user is admin
  const adminDoc = await admin.firestore().collection('users').doc(uid).get();
  if (!adminDoc.exists || !adminDoc.data().roles?.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can process refunds');
  }

  const { 
    paymentId, 
    amount, 
    reason, 
    chatId, 
    clientId,
    refundType = 'full' // 'full' or 'partial'
  } = data;

  if (!paymentId || !amount || !reason || !chatId || !clientId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
  }

  try {
    // Initialize Razorpay
    const Razorpay = require('razorpay');
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // Get payment details from Razorpay
    const payment = await razorpay.payments.fetch(paymentId);
    
    if (!payment) {
      throw new functions.https.HttpsError('not-found', 'Payment not found');
    }

    // Check if payment is already refunded
    if (payment.status === 'refunded') {
      throw new functions.https.HttpsError('failed-precondition', 'Payment is already refunded');
    }

    // Check refund time limit (7 days)
    const paymentDate = new Date(payment.created_at * 1000);
    const currentDate = new Date();
    const daysDifference = (currentDate - paymentDate) / (1000 * 60 * 60 * 24);
    
    if (daysDifference > 7) {
      throw new functions.https.HttpsError('failed-precondition', 'Refunds can only be processed within 7 days of payment');
    }

    // Validate refund amount
    const paymentAmount = payment.amount; // Amount in paise
    const refundAmount = amount * 100; // Convert to paise
    
    if (refundAmount > paymentAmount) {
      throw new functions.https.HttpsError('invalid-argument', 'Refund amount cannot exceed payment amount');
    }

    // Process refund through Razorpay
    const refundData = {
      amount: refundAmount,
      speed: 'normal', // or 'optimum'
      notes: {
        reason: reason,
        processed_by: uid,
        chat_id: chatId,
        refund_type: refundType
      }
    };

    const refund = await razorpay.payments.refund(paymentId, refundData);

    // Store refund record in Firestore
    const refundRecord = {
      paymentId: paymentId,
      refundId: refund.id,
      amount: amount,
      refundAmount: refund.amount / 100, // Convert from paise
      reason: reason,
      refundType: refundType,
      processedBy: uid,
      chatId: chatId,
      clientId: clientId,
      status: refund.status,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      notes: refund.notes,
      razorpayRefundData: refund
    };

    await admin.firestore().collection('refunds').add(refundRecord);

    // Update payment record with refund info
    await admin.firestore().collection('payments')
      .where('razorpay_payment_id', '==', paymentId)
      .get()
      .then(snapshot => {
        if (!snapshot.empty) {
          const paymentDoc = snapshot.docs[0];
          paymentDoc.ref.update({
            refundStatus: refund.status,
            refundAmount: amount,
            refundedAt: admin.firestore.FieldValue.serverTimestamp(),
            refundReason: reason
          });
        }
      });

    // Add system message to admin chat about refund
    const adminChatQuery = await admin.firestore().collection('adminClientChats')
      .where('mainChatId', '==', chatId)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (!adminChatQuery.empty) {
      const adminChatDoc = adminChatQuery.docs[0];
      await adminChatDoc.ref.collection('messages').add({
        text: `Refund processed: ₹${amount} (${refundType}). Reason: ${reason}`,
        senderId: 'system',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        type: 'text',
        refundInfo: {
          amount: amount,
          reason: reason,
          refundType: refundType,
          status: refund.status
        }
      });
    }

    // Add notification to client about refund
    const clientNotification = {
      type: 'refund',
      title: 'Refund Processed',
      message: `Your refund of ₹${amount} has been processed. Reason: ${reason}`,
      amount: amount,
      reason: reason,
      refundType: refundType,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      read: false
    };

    await admin.firestore().collection('users').doc(clientId).collection('notifications').add(clientNotification);

    return {
      success: true,
      refundId: refund.id,
      amount: amount,
      status: refund.status,
      message: `Refund of ₹${amount} processed successfully`
    };

  } catch (error) {
    console.error('Refund processing error:', error);
    
    if (error.code === 'functions.https.HttpsError') {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', `Refund processing failed: ${error.message}`);
  }
});

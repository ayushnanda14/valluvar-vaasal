const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const crypto = require('crypto');
const functions = require('firebase-functions'); // Required for config access

admin.initializeApp();                   // re‑use default project credentials

exports.checkPhone = onCall(
  { region: 'us-central1', runtime: 'nodejs22', timeoutSeconds: 30 },
  async ({ data }) => {                  // ← payload lives in data
    const phone = data.phone;
    if (!phone) {
      throw new HttpsError('invalid-argument', 'Missing "phone" parameter');
    }

    try {
      await admin.auth().getUserByPhoneNumber(phone);
      return { exists: true };           // number is registered
    } catch (err) {
      if (err.code === 'auth/user-not-found') return { exists: false };
      console.error(err);
      throw new HttpsError('internal', 'Phone lookup failed');
    }
  });

// New function for Razorpay verification
exports.verifyRazorpayPayment = onCall(
  { region: 'us-central1', runtime: 'nodejs22', timeoutSeconds: 30 },
  async ({ data }) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new HttpsError('invalid-argument', 'Missing Razorpay payment details.');
    }

    // IMPORTANT: Retrieve your Razorpay Key Secret from Firebase Function configuration
    // Set it using: firebase functions:config:set razorpay.key_secret="YOUR_KEY_SECRET"
    const secret = functions.config().razorpay?.key_secret;

    if (!secret) {
        console.error('Razorpay Key Secret is not set in Firebase Function configuration.');
        throw new HttpsError('internal', 'Server configuration error.');
    }

    try {
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(body.toString())
        .digest("hex");

      if (expectedSignature === razorpay_signature) {
        // Payment is verified
        // Optional TODO: Update your Firestore database here (e.g., mark order as paid)
        console.log(`Payment verified successfully for Order ID: ${razorpay_order_id}`);
        return { success: true, message: 'Payment verified successfully' };
      } else {
        console.warn(`Payment verification failed for Order ID: ${razorpay_order_id}`);
        throw new HttpsError('unauthenticated', 'Payment verification failed: Invalid signature.');
      }
    } catch (error) {
      console.error('Error verifying Razorpay payment:', error);
      throw new HttpsError('internal', 'Could not verify payment.', error);
    }
  });

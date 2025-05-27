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

// --- checkPhone function (ensure it uses v2 onCall for consistency if not already) ---
exports.checkPhone = onCall(
    { region: 'us-central1', enforceAppCheck: true },
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

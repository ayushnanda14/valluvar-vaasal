import Razorpay from 'razorpay';

// Initialize Razorpay with your API keys
const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Verify payment signature (Client-side helper - less secure than Cloud Function)
export const verifyPayment = (razorpay_order_id, razorpay_payment_id, razorpay_signature) => {
  // WARNING: Exposing secret client-side is insecure.
  // This should ideally ONLY be done server-side (like in the Cloud Function).
  const crypto = require('crypto');
  const secret = process.env.RAZORPAY_KEY_SECRET; // PROBLEM: Secret needed here
  
  if (!secret) {
      console.error("Cannot verify payment client-side without secret key.");
      return false;
  }

  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body.toString())
    .digest('hex');

  return expectedSignature === razorpay_signature;
};

// Get payment details
export const getPaymentDetails = async (paymentId) => {
  // Need to initialize Razorpay client-side instance if not done globally
  // This requires the PUBLIC Key ID
  const razorpayClient = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      // No secret needed for fetch payment
  });
  try {
    const payment = await razorpayClient.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('Error fetching payment details:', error);
    throw error;
  }
}; 
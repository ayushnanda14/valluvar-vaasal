const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

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

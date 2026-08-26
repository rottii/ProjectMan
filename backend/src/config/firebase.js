const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// Ensure this only initializes once
if (!getApps().length) {
  // Try to parse service account key from environment variable if present
  let credential;
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      credential = cert(serviceAccount);
    }
  } catch (err) {
    console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', err);
  }

  initializeApp({
    credential
  });
}

const auth = getAuth();

module.exports = { auth };

const admin = require('firebase-admin');
require('dotenv').config();

// Ensure service account is available or handle initialization appropriately
// For this environment, we might expect a path to serviceAccountKey.json or env vars
// IF the user hasn't provided it yet, we'll placeholder it.

// const serviceAccount = require('../../serviceAccountKey.json'); 
// OR use env vars directly if formatted correctly

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(), // Uses GOOGLE_APPLICATION_CREDENTIALS env var
            // OR
            // credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin Initialized');
    } catch (error) {
        console.error('Firebase Admin Initialization Error:', error);
    }
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth };

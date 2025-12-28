const { db } = require('../config/firebaseConfig');

// Get User Settings
exports.getSettings = async (req, res) => {
    try {
        const { uid } = req.query;
        if (!uid) {
            return res.status(400).json({ error: 'UID is required' });
        }

        const doc = await db.collection('users').doc(uid).collection('settings').doc('preferences').get();

        if (!doc.exists) {
            // Return default settings
            return res.json({ currency: 'INR' });
        }

        res.json(doc.data());
    } catch (error) {
        console.error('Error getting settings:', error);
        res.status(500).json({ error: error.message });
    }
};

// Update User Settings
exports.updateSettings = async (req, res) => {
    try {
        const { uid, currency } = req.body;

        if (!uid) {
            return res.status(400).json({ error: 'UID is required' });
        }

        const validCurrencies = ['USD', 'EUR', 'INR', 'GBP', 'JPY'];
        if (currency && !validCurrencies.includes(currency)) {
            return res.status(400).json({ error: 'Invalid currency' });
        }

        const settingsData = {};
        if (currency) settingsData.currency = currency;

        await db.collection('users').doc(uid).collection('settings').doc('preferences').set(
            settingsData,
            { merge: true }
        );

        res.json({ success: true, settings: settingsData });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: error.message });
    }
};

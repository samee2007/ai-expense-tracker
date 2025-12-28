const { db } = require('../config/firebaseConfig');

// Get Daily Report
exports.getDaily = async (req, res) => {
    try {
        const { uid, date } = req.query;
        if (!uid || !date) {
            return res.status(400).json({ error: 'UID and date are required' });
        }

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const snapshot = await db.collection('users').doc(uid).collection('expenses')
            .where('date', '>=', startOfDay.toISOString())
            .where('date', '<=', endOfDay.toISOString())
            .orderBy('date', 'desc')
            .get();

        const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const summary = calculateSummary(expenses);

        res.json({ expenses, summary, period: 'daily', date });
    } catch (error) {
        console.error('Error fetching daily report:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get Weekly Report
exports.getWeekly = async (req, res) => {
    try {
        const { uid, startDate } = req.query;
        if (!uid || !startDate) {
            return res.status(400).json({ error: 'UID and startDate are required' });
        }

        const weekStart = new Date(startDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const snapshot = await db.collection('users').doc(uid).collection('expenses')
            .where('date', '>=', weekStart.toISOString())
            .where('date', '<=', weekEnd.toISOString())
            .orderBy('date', 'desc')
            .get();

        const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const summary = calculateSummary(expenses);

        res.json({
            expenses,
            summary,
            period: 'weekly',
            startDate: weekStart.toISOString().split('T')[0],
            endDate: weekEnd.toISOString().split('T')[0]
        });
    } catch (error) {
        console.error('Error fetching weekly report:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get Monthly Report
exports.getMonthly = async (req, res) => {
    try {
        const { uid, month, year } = req.query;
        if (!uid || !month || !year) {
            return res.status(400).json({ error: 'UID, month, and year are required' });
        }

        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

        const snapshot = await db.collection('users').doc(uid).collection('expenses')
            .where('date', '>=', monthStart.toISOString())
            .where('date', '<=', monthEnd.toISOString())
            .orderBy('date', 'desc')
            .get();

        const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const summary = calculateSummary(expenses);

        res.json({
            expenses,
            summary,
            period: 'monthly',
            month: parseInt(month),
            year: parseInt(year)
        });
    } catch (error) {
        console.error('Error fetching monthly report:', error);
        res.status(500).json({ error: error.message });
    }
};

// Helper: Calculate Summary
function calculateSummary(expenses) {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    const categoryTotals = expenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
    }, {});

    const topCategory = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])[0];

    return {
        totalAmount: parseFloat(total.toFixed(2)),
        expenseCount: expenses.length,
        categoryTotals,
        topCategory: topCategory ? { name: topCategory[0], amount: topCategory[1] } : null,
        avgPerDay: expenses.length > 0 ? parseFloat((total / getDayCount(expenses)).toFixed(2)) : 0
    };
}

// Helper: Get day count from expense range
function getDayCount(expenses) {
    if (expenses.length === 0) return 1;

    const dates = expenses.map(e => new Date(e.date).setHours(0, 0, 0, 0));
    const uniqueDays = new Set(dates);
    return uniqueDays.size || 1;
}

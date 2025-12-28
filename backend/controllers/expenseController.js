const { db } = require('../config/firebaseConfig');
const geminiService = require('../services/geminiService');

// MCP-Style Validation Layer
const validateExpenseData = (data) => {
    // 1. Validate Structure
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid data structure from Gemini');
    }

    // 2. Validate & Sanitize Fields
    const { amount, category, date, description } = data;

    if (typeof amount !== 'number' || amount <= 0) {
        throw new Error('Invalid amount');
    }

    const validCategories = ['Food', 'Travel', 'Bills', 'Shopping', 'Others']; // Enum
    const sanitizedCategory = validCategories.includes(category) ? category : 'Others';

    // Date validation with fallback to today
    let expenseDate = new Date(date);
    if (isNaN(expenseDate.getTime()) || expenseDate.getFullYear() < 2000) {
        console.warn(`Invalid date "${date}" received, using today's date as fallback`);
        expenseDate = new Date();
    }

    // 3. Normalize
    return {
        amount: parseFloat(amount.toFixed(2)),
        category: sanitizedCategory,
        date: expenseDate.toISOString(), // Standardize storage format
        description: (description || 'No description').trim()
    };
};

// Add Expense
exports.addExpense = async (req, res) => {
    try {
        const { text, uid } = req.body;

        if (!text || !uid) {
            return res.status(400).json({ error: 'Text and UID are required' });
        }

        // 1. Call Gemini for parsing (NO logic)
        const rawData = await geminiService.parseExpense(text);

        // 2. Apply MCP Validation
        const expenseData = validateExpenseData(rawData);

        // 3. Store in Firestore
        const docRef = await db.collection('users').doc(uid).collection('expenses').add({
            ...expenseData,
            createdAt: new Date().toISOString()
        });

        res.status(201).json({ id: docRef.id, ...expenseData });
    } catch (error) {
        console.error('Error adding expense:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get Expenses
exports.getExpenses = async (req, res) => {
    try {
        const { uid } = req.query;
        if (!uid) return res.status(400).json({ error: 'UID is required' });

        const snapshot = await db.collection('users').doc(uid).collection('expenses').orderBy('date', 'desc').get();
        const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.json(expenses);
    } catch (error) {
        console.error('Error getting expenses:', error);
        res.status(500).json({ error: error.message });
    }
};

const createCsvWriter = require('csv-writer').createObjectCsvStringifier;
const PDFDocument = require('pdfkit');

// Export CSV
exports.exportCSV = async (req, res) => {
    try {
        const { uid } = req.query;
        if (!uid) return res.status(400).json({ error: 'UID is required' });

        const snapshot = await db.collection('users').doc(uid).collection('expenses').orderBy('date', 'desc').get();
        const expenses = snapshot.docs.map(doc => doc.data());

        const csvWriter = createCsvWriter({
            header: [
                { id: 'date', title: 'Date' },
                { id: 'category', title: 'Category' },
                { id: 'description', title: 'Description' },
                { id: 'amount', title: 'Amount' }
            ]
        });

        const records = expenses.map(e => ({
            date: new Date(e.date).toLocaleDateString(),
            category: e.category,
            description: e.description,
            amount: e.amount
        }));

        const csvString = csvWriter.getHeaderString() + csvWriter.stringifyRecords(records);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="expenses.csv"');
        res.status(200).send(csvString);

    } catch (error) {
        console.error('Error exporting CSV:', error);
        res.status(500).json({ error: error.message });
    }
};

// Export PDF
exports.exportPDF = async (req, res) => {
    try {
        const { uid } = req.query;
        if (!uid) return res.status(400).json({ error: 'UID is required' });

        const snapshot = await db.collection('users').doc(uid).collection('expenses').orderBy('date', 'desc').get();
        const expenses = snapshot.docs.map(doc => doc.data());

        // Calculate Summary
        const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
        const categoryTotals = expenses.reduce((acc, e) => {
            acc[e.category] = (acc[e.category] || 0) + e.amount;
            return acc;
        }, {});

        // Get Gemini Insights
        const summaryData = { totalAmount, categoryTotals, expenseCount: expenses.length };
        let insights = "No insights available.";
        try {
            insights = await geminiService.generateInsights(summaryData);
        } catch (err) {
            console.warn("Failed to generate insights:", err);
        }

        // Generate PDF
        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="monthly_report.pdf"');

        doc.pipe(res);

        // Title
        doc.fontSize(20).text('Monthly Expense Report', { align: 'center' });
        doc.moveDown();

        // Summary Section
        doc.fontSize(14).text(`Total Expenses: Rs. ${totalAmount}`, { bold: true });
        doc.moveDown(0.5);

        doc.text('Category Breakdown:', { underline: true });
        Object.entries(categoryTotals).forEach(([cat, amount]) => {
            doc.fontSize(12).text(`- ${cat}: Rs. ${amount}`);
        });
        doc.moveDown();

        // Insights Section
        doc.fontSize(14).text('AI Insights:', { underline: true });
        doc.fontSize(12).text(insights, { align: 'justify' });
        doc.moveDown();

        // Detailed List
        doc.fontSize(14).text('Detailed Expenses:', { underline: true });
        doc.moveDown(0.5);

        expenses.forEach(e => {
            doc.fontSize(10).text(`${new Date(e.date).toLocaleDateString()} - ${e.category} - Rs.${e.amount}`);
            doc.fontSize(9).fillColor('grey').text(e.description);
            doc.fillColor('black').moveDown(0.5);
        });

        doc.end();

    } catch (error) {
        console.error('Error exporting PDF:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        }
    }
};

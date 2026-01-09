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
        // Extract meaningful error message
        const errorMessage = error.message || 'Unknown error occurred';
        res.status(500).json({ error: errorMessage, details: error.toString() });
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

// Update Expense
exports.updateExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const { uid, amount, category, date, description } = req.body;

        if (!uid || !id) {
            return res.status(400).json({ error: 'UID and expense ID are required' });
        }

        // Validate data
        const updateData = {};
        if (amount !== undefined) {
            if (typeof amount !== 'number' || amount <= 0) {
                return res.status(400).json({ error: 'Invalid amount' });
            }
            updateData.amount = parseFloat(amount.toFixed(2));
        }
        if (category !== undefined) {
            const validCategories = ['Food', 'Travel', 'Bills', 'Shopping', 'Others'];
            if (!validCategories.includes(category)) {
                return res.status(400).json({ error: 'Invalid category' });
            }
            updateData.category = category;
        }
        if (date !== undefined) {
            const expenseDate = new Date(date);
            if (isNaN(expenseDate.getTime())) {
                return res.status(400).json({ error: 'Invalid date' });
            }
            updateData.date = expenseDate.toISOString();
        }
        if (description !== undefined) {
            updateData.description = description.trim();
        }

        // Update in Firestore
        await db.collection('users').doc(uid).collection('expenses').doc(id).update(updateData);

        res.json({ success: true, message: 'Expense updated', id });
    } catch (error) {
        console.error('Error updating expense:', error);
        res.status(500).json({ error: error.message });
    }
};

// Delete Expense
exports.deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const { uid } = req.query;

        if (!uid || !id) {
            return res.status(400).json({ error: 'UID and expense ID are required' });
        }

        // Delete from Firestore
        await db.collection('users').doc(uid).collection('expenses').doc(id).delete();

        res.json({ success: true, message: 'Expense deleted', id });
    } catch (error) {
        console.error('Error deleting expense:', error);
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

        // Fetch expenses
        const snapshot = await db.collection('users').doc(uid).collection('expenses').orderBy('date', 'desc').get();
        const expenses = snapshot.docs.map(doc => doc.data());

        // Fetch user currency settings
        let currency = 'INR';
        let currencySymbol = '₹';
        const currencySymbols = {
            'INR': '₹',
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'JPY': '¥'
        };

        try {
            const settingsDoc = await db.collection('users').doc(uid).collection('settings').doc('preferences').get();
            if (settingsDoc.exists) {
                const settings = settingsDoc.data();
                currency = settings.currency || 'INR';
                currencySymbol = currencySymbols[currency] || '₹';
            }
        } catch (err) {
            console.warn('Failed to fetch currency settings, using default:', err);
        }

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

        // Generate Professional PDF
        const doc = new PDFDocument({
            margin: 50,
            size: 'A4'
        });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="expense_report.pdf"');

        doc.pipe(res);

        // Header with colored background
        doc.rect(0, 0, doc.page.width, 120).fill('#6366F1');

        // Title
        doc.fillColor('#FFFFFF')
            .fontSize(28)
            .font('Helvetica-Bold')
            .text('Monthly Expense Report', 50, 40, { align: 'center' });

        // Date
        doc.fontSize(12)
            .font('Helvetica')
            .text(`Generated on: ${new Date().toLocaleDateString()}`, 50, 80, { align: 'center' });

        doc.moveDown(3);

        // Summary Section
        doc.fillColor('#1F2937')
            .fontSize(18)
            .font('Helvetica-Bold')
            .text('Summary', 50, 150);

        doc.moveTo(50, 175)
            .lineTo(doc.page.width - 50, 175)
            .strokeColor('#6366F1')
            .lineWidth(2)
            .stroke();

        doc.moveDown(0.5);

        // Total Expenses Box
        const totalY = doc.y + 10;
        doc.roundedRect(50, totalY, doc.page.width - 100, 60, 10)
            .fillAndStroke('#F0F4FF', '#6366F1');

        doc.fillColor('#6366F1')
            .fontSize(14)
            .font('Helvetica')
            .text('Total Expenses', 70, totalY + 15);

        doc.fillColor('#1F2937')
            .fontSize(24)
            .font('Helvetica-Bold')
            .text(`${currencySymbol}${totalAmount.toFixed(2)}`, 70, totalY + 32);

        doc.moveDown(3);

        // Category Breakdown
        doc.fillColor('#1F2937')
            .fontSize(16)
            .font('Helvetica-Bold')
            .text('Category Breakdown', 50);

        doc.moveDown(0.5);

        const categoryColors = {
            'Food': '#10B981',
            'Travel': '#3B82F6',
            'Bills': '#EF4444',
            'Shopping': '#F59E0B',
            'Others': '#8B5CF6'
        };

        Object.entries(categoryTotals).forEach(([cat, amount], index) => {
            const y = doc.y;
            const color = categoryColors[cat] || '#6B7280';

            // Category color indicator
            doc.roundedRect(50, y, 8, 20, 2).fill(color);

            // Category name
            doc.fillColor('#1F2937')
                .fontSize(12)
                .font('Helvetica')
                .text(cat, 70, y + 2);

            // Amount
            doc.fontSize(12)
                .font('Helvetica-Bold')
                .text(`${currencySymbol}${amount.toFixed(2)}`, doc.page.width - 150, y + 2, { align: 'right' });

            doc.moveDown(1);
        });

        doc.moveDown();

        // AI Insights Section
        doc.fillColor('#1F2937')
            .fontSize(18)
            .font('Helvetica-Bold')
            .text('AI Insights', 50);

        doc.moveTo(50, doc.y + 5)
            .lineTo(doc.page.width - 50, doc.y + 5)
            .strokeColor('#6366F1')
            .lineWidth(2)
            .stroke();

        doc.moveDown(0.5);

        // Insights box
        const insightsY = doc.y;
        doc.roundedRect(50, insightsY, doc.page.width - 100, null)
            .fillOpacity(0.05)
            .fill('#6366F1')
            .fillOpacity(1);

        doc.fillColor('#374151')
            .fontSize(11)
            .font('Helvetica')
            .text(insights, 65, insightsY + 15, {
                width: doc.page.width - 130,
                align: 'justify',
                lineGap: 4
            });

        doc.moveDown(2);

        // Check if we need a new page for the detailed list
        if (doc.y > doc.page.height - 200) {
            doc.addPage();
        }

        // Detailed Expenses
        doc.fillColor('#1F2937')
            .fontSize(18)
            .font('Helvetica-Bold')
            .text('Detailed Expenses', 50);

        doc.moveTo(50, doc.y + 5)
            .lineTo(doc.page.width - 50, doc.y + 5)
            .strokeColor('#6366F1')
            .lineWidth(2)
            .stroke();

        doc.moveDown(1);

        // Table header
        const tableTop = doc.y;
        doc.fontSize(10)
            .font('Helvetica-Bold')
            .fillColor('#FFFFFF');

        doc.rect(50, tableTop - 5, doc.page.width - 100, 25).fill('#6366F1');

        doc.text('Date', 60, tableTop, { width: 80, continued: false });
        doc.text('Category', 150, tableTop, { width: 100, continued: false });
        doc.text('Description', 260, tableTop, { width: 150, continued: false });
        doc.text('Amount', 420, tableTop, { width: 100, align: 'right', continued: false });

        doc.moveDown(0.8);

        // Table rows
        expenses.forEach((e, index) => {
            // Check if we need a new page
            if (doc.y > doc.page.height - 100) {
                doc.addPage();
            }

            const rowY = doc.y;
            const rowHeight = 35;

            // Alternating row background
            if (index % 2 === 0) {
                doc.rect(50, rowY - 5, doc.page.width - 100, rowHeight).fill('#F9FAFB');
            }

            doc.fillColor('#374151')
                .fontSize(10)
                .font('Helvetica')
                .text(new Date(e.date).toLocaleDateString(), 60, rowY, { width: 80, continued: false });

            const catColor = categoryColors[e.category] || '#6B7280';
            doc.fillColor(catColor)
                .font('Helvetica-Bold')
                .text(e.category, 150, rowY, { width: 100, continued: false });

            doc.fillColor('#6B7280')
                .fontSize(9)
                .font('Helvetica')
                .text(e.description.substring(0, 40) + (e.description.length > 40 ? '...' : ''), 260, rowY, { width: 150, continued: false });

            doc.fillColor('#1F2937')
                .fontSize(10)
                .font('Helvetica-Bold')
                .text(`${currencySymbol}${e.amount.toFixed(2)}`, 420, rowY, { width: 100, align: 'right', continued: false });

            doc.moveDown(1.2);
        });

        // Note: Footer disabled to prevent pagination issues
        // PDFKit's bufferedPageRange() doesn't work reliably in all cases

        doc.end();

    } catch (error) {
        console.error('Error exporting PDF:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        }
    }
};

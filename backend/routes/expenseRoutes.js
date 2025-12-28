const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');

// POST /api/expenses - Add a new expense (raw text input)
router.post('/', expenseController.addExpense);

// GET /api/expenses - List expenses
router.get('/', expenseController.getExpenses);

// GET /api/expenses/export/csv - Export to CSV
router.get('/export/csv', expenseController.exportCSV);

// GET /api/expenses/export/pdf - Export to PDF
router.get('/export/pdf', expenseController.exportPDF);

module.exports = router;

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// GET /api/reports/daily?uid=xxx&date=2025-12-28
router.get('/daily', reportController.getDaily);

// GET /api/reports/weekly?uid=xxx&startDate=2025-12-22
router.get('/weekly', reportController.getWeekly);

// GET /api/reports/monthly?uid=xxx&month=12&year=2025
router.get('/monthly', reportController.getMonthly);

module.exports = router;

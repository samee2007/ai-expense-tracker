const express = require('express');
const cors = require('cors');
require('dotenv').config();

const expenseRoutes = require('./routes/expenseRoutes');
const reportRoutes = require('./routes/reportRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);

// Static files and index.html are served by express.static above

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

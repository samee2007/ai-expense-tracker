import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js';

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCwG7IBgaLd1q6fzoOlYtsj2sSIuxNwx7Y",
    authDomain: "ai-expense-tracker-13738.firebaseapp.com",
    projectId: "ai-expense-tracker-13738",
    storageBucket: "ai-expense-tracker-13738.firebasestorage.app",
    messagingSenderId: "332700367702",
    appId: "1:332700367702:web:132607c5fc4f0c3ee834f7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

let currentUser = null;
const API_BASE = 'http://localhost:5000/api/reports';

// Auth State
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        initializePage();
    } else {
        window.location.href = 'index.html';
    }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    signOut(auth);
});

// Initialize Page
function initializePage() {
    // Set default dates
    const today = new Date();
    document.getElementById('dailyDatePicker').valueAsDate = today;
    document.getElementById('weeklyDatePicker').valueAsDate = getMonday(today);
    document.getElementById('monthSelect').value = today.getMonth() + 1;
    document.getElementById('yearInput').value = today.getFullYear();
}

// Get Monday of current week
function getMonday(d) {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

// Load Daily Report
window.loadDailyReport = async function () {
    const date = document.getElementById('dailyDatePicker').value;
    if (!date || !currentUser) return;

    try {
        const response = await fetch(`${API_BASE}/daily?uid=${currentUser.uid}&date=${date}`);
        const data = await response.json();

        renderSummary(data.summary, 'dailySummary');
        renderExpenseList(data.expenses, 'dailyExpenses');
    } catch (error) {
        console.error('Error loading daily report:', error);
        alert('Failed to load daily report');
    }
};

// Load Weekly Report
window.loadWeeklyReport = async function () {
    const startDate = document.getElementById('weeklyDatePicker').value;
    if (!startDate || !currentUser) return;

    try {
        const response = await fetch(`${API_BASE}/weekly?uid=${currentUser.uid}&startDate=${startDate}`);
        const data = await response.json();

        renderSummary(data.summary, 'weeklySummary');
        renderExpenseList(data.expenses, 'weeklyExpenses');
    } catch (error) {
        console.error('Error loading weekly report:', error);
        alert('Failed to load weekly report');
    }
};

// Load Monthly Report
window.loadMonthlyReport = async function () {
    const month = document.getElementById('monthSelect').value;
    const year = document.getElementById('yearInput').value;
    if (!month || !year || !currentUser) return;

    try {
        const response = await fetch(`${API_BASE}/monthly?uid=${currentUser.uid}&month=${month}&year=${year}`);
        const data = await response.json();

        renderSummary(data.summary, 'monthlySummary');
        renderExpenseList(data.expenses, 'monthlyExpenses');
    } catch (error) {
        console.error('Error loading monthly report:', error);
        alert('Failed to load monthly report');
    }
};

// Render Summary Cards
function renderSummary(summary, containerId) {
    const container = document.getElementById(containerId);

    const html = `
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card text-center shadow-sm">
                    <div class="card-body">
                        <h6 class="text-muted">Total Spent</h6>
                        <h3 class="text-primary">₹${summary.totalAmount}</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center shadow-sm">
                    <div class="card-body">
                        <h6 class="text-muted">Transactions</h6>
                        <h3 class="text-success">${summary.expenseCount}</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center shadow-sm">
                    <div class="card-body">
                        <h6 class="text-muted">Avg/Day</h6>
                        <h3 class="text-info">₹${summary.avgPerDay}</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center shadow-sm">
                    <div class="card-body">
                        <h6 class="text-muted">Top Category</h6>
                        <h3 class="text-warning">${summary.topCategory?.name || 'N/A'}</h3>
                        <small class="text-muted">₹${summary.topCategory?.amount || 0}</small>
                    </div>
                </div>
            </div>
        </div>
        <div class="row mb-4">
            <div class="col-md-6">
                <div class="card shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title mb-3">Category Distribution</h5>
                        <canvas id="${containerId}-chart" style="max-height: 300px;"></canvas>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title">Category Breakdown</h5>
                        <div class="row mt-3">
                            ${Object.entries(summary.categoryTotals).map(([cat, amt]) => `
                                <div class="col-12 mb-2 d-flex justify-content-between">
                                    <span><strong>${cat}:</strong></span>
                                    <span class="text-primary">₹${amt}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Render chart after DOM update
    setTimeout(() => renderCategoryChart(summary.categoryTotals, `${containerId}-chart`), 100);
}

// Render Expense List
function renderExpenseList(expenses, containerId) {
    const container = document.getElementById(containerId);

    if (expenses.length === 0) {
        container.innerHTML = '<div class="alert alert-info">No expenses found for this period.</div>';
        return;
    }

    const html = `
        <div class="card shadow-sm">
            <div class="card-header bg-white">
                <h5 class="mb-0">Expense Details</h5>
            </div>
            <div class="table-responsive">
                <table class="table table-hover mb-0">
                    <thead class="table-light">
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Category</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${expenses.map(e => `
                            <tr>
                                <td>${new Date(e.date).toLocaleDateString()}</td>
                                <td>${e.description}</td>
                                <td><span class="badge bg-secondary">${e.category}</span></td>
                                <td>₹${e.amount}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// Render Category Pie Chart
let chartInstances = {};

function renderCategoryChart(categoryTotals, canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }

    const categories = Object.keys(categoryTotals);
    const amounts = Object.values(categoryTotals);

    // Category colors matching the badge colors
    const colors = categories.map(cat => {
        const colorMap = {
            'Food': 'rgb(16, 185, 129)',       // Green
            'Travel': 'rgb(59, 130, 246)',     // Blue
            'Bills': 'rgb(239, 68, 68)',       // Red
            'Shopping': 'rgb(245, 158, 11)',   // Amber
            'Others': 'rgb(139, 92, 246)'      // Purple
        };
        return colorMap[cat] || 'rgb(107, 114, 128)';
    });

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categories,
            datasets: [{
                data: amounts,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12,
                            family: 'Inter'
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ₹${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

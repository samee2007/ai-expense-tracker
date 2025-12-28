// Import Firebase functions from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- Firebase Configuration ---
// REPLACE WITH YOUR FIREBASE CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyCwG7IBgaLd1q6fzoOlYtsj2sSIuxNwx7Y",
    authDomain: "ai-expense-tracker-13738.firebaseapp.com",
    projectId: "ai-expense-tracker-13738",
    storageBucket: "ai-expense-tracker-13738.firebasestorage.app",
    messagingSenderId: "332700367702",
    appId: "1:332700367702:web:132607c5fc4f0c3ee834f7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// --- DOM Elements ---
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const addExpenseBtn = document.getElementById('addExpenseBtn');
const expenseInput = document.getElementById('expenseInput');
const expenseTableBody = document.getElementById('expenseTableBody');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const currencySelector = document.getElementById('currencySelector');
const reportsBtn = document.getElementById('reportsBtn');

const API_URL = 'http://localhost:5000/api/expenses'; // Adjust if backend runs elsewhere
const SETTINGS_URL = 'http://localhost:5000/api/settings';

let currentUser = null;
let currentCurrency = 'INR';
let currencySymbol = '₹';

// Currency symbols map
const currencySymbols = {
    'INR': '₹',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥'
};

// --- Auth State Listener ---
// --- Auth State Listener ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        showDashboard();
        loadUserSettings();
        fetchExpenses();
    } else {
        currentUser = null;
        showLogin();
    }
});

// --- UI Functions ---
function showLogin() {
    loginSection.classList.remove('d-none');
    dashboardSection.classList.add('d-none');
    logoutBtn.classList.add('d-none');
}

function showDashboard() {
    loginSection.classList.add('d-none');
    dashboardSection.classList.remove('d-none');
    logoutBtn.classList.remove('d-none');
    currencySelector.classList.remove('d-none');
    reportsBtn.classList.remove('d-none');
}

// --- Currency Management ---
async function loadUserSettings() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${SETTINGS_URL}?uid=${currentUser.uid}`);
        const settings = await response.json();

        currentCurrency = settings.currency || 'INR';
        currencySymbol = currencySymbols[currentCurrency];
        currencySelector.value = currentCurrency;
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function saveCurrency(currency) {
    if (!currentUser) return;

    try {
        await fetch(SETTINGS_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: currentUser.uid, currency })
        });

        currentCurrency = currency;
        currencySymbol = currencySymbols[currency];

        // Refresh expense display
        fetchExpenses();
    } catch (error) {
        console.error('Error saving currency:', error);
    }
}

// Currency selector change handler
currencySelector.addEventListener('change', (e) => {
    saveCurrency(e.target.value);
});

// --- Event Listeners ---
loginBtn.addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Login failed", error);
        alert("Login failed: " + error.message);
    }
});

logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

addExpenseBtn.addEventListener('click', addExpense);
expenseInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addExpense();
});

exportCsvBtn.addEventListener('click', () => {
    if (!currentUser) return;
    window.open(`${API_URL}/export/csv?uid=${currentUser.uid}`, '_blank');
});

exportPdfBtn.addEventListener('click', () => {
    if (!currentUser) return;
    window.open(`${API_URL}/export/pdf?uid=${currentUser.uid}`, '_blank');
});

// --- API Functions ---
async function addExpense() {
    const text = expenseInput.value.trim();
    if (!text || !currentUser) return;

    // Show loading state (simple)
    addExpenseBtn.disabled = true;
    addExpenseBtn.textContent = 'Processing...';

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                uid: currentUser.uid
            })
        });

        if (!response.ok) throw new Error('Failed to add expense');

        const newExpense = await response.json();
        expenseInput.value = '';
        fetchExpenses(); // Refresh list
    } catch (error) {
        console.error("Error adding expense:", error);
        alert("Error: " + error.message);
    } finally {
        addExpenseBtn.disabled = false;
        addExpenseBtn.textContent = 'Add';
    }
}

async function fetchExpenses() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_URL}?uid=${currentUser.uid}`);
        if (!response.ok) throw new Error('Failed to fetch expenses');

        const expenses = await response.json();
        renderExpenses(expenses);
    } catch (error) {
        console.error("Error fetching expenses:", error);
    }
}

function renderExpenses(expenses) {
    expenseTableBody.innerHTML = '';

    if (expenses.length === 0) {
        expenseTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No expenses found. Try adding one!</td></tr>';
        return;
    }

    expenses.forEach(expense => {
        const date = new Date(expense.date).toLocaleDateString();
        const badgeClass = getCategoryBadgeClass(expense.category);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${date}</td>
            <td>${expense.description}</td>
            <td><span class="badge ${badgeClass}">${expense.category}</span></td>
            <td>${currencySymbol}${expense.amount}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editExpense('${expense.id}')">
                    <i class="bi bi-pencil"></i> Edit
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteExpense('${expense.id}')">
                    <i class="bi bi-trash"></i> Delete
                </button>
            </td>
        `;
        expenseTableBody.appendChild(row);
    });
}

// Edit Expense
window.editExpense = async function (expenseId) {
    if (!currentUser) return;

    try {
        // Fetch expense data
        const response = await fetch(`${API_URL}?uid=${currentUser.uid}`);
        const expenses = await response.json();
        const expense = expenses.find(e => e.id === expenseId);

        if (!expense) {
            alert('Expense not found');
            return;
        }

        // Populate modal
        document.getElementById('editExpenseId').value = expenseId;
        document.getElementById('editAmount').value = expense.amount;
        document.getElementById('editCategory').value = expense.category;
        document.getElementById('editDate').value = expense.date.split('T')[0];
        document.getElementById('editDescription').value = expense.description;

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('editModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading expense:', error);
        alert('Failed to load expense data');
    }
};

// Save Edited Expense
document.getElementById('saveEditBtn').addEventListener('click', async function () {
    const expenseId = document.getElementById('editExpenseId').value;
    const amount = parseFloat(document.getElementById('editAmount').value);
    const category = document.getElementById('editCategory').value;
    const date = document.getElementById('editDate').value;
    const description = document.getElementById('editDescription').value;

    if (!currentUser || !expenseId) return;

    try {
        const response = await fetch(`${API_URL}/${expenseId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uid: currentUser.uid,
                amount,
                category,
                date,
                description
            })
        });

        if (!response.ok) throw new Error('Failed to update expense');

        // Close modal and refresh
        bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
        fetchExpenses();
        alert('Expense updated successfully!');
    } catch (error) {
        console.error('Error updating expense:', error);
        alert('Failed to update expense');
    }
});

// Delete Expense
window.deleteExpense = async function (expenseId) {
    if (!currentUser) return;

    if (!confirm('Are you sure you want to delete this expense?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${expenseId}?uid=${currentUser.uid}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete expense');

        fetchExpenses();
        alert('Expense deleted successfully!');
    } catch (error) {
        console.error('Error deleting expense:', error);
        alert('Failed to delete expense');
    }
};

// Helper: Get badge class based on category
function getCategoryBadgeClass(category) {
    const classMap = {
        'Food': 'badge-food',
        'Travel': 'badge-travel',
        'Bills': 'badge-bills',
        'Shopping': 'badge-shopping',
        'Others': 'badge-others'
    };
    return classMap[category] || 'bg-secondary';
}

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

const API_URL = 'http://localhost:5000/api/expenses'; // Adjust if backend runs elsewhere

let currentUser = null;

// --- Auth State Listener ---
// --- Auth State Listener ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        showDashboard();
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
}

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
        expenseTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No expenses found. Try adding one!</td></tr>';
        return;
    }

    expenses.forEach(expense => {
        const date = new Date(expense.date).toLocaleDateString();
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${date}</td>
            <td>${expense.description}</td>
            <td><span class="badge bg-secondary">${expense.category}</span></td>
            <td>₹${expense.amount}</td>
        `;
        expenseTableBody.appendChild(row);
    });
}

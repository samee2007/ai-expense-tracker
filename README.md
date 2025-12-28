# AI Expense Tracker using Gemini & Firebase

## 🧩 Project Overview
Managing daily expenses is a common challenge for college and hostel students. 
This project provides an AI-powered expense tracking solution that allows users 
to enter expenses in natural language (e.g., "milk 100 yesterday"), automatically 
categorizes them, stores them securely, and generates meaningful summaries.

The system is designed to solve a **local campus-level problem** using 
**Google technologies** like Gemini AI and Firebase.

---

## 🎯 Problem Statement
Students often fail to track small daily expenses such as food, travel, and groceries, 
leading to overspending and poor financial awareness. Existing apps require manual 
category selection and date input, making them inconvenient for daily use.

---

## 💡 Solution
An AI-based expense tracker where:
- Users log expenses using simple text
- Gemini AI categorizes expenses automatically
- Dates like "yesterday" or "14 Dec" are understood
- Data is securely stored using Firebase
- Users can view summaries and export reports

---

## 🚀 Features
- Google Sign-In Authentication
- Natural language expense entry
- Automatic expense categorization using Gemini AI
- Firestore-based secure storage
- Monthly expense summaries
- CSV export for detailed expenses
- PDF export with AI-generated insights

---

## 🛠️ Tech Stack

### Frontend
- HTML
- CSS
- JavaScript

### Backend
- Node.js
- Express.js

### AI
- Google Gemini API

### Database & Auth
- Firebase Firestore
- Firebase Authentication (Google Login)

---

## 🧠 System Architecture
User
↓
Frontend (Web App)
↓
Backend (Node.js + MCP)
↓
Gemini AI (Categorization & Insights)
↓
Firebase Firestore (Storage)

---

## 📂 Firestore Structure
users
└── uid
└── expenses
└── expenseId


---

## 📤 Export Functionality
- **CSV Export**: Detailed list of expenses for a selected month
- **PDF Export**: Monthly summary report with AI-generated insights

---

## 🔐 Security
- Authentication handled by Firebase
- User-specific data isolation using UID
- Backend-controlled AI access

---

## 📈 Future Enhancements
- Budget alerts using Cloud Messaging
- Bill image upload using Cloud Storage
- Weekly summary reports
- Shared expense tracking

---

## 🏆 Hackathon Relevance
- Solves a real campus-level problem
- Uses Google technologies
- AI-driven innovation
- Scalable and practical solution

---

## 👩‍💻 Developed By
Sameeksha A  
BE Computer Science  
Hackathon Project – TechSprint 2025

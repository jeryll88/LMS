# School Library Management System (LMS)

A modern, responsive, and secure full-stack School Library Management System built with React.js (Vite), Node.js (Express.js), and Neon PostgreSQL.

## 🌟 Tech Stack
- **Frontend**: React.js 18, Vite, React Router 6, Tailwind CSS, Axios
- **Backend**: Node.js, Express.js, JSON Web Tokens (JWT), Bcrypt, pg (node-postgres)
- **Database**: Neon Serverless PostgreSQL
- **Deployment Ready**: Vercel (Frontend), Render (Backend)

---

## 👥 Supported Roles & Permissions
1. **Administrator**: System-wide access, user account management (students & librarians), book catalog, inventory, reservations, activity audit logs, and reports.
2. **Librarian**: Daily library operations, physical copy registration, issuing book loans, returns, queue approval, overdue monitoring.
3. **Student (User)**: Catalog browsing, search/filter, book reservation requests, renewal requests, personal loan history, and in-system notifications.

---

## 🚀 Running Locally

### 1. Backend Setup
```bash
cd backend
npm install
# Ensure .env contains your DATABASE_URL, PORT=5000, JWT_SECRET
node server.js
```
The backend server runs on `http://localhost:5000`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your web browser.

---

## 📦 Default Accounts (from Neon Database)
- **Administrator**: `admin@school.edu` (Username: `admin`)
- **Librarian**: `librarian@school.edu` (Username: `librarian`)
- **Student**: `student_test_855@example.com` or register a new student account at `/register`.

# 📚 Flashcards App — Spaced Repetition Learning System

A full-stack flashcards application built with React and Node.js that implements a custom spaced repetition algorithm.

The app helps users learn vocabulary efficiently by automatically scheduling reviews based on performance. It supports deck management, bulk operations, multilingual interface, and detailed learning statistics.

This project demonstrates full-stack architecture, REST API design, authentication, state management, and interval-based learning logic.

---

## 🚀 Live Demo

Frontend: [Add your frontend URL here]  
Backend API: [Add your backend URL here]

Demo account:
email: demo@demo.com
password: demo123
---

## ✨ Features

- 🔐 Authentication (JWT)
- 🧠 Custom spaced repetition algorithm
- 🗂 Deck (Topic) management
- 📦 Bulk actions (move / delete multiple cards)
- 🌍 Multi-language UI (DE / EN / UK)
- 🌙 Dark / Light mode
- 📊 Learning statistics
- ⏳ Next review time preview in library
- 📁 Import / Export (JSON / CSV)

---

## 🧠 Spaced Repetition Logic

Each card follows a fixed interval progression:

1 min → 5 min → 10 min → 30 min → 1h → 3h → 6h → 12h →
1d → 3d → 7d → 14d → 21d → 28d → 28d


- If the user answers correctly → interval increases.
- If the user answers incorrectly → progress resets to 1 minute.
- After reaching 28 days, the interval stays at 28 days.

The next review timestamp is stored in the database and recalculated after every review.

This approach ensures long-term retention using interval-based scheduling.

---

## 🛠 Tech Stack

Frontend:
- React (Vite)
- CSS (custom styling)
- React Router

Backend:
- Node.js
- Express
- MongoDB (Mongoose)
- JWT Authentication

Architecture:
- REST API
- Token-based authentication
- Interval-based scheduling logic

---

## 📷 Screenshots

### ⚡ Review Mode
(Add screenshot here)

### 📖 Library
(Add screenshot here)

### 🗂 Deck Manager
(Add screenshot here)

---

## 📦 Project Structure

/client → React frontend
/server → Express backend


---

## 🧩 Future Improvements

- Custom interval settings
- Push/email reminders
- Mobile-first UI improvements
- PWA support
- Performance optimization for large datasets

---

## 📌 Author

Your Name  
Junior Full-Stack Developer  

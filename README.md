# 🍽️ Restaurant Reservation System — Admin Dashboard

A **full-stack restaurant table reservation system** built with **HTML, CSS, Vanilla JavaScript and Node.js**, featuring an **admin dashboard**, **drag & drop reservations**, **mobile-first UI** and an **offline SQLite database**.

Designed to simulate a **real SaaS product** used by restaurants to manage bookings efficiently.

---

## 🚀 Live Concept

> 🧠 This project focuses on **real-world business logic**, not just UI.  
> Everything works offline and can be easily upgraded to a production database.

---

## 🛠️ Technologies Used

<p align="left">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" />
  <img src="https://img.shields.io/badge/JavaScript-323330?style=for-the-badge&logo=javascript&logoColor=F7DF1E" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />
</p>

---

## ✨ Features

### 📅 Reservation Management
- Weekly calendar view
- Time slots from opening to closing hours
- Drag & drop reservations between time slots
- Create reservations by clicking or dragging over time intervals
- Support for start time and end time

### 🏷️ Status Control
- Waiting Confirmation
- Confirmed
- Cancelled
- Change status via drag & drop

### 🧑‍💼 Admin Dashboard
- Reservation History panel
- Closed Days & Hours configuration
- Capacity per slot control
- Full CRUD (Create, Read, Update, Delete)

### 📱 Responsive Design
- Mobile-first approach
- Fully responsive (Desktop, Tablet & Mobile)
- Collapsible sidebar with hamburger menu
- Optimized for iPhone Safari

### 🗄️ Offline Database
- SQLite local database
- Auto-created on first run
- No internet required
- Persistent data storage

### 🆘 Help & Support
- Help modal
- WhatsApp support button (customizable)
- Preview mode with print support

---

## 📂 Project Structure

```text
restaurant-reservation-system/
├── server.js
├── db.js
├── package.json
├── data/
│   └── app.db
├── public/
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── assets/
└── README.md
▶️ How to Run Locally
1️⃣ Clone the repository
bash
Copiar código
git clone https://github.com/your-username/restaurant-reservation-dashboard.git
2️⃣ Install dependencies
bash
Copiar código
npm install
3️⃣ Start the server
bash
Copiar código
npm start
4️⃣ Open in browser
arduino
Copiar código
http://localhost:3000
🧪 Database Details
Engine: SQLite

File location: data/app.db

Tables:

reservations

settings

closed_days

⚠️ The database file is ignored by Git for safety and consistency.

🎯 Project Goals
✔ Practice full-stack development
✔ Simulate a real restaurant workflow
✔ Apply clean architecture
✔ Work without frameworks
✔ Build something usable, not just visual

🔮 Future Improvements
🔐 Authentication & roles

📊 Reports and analytics

🌍 Multi-restaurant support

☁️ Cloud database (PostgreSQL)

📲 Public booking page for customers

👤 Author
Vitor Dutra Melo
💻 Software Developer
📍 London, UK

🔗 GitHub: https://github.com/your-username
🔗 LinkedIn: https://www.linkedin.com/in/vitordutramelo

⭐ If you found this project useful, feel free to star the repository!

# 🍽️ Restaurant Reservation System — Admin Dashboard

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![SQLite](https://img.shields.io/badge/Database-SQLite-blue)
![Vanilla JS](https://img.shields.io/badge/Frontend-Vanilla%20JS-yellow)
![Offline](https://img.shields.io/badge/Mode-Offline--First-orange)
![Status](https://img.shields.io/badge/Project-Active-success)

A **full-stack restaurant table reservation system** built with **HTML, CSS, Vanilla JavaScript and Node.js**, featuring an **admin dashboard**, **drag & drop reservations**, **mobile-first UI** and an **offline SQLite database**.

Designed to **simulate a real SaaS product** used by restaurants to manage reservations efficiently.

---

## 🧠 Project Philosophy

This project focuses on **real business logic**, not just UI.

✔ Offline-first architecture  
✔ Real reservation workflow  
✔ Admin-only control panel  
✔ Ready to scale to production databases  

---

## ✨ Features

### 📅 Reservation Management
- Weekly calendar view  
- Time slots from opening to closing hours  
- Create reservations by clicking or dragging over time intervals  
- Drag & drop reservations between slots  
- Support for start and end times  

### 🏷️ Status Control
- Waiting Confirmation  
- Confirmed  
- Cancelled  
- Change status via drag & drop  

### 🧑‍💼 Admin Dashboard
- Reservation history panel  
- Closed days & hours configuration  
- Capacity per slot control  
- Full CRUD (Create, Read, Update, Delete)  

### 📱 Responsive Design
- Mobile-first approach  
- Fully responsive (Desktop / Tablet / Mobile)  
- Collapsible sidebar with hamburger menu  
- Optimized for iPhone Safari  

### 🗄️ Offline Database
- SQLite local database  
- Auto-created on first run  
- Persistent data storage  
- No internet required  

### 🆘 Help & Support
- Help modal  
- WhatsApp support button (customizable)  
- Preview mode with print support  

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript  
- **Backend:** Node.js, Express  
- **Database:** SQLite  
- **Architecture:** Offline-first  
- **Tools:** Git, GitHub  

---

## 📡 API Endpoints (Main)

```http
GET    /api/reservations
POST   /api/reservations
PUT    /api/reservations/:id
DELETE /api/reservations/:id

GET    /api/settings
PUT    /api/settings

GET    /api/closed-days
POST   /api/closed-days
DELETE /api/closed-days/:id
All endpoints interact with a local SQLite database.

📂 Project Structure
pgsql
Copiar código
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
▶️ Run Locally
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

File: data/app.db

Tables:

reservations

settings

closed_days

⚠️ The database file is ignored by Git for safety and consistency.

🎯 Project Goals
✔ Practice full-stack development
✔ Simulate a real restaurant workflow
✔ Apply clean architecture principles
✔ Work without frameworks
✔ Build something usable, not just visual

🔮 Future Improvements
🔐 Authentication & roles (admin / staff)

📊 Reports and analytics

🌍 Multi-restaurant support

☁️ Cloud database (PostgreSQL)

📲 Public booking page for customers

👤 Author
Vitor Dutra Melo
💻 Software Developer
📍 London, UK

🔗 GitHub: https://github.com/Vitor2209
🔗 LinkedIn: https://www.linkedin.com/in/vitordutramelo

⭐ If you found this project useful, feel free to star the repository!

markdown
Copiar código

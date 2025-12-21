# PortCity PIIRS – Server Side

![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js\&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express\&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb\&logoColor=white)
![Firebase Admin](https://img.shields.io/badge/Firebase_Admin-13-FFCA28?logo=firebase\&logoColor=black)
![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?logo=stripe\&logoColor=white)

> **Public Infrastructure Issue Reporting System (PIIRS)**
> Server-side REST API powering the PortCity PIIRS platform.

---

## 🌐 Project Overview

The **PIIRS Server** is the backend service responsible for handling all core business logic, data storage, authentication verification, and payment processing for the **PortCity Public Infrastructure Issue Reporting System**.

It provides secure and scalable APIs that enable:

* Citizens to submit and track infrastructure issues
* Admins to manage, verify, and assign issues
* Staff to update progress and resolution status
* Premium services via payment integration

---

## 🎯 Responsibilities of the Server

* RESTful API for client-side application
* Secure data storage with MongoDB
* Firebase Admin SDK for authentication & role verification
* Issue lifecycle management
* Premium subscription/payment handling
* Status tracking & updates

---

## ⚙️ Core Features

* 🏗️ **Issue Management API**
  Create, read, update, and delete infrastructure issue reports

* 👥 **Role-Based Access Control**
  Citizen, Admin, and Staff role validation

* 🔐 **Authentication Verification**
  Firebase Admin SDK for token verification

* 💳 **Premium Payment Integration**
  Stripe-based payment flow for premium citizens

* 📊 **Status Workflow Handling**
  `Pending → In Progress → Resolved → Closed`

* 🌍 **CORS & Environment Config**
  Secure cross-origin access and environment-based configuration

---

## 🛠 Tech Stack

* **Runtime:** Node.js
* **Framework:** Express.js 5
* **Database:** MongoDB (Native Driver)
* **Authentication:** Firebase Admin SDK
* **Payments:** Stripe
* **Config & Security:** dotenv, CORS

---

## 📦 Packages

### Dependencies

* `express` – REST API framework
* `mongodb` – Database driver
* `firebase-admin` – Auth & admin operations
* `stripe` – Payment processing
* `cors` – Cross-origin resource sharing
* `dotenv` – Environment variable management

---

## 📁 Project Structure

```text
ph12_piirs_a11_server/
├─ index.js                 # Entry point
├─ routes/                  # API route handlers
├─ controllers/             # Request controllers
├─ services/                # Business logic & helpers
├─ middlewares/             # Auth & role middlewares
├─ config/                  # DB & Firebase config
├─ .env                     # Environment variables
├─ package.json
└─ README.md
```

> ⚠️ Folder names may vary based on implementation, but the structure follows standard Express best practices.

---

## 🚀 Getting Started

### Installation

```bash
npm install
```

### Run Server

```bash
npm start
```

The server will start on the port defined in your environment variables.

---

## 🔧 Environment Variables

Create a `.env` file in the root directory and add the following:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string

# Firebase Admin
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...

# Stripe
STRIPE_SECRET_KEY=...
```

> ⚠️ Never commit `.env` files to version control.

---

## 🔗 API Base URL

```
https://piirs-ea-server.vercel.app/
```

---

## 🔗 Important Links

* **Server Repository:** [https://github.com/efthi/ph12_piirs_a11_server](https://github.com/efthi/ph12_piirs_a11_server)
* **Client Repository:** [https://github.com/efthi/ph12_piirs_a11_client](https://github.com/efthi/ph12_piirs_a11_client)
* **Live Application:** [https://piirs-ea.web.app/](https://piirs-ea.web.app/)

---

## 📜 License

This project is licensed under the **ISC License**.

---

## ⭐ Notes

This backend is designed to be:

* Secure
* Scalable
* Production-ready

It complements the PIIRS client application to deliver a complete, real-world civic infrastructure reporting solution.

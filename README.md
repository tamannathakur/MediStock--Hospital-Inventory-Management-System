# 🏥 MediStock – Hospital Inventory Management System

MediStock is a **full-stack MERN-based hospital inventory management system** designed to streamline and digitize hospital supply workflows across **nurses, sister in-charges, HODs, inventory staff, and vendors**.

It ensures **real-time stock tracking**, **role-based approvals**, **vendor ETA handling**, and **OCR-based automated data entry**.

> 📌 Click the videos below to see MediStock in action

## 🎥 Demo Videos

### 🔄 Inventory Workflow Demo
https://github.com/user-attachments/assets/2dc0a967-7b73-474b-9124-246d69a796ca

### 🧾 OCR Scanning Demo
https://github.com/user-attachments/assets/bed03985-b70b-4a42-a1aa-c2016e9f4d19

---

## 🚀 Features

### 🔄 End-to-End Request Workflow

```
Nurse → Sister In-Charge → HOD → Inventory Staff → Vendor
```

### 📦 Multi-Level Inventory

* Central Store
* Department Store
* Nurse / Sister Almirahs

### 🧠 Smart Request Routing

* If item exists → fulfilled internally
* If item does not exist → auto store request → vendor flow

### ⏳ Vendor ETA Management

* Inventory staff assigns ETA (24h / 48h)
* Automated reminders before ETA expiry

### 🧾 OCR-Powered Data Entry (PaddleOCR)

* Scan vendor bills & handwritten notes
* Auto-extract product name and quantity
* Reduces manual work and human errors

### 📊 Complete Transaction Logs

* Vendor purchases
* Department transfers
* Inventory movement tracking

### 🔐 Secure Role-Based Access

* JWT authentication
* Roles:

  * Nurse
  * Sister In-Charge
  * HOD
  * Inventory Staff
  * Admin

---

## 🛠 Tech Stack

### Frontend

* React + TypeScript
* Vite
* Tailwind CSS

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT Authentication

### OCR

* PaddleOCR (Python-based OCR engine)

---

## 📂 Project Structure

```
MediStock/
│
├──ocr/PaddleOCR    #OCR
├── backend/        # Express + MongoDB backend
├── src/            # Frontend source (React + Vite)
├── public/
├── package.json
└── README.md
```

---

## ⚙️ Environment Variables (Backend)

Create a `.env` file inside the **backend** folder:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=5000
```

---

## ▶️ How to Run the Project

### 1️⃣ Run Backend

```bash
cd backend
npm install
npm start
```

Backend will run on:

```
http://localhost:5000
```

---

### 2️⃣ Run Frontend

From the **root folder**:

```bash
npm install
npm run dev
```

Frontend will run on:

```
http://localhost:8080
```

---

## 🧠 OCR Integration (PaddleOCR)

* OCR is used to scan **nurse requests and handwritten notes**
* Extracted data is processed and stored automatically
* Helps inventory staff reduce manual entry and improve accuracy

> The OCR service can be deployed as a **separate microservice** and connected to the backend via API.

---

## 🔄 Core Workflow Logic

### ✔ Item Available in Hospital

```
Nurse → Sister → Department Store → Nurse Almirah
```

### ✔ Item Available in Central Store

```
Nurse → Sister → HOD → Inventory → Department → Nurse
```

### ❌ Item Not Available

```
Nurse → Sister → HOD → Inventory → Vendor
                    ↓
                ETA Assigned
                    ↓
        Vendor Delivery → Inventory → Department → Nurse
```


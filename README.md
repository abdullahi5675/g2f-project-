# 🌾 G2F — Government-to-Farmers Direct Fertilizer Distribution System

A web-based system for distributing subsidised fertilizer to verified farmers in **Gwaram LGA, Jigawa State, Nigeria**.

Built as a **Final Year Project** using Node.js, Express, and PostgreSQL.

---

## 🚀 How to Run Locally

### 1. Prerequisites
- [Node.js](https://nodejs.org/) installed
- [PostgreSQL](https://www.postgresql.org/) installed and running

### 2. Clone the repository
```bash
git clone https://github.com/abdullahi5675/g2f-project-.git
cd g2f-project-
```

### 3. Install dependencies
```bash
npm install
```

### 4. Set up environment variables
Create a `.env` file in the root folder:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=g2f_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password
```

### 5. Set up the database
```bash
node setup-db.js
```

### 6. Start the server
```bash
npm run dev
```

Then open your browser and go to: **http://localhost:3000**

---

## 👥 Default Login Accounts

| Role | Username | Password |
|------|----------|----------|
| Enrolment Officer | `officer1` | `officer123` |
| Distribution Agent | `agent1` | `agent123` |
| Supervisor | `supervisor1` | `supervisor123` |

---

## 🗂️ System Features

- **Role-based access** — Officers register farmers, Agents distribute bags, Supervisors oversee everything
- **NIN Verification** — Farmer identity verified via National Identification Number
- **Voucher System** — Auto-generated voucher codes for each farmer
- **Fraud Detection** — Flags duplicate redemption attempts automatically
- **Audit Logging** — Full trail of all system actions
- **Pending Queue** — Officers can save unverified farmers for supervisor review
- **CSV Export** — Download all farmer records as a spreadsheet
- **Responsive UI** — Works on desktop and mobile

---

## 📍 Coverage Area
**Gwaram LGA, Jigawa State, Nigeria**  
Wards: Basirka, Dingaya, Fagam, Farin Dutse, Gwaram Tsohuwa, Kila, Kwandiko, Maruta, Sara, Tsangarwa, Zandam Nagog

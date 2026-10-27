# Cloud-Based Expense Tracker

A simple full-stack web app to record income and expenses, set budgets, view charts and reports, and export CSV - with data stored in the cloud (MongoDB Atlas).

**Stack:** HTML5, CSS3, JavaScript, Bootstrap 5, Chart.js | Node.js, Express, Mongoose, JWT, bcryptjs | MongoDB Atlas | Netlify (frontend) + Render (backend)

```
cloud-expense-tracker/
├── frontend/            (static site: 10 HTML pages, css/style.css, js/*.js)
├── backend/
│   ├── server.js        (Express app)
│   ├── config/db.js     (MongoDB connection)
│   ├── models/          (User, Transaction, Budget)
│   ├── routes/          (auth, transactions, budgets, dashboard, reports)
│   ├── middleware/      (auth.js JWT check, errorHandler.js)
│   ├── utils/           (helpers.js validation + dates, budgetSummary.js)
│   ├── tests/api.test.js
│   ├── .env.example
│   └── package.json
├── docs/PROJECT_REPORT.md   (college submission document)
├── .gitignore
└── README.md
```

---
## 1. Run it on your computer

1. Install **Node.js (LTS)** from https://nodejs.org and **VS Code**. Check: `node -v` and `npm -v`.
2. Create a free MongoDB Atlas database:
   - Sign up at https://www.mongodb.com/atlas -> create a free **M0** cluster.
   - *Database Access* -> Add database user (username + password, remember them).
   - *Network Access* -> Add IP address -> **Allow access from anywhere (0.0.0.0/0)** (needed for Render).
   - *Database* -> **Connect** -> Drivers -> copy the connection string.
3. Open the `backend` folder in a terminal:
   ```
   cd backend
   npm install
   cp .env.example .env        (Windows: copy .env.example .env)
   ```
4. Edit `backend/.env`:
   - `MONGO_URI` = your Atlas string (replace `<user>`, `<password>`; keep `/expense_tracker` before the `?`)
   - `JWT_SECRET` = a long random text. Generate one with:
     `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
5. Start the app: `npm run dev` (or `npm start`). You should see *MongoDB connected* and *Server running on http://localhost:5000*.
6. Open **http://localhost:5000** in your browser. (In development the backend also serves the `frontend` folder, so one command runs everything.)
   - Prefer VS Code Live Server? Open `frontend/index.html` with it (port 5500 is already allowed in CORS).

### Common problems
| Problem | Fix |
|---|---|
| `MONGO_URI is not set` | `.env` must be inside `backend/` and named exactly `.env` |
| `bad auth` / cannot connect | Wrong DB password (special characters must be URL-encoded) or IP not allowed in Atlas Network Access |
| "Cannot reach the server" in the browser | Backend not running, or CORS: add your frontend URL to `CLIENT_URL` |
| Charts empty | Add some transactions first - nothing is hard-coded |

---
## 2. Run the tests
```
cd backend
npm test
```
Tests use `mongodb-memory-server` (a temporary in-memory MongoDB; it downloads once, so the first run needs internet). They cover registration/login (valid, invalid, duplicate), unauthorized access, create/edit/delete, invalid amounts and dates, access to another user's records, search/filter/pagination, budget calculation and exceeded limits, dashboard totals, report date filtering and CSV export.

---
## 3. Test the API manually (optional)
```
curl http://localhost:5000/api/health
curl -X POST http://localhost:5000/api/auth/register -H "Content-Type: application/json" \
  -d '{"name":"Asha","email":"asha@test.com","password":"Password1"}'
# copy the token from the response, then:
curl http://localhost:5000/api/transactions -H "Authorization: Bearer YOUR_TOKEN"
```

---
## 4. Deploy

### a) Push to GitHub
```
git init
git add .
git commit -m "Cloud expense tracker"
```
Create an empty repository on GitHub, then run the `git remote add origin ...` and `git push -u origin main` commands GitHub shows. (`.env` is in `.gitignore`, so your secrets are not uploaded.)

### b) Backend on Render
1. https://render.com -> **New +** -> **Web Service** -> connect your GitHub repo.
2. Settings: **Root Directory** `backend` | **Build Command** `npm install` | **Start Command** `npm start`.
3. Environment variables: `MONGO_URI`, `JWT_SECRET`, `NODE_ENV=production`, `CLIENT_URL` (set after step c; for now `http://localhost:5000`).
4. Deploy. Open `https://YOUR-APP.onrender.com/api/health` - it should say the API is running. (Free instances sleep; the first request can take ~30-60 seconds.)

### c) Frontend on Netlify
1. Edit `frontend/js/api.js` and replace `PRODUCTION_API` with `https://YOUR-APP.onrender.com/api`. Commit and push.
2. https://netlify.com -> **Add new site** -> **Import from Git** (or drag-and-drop the `frontend` folder).
   If importing from Git: **Base directory** `frontend`, no build command, **Publish directory** `frontend`.
3. Copy your Netlify URL (e.g. `https://my-expenses.netlify.app`).

### d) Connect them (CORS)
In Render -> Environment, set `CLIENT_URL=https://my-expenses.netlify.app` (no trailing slash; comma-separate several URLs). Save - Render redeploys.

### e) Verify
Open the Netlify URL on your phone or another computer, register, add a transaction, check the dashboard. Data is stored in Atlas, so it follows your account to any device.

---
## 5. API summary
All responses look like `{ "success": true/false, "message": "...", "data": {...} }`. Private routes need `Authorization: Bearer <token>`.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login, returns JWT |
| GET | /api/auth/me | Current user |
| PUT | /api/auth/profile | Update name, currency, date format |
| PUT | /api/auth/change-password | Change password |
| GET | /api/transactions | List: `search, type, category, from, to, sortBy (date/amount), order, page, limit` |
| POST | /api/transactions | Create |
| GET / PUT / DELETE | /api/transactions/:id | Read / update / delete |
| GET | /api/budgets?month=YYYY-MM | List budgets |
| POST | /api/budgets | Create (category may be `Overall`) |
| GET | /api/budgets/summary?month=YYYY-MM | Budgets with spent, remaining, percent, status |
| GET / PUT / DELETE | /api/budgets/:id | Read / update / delete |
| GET | /api/dashboard/summary?month=YYYY-MM | Monthly totals, categories, 6-month trend, budgets |
| GET | /api/dashboard/recent-transactions | Latest transactions |
| GET | /api/reports/monthly?year=YYYY | 12-month income/expense |
| GET | /api/reports/category-wise?from&to&type | Category totals and share |
| GET | /api/reports/date-range?from&to | Totals + transactions |
| GET | /api/reports/export-csv?from&to | CSV download |

Status codes: 200 OK, 201 created, 400 validation error, 401 not logged in, 404 not found (also used for other people's records), 409 duplicate.

## 6. Design decisions worth knowing
- **Auth:** JWT (7 days) sent in the `Authorization` header and kept in the browser's `localStorage`. Simple for a student project; the passwords are hashed with bcryptjs and the user id always comes from the verified token. A production app could use httpOnly cookies instead.
- **Balances:** the dashboard shows the **monthly net** (income - expenses for the selected month) as the main figure, and the **all-time balance** separately and labelled.
- **Time zone:** dates are stored as UTC midnight of the chosen calendar day; "current month" is decided in IST (UTC+5:30).
- **Money:** stored as numbers rounded to 2 decimals.
- **Security:** bcrypt, JWT expiry, per-user queries on every route, rate limiting, Helmet headers, CORS allow-list, 10 KB body limit, `express-mongo-sanitize` + strict type checks (NoSQL injection), field whitelisting (mass assignment), HTML escaping in the UI (XSS), CSV formula-injection protection.

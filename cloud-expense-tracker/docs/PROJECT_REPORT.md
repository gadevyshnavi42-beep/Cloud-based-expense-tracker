# Cloud-Based Expense Tracker - Project Report

## 1. Abstract
The Cloud-Based Expense Tracker is a secure, responsive web application that helps individuals manage personal finances. Users record income and expenses, set monthly and category budgets, view charts and reports, and export data as CSV. The system uses HTML, CSS, JavaScript, Bootstrap 5 and Chart.js on the frontend; Node.js, Express and JWT authentication on the backend; and MongoDB Atlas for cloud storage. Hosting on Netlify and Render makes the data reachable from any device.

## 2. Introduction and Problem Statement
Many people track spending in notebooks or scattered spreadsheets, which are easy to lose, hard to analyse and not available everywhere. They also get no warning before overspending. This project provides a centralized, cloud-based tool that records every transaction, compares spending with budgets and presents clear summaries.

## 3. Objectives and Scope
**Objectives:** secure registration and login; manage income and expense records; budgets with warnings at 80% and when exceeded; dashboard, reports and CSV export; cloud deployment.
**Scope:** single-user accounts with strictly private data, INR default with a few other currencies, web access on desktop, tablet and mobile.
**Out of scope:** bank integration, multi-user shared budgets, receipt scanning, native mobile apps.

## 4. Existing System and Proposed System
**Existing:** paper notes and spreadsheets - manual totals, no alerts, no secure remote access, error-prone.
**Proposed:** web app with automatic totals computed by database aggregation, budget alerts, charts, filters, export, JWT-secured access and cloud storage.

## 5. Software and Hardware Requirements
| Software | Hardware |
|---|---|
| Node.js LTS, npm | Any PC/laptop with 4 GB RAM, dual-core CPU |
| VS Code, Git | Internet connection |
| MongoDB Atlas (free M0) | Modern browser device (phone, tablet, PC) |
| Chrome / Edge / Firefox | |

## 6. System Architecture
```
 Browser (Netlify)                      Render                         MongoDB Atlas
 HTML/CSS/JS, Bootstrap, Chart.js  --->  Express REST API  --->  Mongoose  --->  users, transactions, budgets
        fetch + JWT (HTTPS)              auth, validation,
                                         aggregation, CSV
```
Three tiers: presentation (frontend), application (REST API with middleware for authentication, validation, rate limiting, error handling) and data (MongoDB).

## 7. Use-Case Description
| Actor | Use cases |
|---|---|
| Visitor | View home page, register, log in |
| Registered user | Add / edit / delete / search / filter / sort transactions; create and edit budgets; view dashboard; view reports; export CSV; update profile and settings; change password; log out |
| System | Hash passwords, issue and verify JWTs, calculate totals and budget usage, raise budget warnings |

## 8. Data-Flow Diagram
**Level 0**
```
User --(credentials, transactions, budgets, filters)--> [ Expense Tracker System ] --(dashboard, reports, CSV, alerts)--> User
                                                             |  ^
                                                    (read/write) |
                                                             v  |
                                                          [ MongoDB ]
```
**Level 1**
```
1. Authenticate  -> verify token/password -> Users
2. Manage Transactions -> validate -> Transactions
3. Manage Budgets -> validate -> Budgets
4. Analytics -> aggregate Transactions + Budgets -> dashboard/report data
5. Export -> query Transactions -> CSV file
```

## 9. Database Schema and ER Diagram
**User:** _id, name, email (unique), passwordHash, currency, dateFormat, createdAt, updatedAt
**Transaction:** _id, userId (ref User), title, amount, type (income/expense), category, transactionDate, paymentMethod, notes, createdAt, updatedAt
**Budget:** _id, userId (ref User), category (incl. "Overall"), monthlyLimit, month (YYYY-MM), createdAt, updatedAt
**Indexes:** User.email unique; Transaction {userId, transactionDate}; Budget unique {userId, category, month}.
```
USER 1 ──────< TRANSACTION
USER 1 ──────< BUDGET
```
One user has many transactions and many budgets.

## 10. Module Descriptions
- **Authentication:** registration, login, JWT middleware, profile, password change.
- **Transactions:** CRUD, search, filters, sorting, pagination, strict validation.
- **Budgets:** create/update/delete, duplicate prevention, usage calculated from real expenses (80% warning, 100% exceeded).
- **Dashboard:** monthly income/expense/net, all-time balance, category breakdown, six-month trend, top categories, budget utilization.
- **Reports:** yearly month-by-month, category-wise, date range, CSV export.
- **Settings/Profile:** name, currency, date format, password, logout.

## 11. API Documentation
See the API summary table in `README.md` (section 5).

## 12. Testing Plan and Test Cases
Framework: Jest + Supertest + mongodb-memory-server. Run `npm test` in `backend`.
| # | Test case | Expected result |
|---|---|---|
| 1 | Register with valid data | 201, token returned, no password hash in response |
| 2 | Register with invalid data | 400 |
| 3 | Register with an existing email | 409 |
| 4 | Login with correct / wrong password | 200 / 401 |
| 5 | Call private route without a valid token | 401 |
| 6 | Create, edit, delete a transaction | 201 / updated values / 200 then 404 |
| 7 | Negative, zero or text amount; impossible date; bad category | 400 |
| 8 | Another user reads/edits/deletes my transaction | 404, own list empty |
| 9 | Search, type filter, sort, pagination | Correct subsets and page counts |
| 10 | Budget spent / remaining / status | Calculated from stored expenses; warning and exceeded detected |
| 11 | Duplicate budget (same category and month) | 409 |
| 12 | Dashboard totals | Match stored income and expenses |
| 13 | Report date filtering and invalid dates | Correct totals / 400 |
| 14 | CSV export | text/csv with header and rows |

## 13. Results and Conclusion
The application meets all stated requirements: users can securely manage transactions and budgets, all dashboard and report figures come from live database aggregation, and the system is deployable to the cloud. It demonstrates a complete full-stack workflow - REST API design, authentication, validation, data modelling, visualization, testing and deployment.

## 14. Future Enhancements
Recurring transactions, receipt upload, email budget alerts, bank/UPI statement import, dark mode, multi-currency conversion, PWA/offline support, httpOnly-cookie sessions with refresh tokens, and machine-learning based spending predictions.

## 15. References
1. Node.js documentation - https://nodejs.org/docs
2. Express documentation - https://expressjs.com
3. Mongoose documentation - https://mongoosejs.com/docs
4. MongoDB Atlas documentation - https://www.mongodb.com/docs/atlas
5. Bootstrap 5 documentation - https://getbootstrap.com/docs/5.3
6. Chart.js documentation - https://www.chartjs.org/docs
7. JSON Web Token introduction - https://jwt.io/introduction
8. OWASP Top Ten - https://owasp.org/www-project-top-ten
9. Render and Netlify deployment documentation - https://render.com/docs , https://docs.netlify.com

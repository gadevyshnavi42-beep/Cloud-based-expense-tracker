require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.set('trust proxy', 1); // needed behind Render's proxy

app.use(helmet({ contentSecurityPolicy: false })); // CSP off so CDN scripts (Bootstrap, Chart.js) load
const allowed = (process.env.CLIENT_URL || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => (!origin || allowed.includes(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS'))),
}));
app.use(express.json({ limit: '10kb' }));
app.use(mongoSanitize()); // strips $ and . operators (NoSQL injection)

if (process.env.NODE_ENV !== 'test') {
  app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
  app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, message: 'Too many login attempts, try later' } }));
  app.use('/api/auth/register', rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: { success: false, message: 'Too many registrations, try later' } }));
}

app.get('/api/health', (req, res) => res.json({ success: true, message: 'API is running' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reports', require('./routes/reports'));

// In local development the backend also serves the frontend folder (http://localhost:5000)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use('/api', notFound);
app.use(errorHandler);

module.exports = app;

if (require.main === module) {
  if (!process.env.JWT_SECRET) { console.error('JWT_SECRET is not set in .env'); process.exit(1); }
  const PORT = process.env.PORT || 5000;
  connectDB()
    .then(() => app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)))
    .catch((err) => { console.error('Startup failed:', err.message); process.exit(1); });
}

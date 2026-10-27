const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const strongPassword = (p) => typeof p === 'string' && p.length >= 8 && p.length <= 72 && /[A-Za-z]/.test(p) && /\d/.test(p);
const signToken = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
const fail = (res, code, message) => res.status(code).json({ success: false, message });

router.post('/register', asyncHandler(async (req, res) => {
  const name = String(req.body.name ?? '').trim();
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const { password } = req.body;
  if (name.length < 2 || name.length > 50) return fail(res, 400, 'Name must be 2-50 characters');
  if (!EMAIL_RE.test(email)) return fail(res, 400, 'Enter a valid email address');
  if (!strongPassword(password)) return fail(res, 400, 'Password must be at least 8 characters with a letter and a number');
  if (await User.findOne({ email })) return fail(res, 409, 'An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash });
  res.status(201).json({ success: true, message: 'Registration successful', data: { user, token: signToken(user) } });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const { password } = req.body;
  if (!email || typeof password !== 'string') return fail(res, 400, 'Email and password are required');
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return fail(res, 401, 'Invalid email or password');
  res.json({ success: true, message: 'Login successful', data: { user, token: signToken(user) } });
}));

router.get('/me', auth, (req, res) => {
  res.json({ success: true, message: 'OK', data: { user: req.user } });
});

router.put('/profile', auth, asyncHandler(async (req, res) => {
  const { name, currency, dateFormat } = req.body;
  if (name !== undefined) {
    const n = String(name).trim();
    if (n.length < 2 || n.length > 50) return fail(res, 400, 'Name must be 2-50 characters');
    req.user.name = n;
  }
  if (currency !== undefined) {
    if (!['INR', 'USD', 'EUR', 'GBP'].includes(currency)) return fail(res, 400, 'Invalid currency');
    req.user.currency = currency;
  }
  if (dateFormat !== undefined) {
    if (!['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].includes(dateFormat)) return fail(res, 400, 'Invalid date format');
    req.user.dateFormat = dateFormat;
  }
  await req.user.save();
  res.json({ success: true, message: 'Profile updated', data: { user: req.user } });
}));

router.put('/change-password', auth, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (typeof currentPassword !== 'string' || !(await bcrypt.compare(currentPassword, req.user.passwordHash))) {
    return fail(res, 400, 'Current password is incorrect');
  }
  if (!strongPassword(newPassword)) return fail(res, 400, 'New password must be at least 8 characters with a letter and a number');
  req.user.passwordHash = await bcrypt.hash(newPassword, 10);
  await req.user.save();
  res.json({ success: true, message: 'Password changed successfully' });
}));

module.exports = router;

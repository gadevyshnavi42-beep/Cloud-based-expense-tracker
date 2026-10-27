const mongoose = require('mongoose');

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Education', 'Healthcare', 'Entertainment', 'Salary', 'Freelance', 'Other'];
const TYPES = ['income', 'expense'];
const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Net Banking', 'Other'];
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const isValidId = (id) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/*
 * TIMEZONE POLICY
 * - A transaction date is stored as UTC midnight of the calendar date the user picked.
 * - "Current month" is decided in Indian Standard Time (UTC+5:30).
 * - Month ranges are [first day 00:00 UTC, first day of next month 00:00 UTC).
 */
function currentMonth() {
  return new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 7);
}
function parseDate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const d = new Date(str + 'T00:00:00.000Z');
  if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== str) return null;
  return d;
}
function monthRange(month) {
  const [y, m] = month.split('-').map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
}
function shiftMonth(month, n) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}
// returns the month string, the current month if missing, or null if invalid
function getMonthParam(value) {
  if (value === undefined || value === '') return currentMonth();
  return typeof value === 'string' && MONTH_RE.test(value) ? value : null;
}
// from/to (inclusive) -> {start, end(exclusive)}; defaults to the current month
function getRange(query) {
  const { from, to } = query;
  if (from === undefined && to === undefined) return monthRange(currentMonth());
  const s = parseDate(from);
  const e = parseDate(to);
  if (!s || !e) return { error: 'Valid "from" and "to" dates (YYYY-MM-DD) are required' };
  if (s > e) return { error: '"from" must not be after "to"' };
  return { start: s, end: new Date(e.getTime() + 86400000) };
}

// Whitelists fields (prevents mass assignment) and validates them.
function cleanTransaction(body) {
  const errors = [];
  const b = body || {};
  const title = String(b.title ?? '').trim();
  if (!title || title.length > 100) errors.push('Description is required (max 100 characters)');
  const amount = typeof b.amount === 'number' || typeof b.amount === 'string' ? Number(b.amount) : NaN;
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e9) errors.push('Amount must be a positive number');
  if (!TYPES.includes(b.type)) errors.push('Type must be income or expense');
  if (!CATEGORIES.includes(b.category)) errors.push('Invalid category');
  const date = parseDate(b.transactionDate);
  if (!date) errors.push('Date must be a valid date (YYYY-MM-DD)');
  const paymentMethod = b.paymentMethod === undefined || b.paymentMethod === '' ? 'Cash' : b.paymentMethod;
  if (!PAYMENT_METHODS.includes(paymentMethod)) errors.push('Invalid payment method');
  const notes = String(b.notes ?? '').trim();
  if (notes.length > 500) errors.push('Notes can be at most 500 characters');
  return {
    errors,
    data: { title, amount: round2(amount), type: b.type, category: b.category, transactionDate: date, paymentMethod, notes },
  };
}

module.exports = {
  CATEGORIES, TYPES, PAYMENT_METHODS, MONTH_RE, asyncHandler, isValidId, round2, escapeRegex,
  currentMonth, parseDate, monthRange, shiftMonth, getMonthParam, getRange, cleanTransaction,
};

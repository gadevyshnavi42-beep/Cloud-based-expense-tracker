const express = require('express');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const { asyncHandler, getRange, round2, currentMonth, TYPES } = require('../utils/helpers');

const router = express.Router();
router.use(auth);

const fail = (res, code, message) => res.status(code).json({ success: false, message });

// Income / expense for each month of a year
router.get('/monthly', asyncHandler(async (req, res) => {
  const year = req.query.year === undefined ? Number(currentMonth().slice(0, 4)) : Number(req.query.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return fail(res, 400, 'Invalid year');
  const rows = await Transaction.aggregate([
    { $match: { userId: req.user._id, transactionDate: { $gte: new Date(Date.UTC(year, 0, 1)), $lt: new Date(Date.UTC(year + 1, 0, 1)) } } },
    { $group: { _id: { m: { $month: '$transactionDate' }, t: '$type' }, total: { $sum: '$amount' } } },
  ]);
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const get = (t) => (rows.find((r) => r._id.m === m && r._id.t === t) || {}).total || 0;
    const income = round2(get('income'));
    const expense = round2(get('expense'));
    months.push({ month: `${year}-${String(m).padStart(2, '0')}`, income, expense, net: round2(income - expense) });
  }
  const income = round2(months.reduce((s, x) => s + x.income, 0));
  const expense = round2(months.reduce((s, x) => s + x.expense, 0));
  res.json({ success: true, message: 'OK', data: { year, months, totals: { income, expense, net: round2(income - expense) } } });
}));

router.get('/category-wise', asyncHandler(async (req, res) => {
  const range = getRange(req.query);
  if (range.error) return fail(res, 400, range.error);
  const type = req.query.type || 'expense';
  if (!TYPES.includes(type)) return fail(res, 400, 'Invalid type');
  const rows = await Transaction.aggregate([
    { $match: { userId: req.user._id, type, transactionDate: { $gte: range.start, $lt: range.end } } },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);
  const grand = rows.reduce((s, r) => s + r.total, 0);
  res.json({
    success: true, message: 'OK',
    data: { type, total: round2(grand), categories: rows.map((r) => ({ category: r._id, total: round2(r.total), count: r.count, percent: grand ? round2((r.total / grand) * 100) : 0 })) },
  });
}));

router.get('/date-range', asyncHandler(async (req, res) => {
  const range = getRange(req.query);
  if (range.error) return fail(res, 400, range.error);
  const filter = { userId: req.user._id, transactionDate: { $gte: range.start, $lt: range.end } };
  const [items, totals] = await Promise.all([
    Transaction.find(filter).sort({ transactionDate: -1, _id: -1 }).limit(500).lean(),
    Transaction.aggregate([{ $match: filter }, { $group: { _id: '$type', total: { $sum: '$amount' } } }]),
  ]);
  const get = (t) => (totals.find((x) => x._id === t) || {}).total || 0;
  const income = round2(get('income'));
  const expense = round2(get('expense'));
  res.json({ success: true, message: 'OK', data: { income, expense, net: round2(income - expense), items } });
}));

// CSV cells starting with = + - @ can run as formulas in Excel, so they are prefixed with a quote.
const csvCell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
};

router.get('/export-csv', asyncHandler(async (req, res) => {
  const range = getRange(req.query);
  if (range.error) return fail(res, 400, range.error);
  const items = await Transaction.find({ userId: req.user._id, transactionDate: { $gte: range.start, $lt: range.end } })
    .sort({ transactionDate: -1, _id: -1 }).limit(5000).lean();
  const header = ['Date', 'Description', 'Type', 'Category', 'Amount', 'Payment Method', 'Notes'];
  const lines = [header.join(',')].concat(items.map((t) =>
    [t.transactionDate.toISOString().slice(0, 10), t.title, t.type, t.category, t.amount.toFixed(2), t.paymentMethod, t.notes].map(csvCell).join(',')));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
  res.send(lines.join('\n'));
}));

module.exports = router;

const express = require('express');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const buildBudgetSummary = require('../utils/budgetSummary');
const { asyncHandler, getMonthParam, monthRange, shiftMonth, round2 } = require('../utils/helpers');

const router = express.Router();
router.use(auth);

// Monthly figures (income, expense, net) are for ONE month only.
// "allTimeBalance" is a separate number: all income minus all expenses ever.
router.get('/summary', asyncHandler(async (req, res) => {
  const month = getMonthParam(req.query.month);
  if (!month) return res.status(400).json({ success: false, message: 'Month must be in YYYY-MM format' });
  const userId = req.user._id;
  const { start, end } = monthRange(month);
  const trendMonths = [-5, -4, -3, -2, -1, 0].map((n) => shiftMonth(month, n));

  const [totals, byCategory, trend, allTime, budgets] = await Promise.all([
    Transaction.aggregate([
      { $match: { userId, transactionDate: { $gte: start, $lt: end } } },
      { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Transaction.aggregate([
      { $match: { userId, type: 'expense', transactionDate: { $gte: start, $lt: end } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]),
    Transaction.aggregate([
      { $match: { userId, transactionDate: { $gte: monthRange(trendMonths[0]).start, $lt: end } } },
      { $group: { _id: { m: { $dateToString: { format: '%Y-%m', date: '$transactionDate' } }, t: '$type' }, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([{ $match: { userId } }, { $group: { _id: '$type', total: { $sum: '$amount' } } }]),
    buildBudgetSummary(userId, month),
  ]);

  const pick = (arr, key) => (arr.find((x) => x._id === key) || {}).total || 0;
  const income = round2(pick(totals, 'income'));
  const expense = round2(pick(totals, 'expense'));
  const count = totals.reduce((s, t) => s + t.count, 0);

  const monthlyTrend = trendMonths.map((m) => {
    const get = (t) => (trend.find((x) => x._id.m === m && x._id.t === t) || {}).total || 0;
    return { month: m, income: round2(get('income')), expense: round2(get('expense')) };
  });

  res.json({
    success: true,
    message: 'OK',
    data: {
      month,
      transactionCount: count,
      monthlyIncome: income,
      monthlyExpense: expense,
      monthlyNet: round2(income - expense),
      allTimeBalance: round2(pick(allTime, 'income') - pick(allTime, 'expense')),
      expensesByCategory: byCategory.map((c) => ({ category: c._id, total: round2(c.total) })),
      topCategories: byCategory.slice(0, 3).map((c) => ({ category: c._id, total: round2(c.total) })),
      monthlyTrend,
      budgetUtilization: budgets,
    },
  });
}));

router.get('/recent-transactions', asyncHandler(async (req, res) => {
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 5));
  const items = await Transaction.find({ userId: req.user._id }).sort({ transactionDate: -1, _id: -1 }).limit(limit).lean();
  res.json({ success: true, message: 'OK', data: { items } });
}));

module.exports = router;

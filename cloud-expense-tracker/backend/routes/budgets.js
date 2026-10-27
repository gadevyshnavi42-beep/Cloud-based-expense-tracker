const express = require('express');
const Budget = require('../models/Budget');
const auth = require('../middleware/auth');
const buildBudgetSummary = require('../utils/budgetSummary');
const { asyncHandler, isValidId, getMonthParam, MONTH_RE, CATEGORIES } = require('../utils/helpers');

const router = express.Router();
router.use(auth);

const fail = (res, code, message) => res.status(code).json({ success: false, message });
const CATS = ['Overall', ...CATEGORIES];

function cleanBudget(body) {
  const errors = [];
  const limit = typeof body.monthlyLimit === 'number' || typeof body.monthlyLimit === 'string' ? Number(body.monthlyLimit) : NaN;
  if (!Number.isFinite(limit) || limit <= 0 || limit > 1e9) errors.push('Monthly limit must be a positive number');
  if (!CATS.includes(body.category)) errors.push('Invalid category');
  if (typeof body.month !== 'string' || !MONTH_RE.test(body.month)) errors.push('Month must be in YYYY-MM format');
  return { errors, data: { category: body.category, month: body.month, monthlyLimit: Math.round(limit * 100) / 100 } };
}

// must come before "/:id"
router.get('/summary', asyncHandler(async (req, res) => {
  const month = getMonthParam(req.query.month);
  if (!month) return fail(res, 400, 'Month must be in YYYY-MM format');
  const items = await buildBudgetSummary(req.user._id, month);
  res.json({ success: true, message: 'OK', data: { month, items } });
}));

router.get('/', asyncHandler(async (req, res) => {
  const filter = { userId: req.user._id };
  if (req.query.month) {
    if (!getMonthParam(req.query.month)) return fail(res, 400, 'Month must be in YYYY-MM format');
    filter.month = req.query.month;
  }
  const budgets = await Budget.find(filter).sort({ month: -1, category: 1 });
  res.json({ success: true, message: 'OK', data: { budgets } });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { errors, data } = cleanBudget(req.body);
  if (errors.length) return fail(res, 400, errors.join('. '));
  const exists = await Budget.findOne({ userId: req.user._id, category: data.category, month: data.month });
  if (exists) return fail(res, 409, `A ${data.category} budget already exists for ${data.month}. Edit it instead.`);
  const budget = await Budget.create({ ...data, userId: req.user._id });
  res.status(201).json({ success: true, message: 'Budget created', data: { budget } });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return fail(res, 400, 'Invalid budget id');
  const budget = await Budget.findOne({ _id: req.params.id, userId: req.user._id });
  if (!budget) return fail(res, 404, 'Budget not found');
  res.json({ success: true, message: 'OK', data: { budget } });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return fail(res, 400, 'Invalid budget id');
  const { errors, data } = cleanBudget(req.body);
  if (errors.length) return fail(res, 400, errors.join('. '));
  const clash = await Budget.findOne({ userId: req.user._id, category: data.category, month: data.month, _id: { $ne: req.params.id } });
  if (clash) return fail(res, 409, 'Another budget already exists for that category and month');
  const budget = await Budget.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, data, { new: true, runValidators: true });
  if (!budget) return fail(res, 404, 'Budget not found');
  res.json({ success: true, message: 'Budget updated', data: { budget } });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return fail(res, 400, 'Invalid budget id');
  const budget = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!budget) return fail(res, 404, 'Budget not found');
  res.json({ success: true, message: 'Budget deleted' });
}));

module.exports = router;

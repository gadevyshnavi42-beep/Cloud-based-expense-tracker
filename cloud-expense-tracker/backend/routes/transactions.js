const express = require('express');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const { asyncHandler, isValidId, escapeRegex, parseDate, cleanTransaction, CATEGORIES, TYPES } = require('../utils/helpers');

const router = express.Router();
router.use(auth); // every route below is private

const fail = (res, code, message) => res.status(code).json({ success: false, message });

router.get('/', asyncHandler(async (req, res) => {
  const { search, type, category, from, to, sortBy, order } = req.query;
  const filter = { userId: req.user._id };

  if (type !== undefined && type !== '') { if (!TYPES.includes(type)) return fail(res, 400, 'Invalid type'); filter.type = type; }
  if (category !== undefined && category !== '') { if (!CATEGORIES.includes(category)) return fail(res, 400, 'Invalid category'); filter.category = category; }
  if (search) { if (typeof search !== 'string') return fail(res, 400, 'Invalid search'); filter.title = { $regex: escapeRegex(search.slice(0, 50)), $options: 'i' }; }
  if (from || to) {
    filter.transactionDate = {};
    if (from) { const d = parseDate(from); if (!d) return fail(res, 400, 'Invalid from date'); filter.transactionDate.$gte = d; }
    if (to) { const d = parseDate(to); if (!d) return fail(res, 400, 'Invalid to date'); filter.transactionDate.$lt = new Date(d.getTime() + 86400000); }
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const sortField = sortBy === 'amount' ? 'amount' : 'transactionDate';
  const sortDir = order === 'asc' ? 1 : -1;

  const [items, total] = await Promise.all([
    Transaction.find(filter).sort({ [sortField]: sortDir, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Transaction.countDocuments(filter),
  ]);
  res.json({ success: true, message: 'OK', data: { items, page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { errors, data } = cleanTransaction(req.body);
  if (errors.length) return fail(res, 400, errors.join('. '));
  const tx = await Transaction.create({ ...data, userId: req.user._id });
  res.status(201).json({ success: true, message: 'Transaction added', data: { transaction: tx } });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return fail(res, 400, 'Invalid transaction id');
  const tx = await Transaction.findOne({ _id: req.params.id, userId: req.user._id });
  if (!tx) return fail(res, 404, 'Transaction not found');
  res.json({ success: true, message: 'OK', data: { transaction: tx } });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return fail(res, 400, 'Invalid transaction id');
  const { errors, data } = cleanTransaction(req.body);
  if (errors.length) return fail(res, 400, errors.join('. '));
  const tx = await Transaction.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, data, { new: true, runValidators: true });
  if (!tx) return fail(res, 404, 'Transaction not found');
  res.json({ success: true, message: 'Transaction updated', data: { transaction: tx } });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return fail(res, 400, 'Invalid transaction id');
  const tx = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!tx) return fail(res, 404, 'Transaction not found');
  res.json({ success: true, message: 'Transaction deleted' });
}));

module.exports = router;

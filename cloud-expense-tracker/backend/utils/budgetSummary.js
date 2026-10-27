const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const { monthRange, round2 } = require('./helpers');

// Compares each budget of a month with the real expenses stored in the database.
module.exports = async function buildBudgetSummary(userId, month) {
  const { start, end } = monthRange(month);
  const budgets = await Budget.find({ userId, month }).sort({ category: 1 }).lean();
  const spentAgg = await Transaction.aggregate([
    { $match: { userId, type: 'expense', transactionDate: { $gte: start, $lt: end } } },
    { $group: { _id: '$category', spent: { $sum: '$amount' } } },
  ]);
  const byCategory = {};
  let totalSpent = 0;
  spentAgg.forEach((s) => { byCategory[s._id] = s.spent; totalSpent += s.spent; });

  return budgets.map((b) => {
    const spent = round2(b.category === 'Overall' ? totalSpent : byCategory[b.category] || 0);
    const percent = round2((spent / b.monthlyLimit) * 100);
    return {
      _id: b._id,
      category: b.category,
      month: b.month,
      monthlyLimit: b.monthlyLimit,
      spent,
      remaining: round2(b.monthlyLimit - spent),
      percent,
      status: percent >= 100 ? 'exceeded' : percent >= 80 ? 'warning' : 'ok',
    };
  });
};

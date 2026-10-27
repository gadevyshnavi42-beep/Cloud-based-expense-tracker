const mongoose = require('mongoose');
const { CATEGORIES, MONTH_RE } = require('../utils/helpers');

const budgetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, enum: ['Overall', ...CATEGORIES], required: true }, // "Overall" = whole-month budget
    monthlyLimit: { type: Number, required: true, min: 1 },
    month: { type: String, required: true, match: MONTH_RE }, // YYYY-MM
  },
  { timestamps: true }
);

// one budget per user + category + month
budgetSchema.index({ userId: 1, category: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);

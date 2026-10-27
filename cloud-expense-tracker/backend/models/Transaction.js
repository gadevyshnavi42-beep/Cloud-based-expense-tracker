const mongoose = require('mongoose');
const { CATEGORIES, TYPES, PAYMENT_METHODS } = require('../utils/helpers');

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    amount: { type: Number, required: true, min: 0.01 }, // rupees, 2 decimals
    type: { type: String, enum: TYPES, required: true },
    category: { type: String, enum: CATEGORIES, required: true },
    transactionDate: { type: Date, required: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'Cash' },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, transactionDate: -1 });
transactionSchema.index({ userId: 1, type: 1, category: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);

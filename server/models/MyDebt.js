const mongoose = require('mongoose');

const myDebtPaymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  note: String,
});

const myDebtSchema = new mongoose.Schema({
  creditor: { type: String, required: true, trim: true },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['USD', 'RUB'], default: 'USD' },
  description: String,
  date: { type: Date, default: Date.now },
  payments: [myDebtPaymentSchema],
}, { timestamps: true });

myDebtSchema.virtual('paidAmount').get(function () {
  return this.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
});

myDebtSchema.virtual('remainingDebt').get(function () {
  return this.amount - this.paidAmount;
});

myDebtSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('MyDebt', myDebtSchema);

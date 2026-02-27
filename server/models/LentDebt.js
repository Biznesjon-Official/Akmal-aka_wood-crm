const mongoose = require('mongoose');

const lentDebtPaymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  note: String,
});

const lentDebtSchema = new mongoose.Schema({
  debtor: { type: String, required: true, trim: true },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['USD', 'RUB'], default: 'USD' },
  description: String,
  date: { type: Date, default: Date.now },
  payments: [lentDebtPaymentSchema],
}, { timestamps: true });

lentDebtSchema.virtual('paidAmount').get(function () {
  return this.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
});

lentDebtSchema.virtual('remainingDebt').get(function () {
  return this.amount - this.paidAmount;
});

lentDebtSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('LentDebt', lentDebtSchema);

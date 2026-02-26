const mongoose = require('mongoose');

const cashTransactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['kirim', 'chiqim'], required: true },
  category: {
    type: String,
    enum: ['sotuv', 'qarz_tolovi', 'yetkazma', 'boshqa'],
    default: 'boshqa'
  },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['USD', 'RUB'], default: 'USD' },
  account: { type: String, enum: ['USD_account', 'RUB_account'], required: true },
  source: { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseSource' },
  description: String,
  relatedSale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
  relatedWagon: { type: mongoose.Schema.Types.ObjectId, ref: 'Wagon' },
  relatedConversion: { type: mongoose.Schema.Types.ObjectId, ref: 'CurrencyConversion' },
  relatedMyDebt: { type: mongoose.Schema.Types.ObjectId, ref: 'MyDebt' },
  relatedTopUp: { type: mongoose.Schema.Types.ObjectId, ref: 'TopUp' },
  relatedDelivery: { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery' },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

cashTransactionSchema.index({ relatedWagon: 1 });
cashTransactionSchema.index({ relatedSale: 1 });
cashTransactionSchema.index({ relatedConversion: 1 });
cashTransactionSchema.index({ relatedMyDebt: 1 });
cashTransactionSchema.index({ relatedTopUp: 1 });
cashTransactionSchema.index({ relatedDelivery: 1 });
cashTransactionSchema.index({ currency: 1, type: 1 });

module.exports = mongoose.model('CashTransaction', cashTransactionSchema);

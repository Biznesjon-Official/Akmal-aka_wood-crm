const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  type: { type: String, enum: ['deposit', 'withdrawal'], required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, enum: ['USD', 'RUB'], default: 'USD' },
  date: { type: Date, default: Date.now },
  note: { type: String, trim: true },
});

const partnerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  note: { type: String, trim: true },
  profitPercent: { type: Number, min: 0, max: 100, default: 0 },
  investments: [investmentSchema],
  investedAmount: { type: Number, default: 0 },
}, { timestamps: true });

partnerSchema.pre('save', function (next) {
  this.investedAmount = this.investments.reduce((sum, inv) => {
    return inv.type === 'deposit' ? sum + inv.amount : sum - inv.amount;
  }, 0);
  next();
});

partnerSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Partner', partnerSchema);

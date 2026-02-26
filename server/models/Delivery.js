const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['USD', 'RUB'], default: 'USD' },
}, { _id: true });

const deliverySchema = new mongoose.Schema({
  wagonCode: { type: String, required: true },
  origin: String,
  destination: String,
  customer: String,
  sentDate: { type: Date, default: Date.now },
  deliveredDate: Date,
  expenses: [expenseSchema],
  income: { type: Number, default: 0 },
  incomeCurrency: { type: String, enum: ['USD', 'RUB'], default: 'USD' },
  exchangeRate: { type: Number, default: 0 },
  status: { type: String, enum: ["yo'lda", 'yetkazildi'], default: "yo'lda" },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

deliverySchema.virtual('totalExpensesUSD').get(function () {
  const rate = this.exchangeRate || 1;
  return this.expenses.reduce((sum, e) => {
    return sum + (e.currency === 'RUB' ? e.amount / rate : e.amount);
  }, 0);
});

deliverySchema.virtual('incomeUSD').get(function () {
  if (this.incomeCurrency === 'RUB') {
    const rate = this.exchangeRate || 1;
    return this.income / rate;
  }
  return this.income;
});

deliverySchema.virtual('profit').get(function () {
  return this.incomeUSD - this.totalExpensesUSD;
});

module.exports = mongoose.model('Delivery', deliverySchema);

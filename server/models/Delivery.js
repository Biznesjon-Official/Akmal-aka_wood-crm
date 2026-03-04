const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  note: String,
}, { _id: true });

const expenseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['USD', 'RUB'], default: 'USD' },
}, { _id: true });

const deliverySchema = new mongoose.Schema({
  wagon: { type: mongoose.Schema.Types.ObjectId, ref: 'Wagon' },
  wagonCode: String,
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  sentDate: { type: Date, default: Date.now },
  arrivedDate: Date,
  status: { type: String, enum: ["yo'lda", 'yetkazildi', 'yakunlandi'], default: "yo'lda" },

  // Cargo
  cargoType: String,
  cargoWeight: Number,

  // Per-ton tariffs (USD/ton) — mijoz qarzi
  uzCode: String,
  uzRate: { type: Number, default: 0 },
  kzCode: String,
  kzRate: { type: Number, default: 0 },
  ogirlik: { type: Number, default: 0 },

  // Fixed USD debts
  avgCode: String,
  avgExpense: { type: Number, default: 0 },
  prastoy: { type: Number, default: 0 },

  // Extra expenses (doesn't affect cash)
  expenses: [expenseSchema],

  // Customer payments
  payments: [paymentSchema],

  // Supplier payments (affects cash — chiqim)
  supplierPayments: [paymentSchema],
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

deliverySchema.virtual('effectiveWeight').get(function () {
  return Math.max(0, (this.cargoWeight || 0) - (this.ogirlik || 0));
});

deliverySchema.virtual('uzTotal').get(function () {
  return (this.uzRate || 0) * this.effectiveWeight;
});

deliverySchema.virtual('kzTotal').get(function () {
  return (this.kzRate || 0) * this.effectiveWeight;
});

// Total expenses sum
deliverySchema.virtual('totalExpenses').get(function () {
  return (this.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
});

// Total debt = UZ + KZ + AVG + prastoy + expenses
deliverySchema.virtual('totalDebt').get(function () {
  return this.uzTotal + this.kzTotal + (this.avgExpense || 0) + (this.prastoy || 0) + this.totalExpenses;
});

// Total paid by customer
deliverySchema.virtual('paidAmount').get(function () {
  return (this.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
});

// Remaining customer debt
deliverySchema.virtual('remainingDebt').get(function () {
  return Math.max(0, this.totalDebt - this.paidAmount);
});

// Supplier paid total
deliverySchema.virtual('supplierPaid').get(function () {
  return (this.supplierPayments || []).reduce((s, p) => s + (p.amount || 0), 0);
});

// Supplier debt = totalDebt - supplierPaid
deliverySchema.virtual('supplierDebt').get(function () {
  return Math.max(0, this.totalDebt - this.supplierPaid);
});

// Profit = customer paid - totalDebt
deliverySchema.virtual('profit').get(function () {
  return this.paidAmount - this.totalDebt;
});

// 'tolanmagan' | 'qisman' | 'toliq'
deliverySchema.virtual('debtStatus').get(function () {
  const paid = this.paidAmount;
  const total = this.totalDebt;
  if (!total) return 'tolanmagan';
  if (paid >= total) return 'toliq';
  if (paid > 0) return 'qisman';
  return 'tolanmagan';
});

// Auto-status pre-save
deliverySchema.pre('save', function (next) {
  if (this.paidAmount >= this.totalDebt && this.totalDebt > 0) {
    this.status = 'yakunlandi';
  } else if (this.arrivedDate) {
    this.status = 'yetkazildi';
  } else {
    this.status = "yo'lda";
  }
  next();
});

deliverySchema.index({ sentDate: -1 });
deliverySchema.index({ status: 1 });
deliverySchema.index({ customer: 1 });

module.exports = mongoose.model('Delivery', deliverySchema);

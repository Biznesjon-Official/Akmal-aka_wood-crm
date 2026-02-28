const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  note: String,
}, { _id: true });

const deliverySchema = new mongoose.Schema({
  wagon: { type: mongoose.Schema.Types.ObjectId, ref: 'Wagon' },
  wagonCode: String,
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  sentDate: { type: Date, default: Date.now },
  arrivedDate: Date,
  status: { type: String, enum: ["yo'lda", 'yetkazildi', 'yakunlandi'], default: "yo'lda" },

  // Cargo
  cargoType: String,
  cargoWeight: Number,

  // Per-ton tariffs (USD/ton) — mijoz qarzi
  uzRate: { type: Number, default: 0 },
  kzRate: { type: Number, default: 0 },

  // Fixed USD debts
  avgExpense: { type: Number, default: 0 },
  kodExpense: { type: Number, default: 0 },
  prastoy: { type: Number, default: 0 },

  // Customer payments
  payments: [paymentSchema],
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

deliverySchema.virtual('uzTotal').get(function () {
  return (this.uzRate || 0) * (this.cargoWeight || 0);
});

deliverySchema.virtual('kzTotal').get(function () {
  return (this.kzRate || 0) * (this.cargoWeight || 0);
});

// Total debt = what customer owes us
deliverySchema.virtual('totalDebt').get(function () {
  return this.uzTotal + this.kzTotal + (this.avgExpense || 0) + (this.kodExpense || 0) + (this.prastoy || 0);
});

// Total paid by customer
deliverySchema.virtual('paidAmount').get(function () {
  return (this.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
});

// Remaining debt
deliverySchema.virtual('remainingDebt').get(function () {
  return Math.max(0, this.totalDebt - this.paidAmount);
});

// Profit = how much customer paid over the debt
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

deliverySchema.index({ sentDate: -1 });
deliverySchema.index({ status: 1 });
deliverySchema.index({ customer: 1 });

module.exports = mongoose.model('Delivery', deliverySchema);

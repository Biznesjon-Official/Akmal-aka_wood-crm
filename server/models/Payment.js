const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['USD', 'RUB'], default: 'USD' },
  date: { type: Date, default: Date.now },
  note: String
}, { timestamps: true });

paymentSchema.index({ sale: 1 });
paymentSchema.index({ customer: 1 });

module.exports = mongoose.model('Payment', paymentSchema);

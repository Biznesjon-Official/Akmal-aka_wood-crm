const mongoose = require('mongoose');

const currencyConversionSchema = new mongoose.Schema({
  amountUSD: { type: Number, required: true },
  amountRUB: { type: Number, required: true },
  commissionPercent: { type: Number, default: 0 },
  effectiveRate: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  note: String,
}, { timestamps: true });

module.exports = mongoose.model('CurrencyConversion', currencyConversionSchema);

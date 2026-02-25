const mongoose = require('mongoose');

const topUpSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['USD', 'RUB'], default: 'USD' },
  description: String,
  date: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('TopUp', topUpSchema);

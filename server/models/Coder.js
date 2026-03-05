const mongoose = require('mongoose');

const codeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['UZ', 'KZ', 'AVG'], required: true },
  costPrice: { type: Number, default: 0 },
  sellPrice: { type: Number, default: 0 },
  currency: { type: String, enum: ['USD', 'RUB'], default: 'USD' },
  status: { type: String, enum: ['mavjud', 'band'], default: 'mavjud' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, refPath: 'codes.assignedModel' },
  assignedModel: { type: String, enum: ['Wagon', 'Delivery'] },
}, { timestamps: true });

const coderPaymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  note: String,
}, { _id: true });

const coderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: String,
  note: String,
  codes: [codeSchema],
  payments: [coderPaymentSchema],
}, { timestamps: true });

coderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Coder', coderSchema);

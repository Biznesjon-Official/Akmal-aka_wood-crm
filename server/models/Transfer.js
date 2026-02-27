const mongoose = require('mongoose');

const transferSchema = new mongoose.Schema({
  wagon: { type: mongoose.Schema.Types.ObjectId, ref: 'Wagon' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  fromCountry: String,
  toCountry: String,
  price: Number,
  currency: { type: String, enum: ['USD', 'RUB'], default: 'USD' },
  status: { type: String, enum: ['jarayonda', 'tugallandi'], default: 'jarayonda' },
  date: { type: Date, default: Date.now },
  note: String
}, { timestamps: true });

transferSchema.index({ createdAt: -1 });
transferSchema.index({ status: 1 });
transferSchema.index({ wagon: 1 });
transferSchema.index({ customer: 1 });

module.exports = mongoose.model('Transfer', transferSchema);

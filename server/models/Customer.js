const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  note: { type: String, trim: true }
}, { timestamps: true });

customerSchema.index({ createdAt: -1 });
customerSchema.index({ name: 1 });

module.exports = mongoose.model('Customer', customerSchema);

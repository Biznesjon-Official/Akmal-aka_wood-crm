const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  note: { type: String, trim: true }
}, { timestamps: true });

supplierSchema.index({ createdAt: -1 });
supplierSchema.index({ name: 1 });

module.exports = mongoose.model('Supplier', supplierSchema);

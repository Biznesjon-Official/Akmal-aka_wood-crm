const mongoose = require('mongoose');

const coderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: String,
  note: String,
}, { timestamps: true });

coderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Coder', coderSchema);

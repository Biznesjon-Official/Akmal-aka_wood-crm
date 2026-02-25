const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: String,
  note: String
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);

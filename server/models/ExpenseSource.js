const mongoose = require('mongoose');

const expenseSourceSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

expenseSourceSchema.statics.ensureDefaults = async function () {
  const exists = await this.findOne({ name: 'Sherik' });
  if (!exists) {
    await this.create({ name: 'Sherik', isDefault: true }).catch(() => {});
  } else if (!exists.isDefault) {
    exists.isDefault = true;
    await exists.save();
  }
};

module.exports = mongoose.model('ExpenseSource', expenseSourceSchema);

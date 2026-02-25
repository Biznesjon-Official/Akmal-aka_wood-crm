const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

// Helper to get/set exchange rate
settingsSchema.statics.getExchangeRate = async function () {
  const doc = await this.findOne({ key: 'exchangeRate' });
  return doc?.value || 0;
};

settingsSchema.statics.setExchangeRate = async function (rate) {
  return this.findOneAndUpdate(
    { key: 'exchangeRate' },
    { value: rate },
    { upsert: true, new: true }
  );
};

module.exports = mongoose.model('Settings', settingsSchema);

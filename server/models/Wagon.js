const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  description: String,
  amount: { type: Number, default: 0, min: 0 },
  currency: { type: String, enum: ['USD', 'RUB'], default: 'USD' }
});

const deductionSchema = new mongoose.Schema({
  reason: { type: String, required: true },
  count: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

const woodBundleSchema = new mongoose.Schema({
  thickness: { type: Number, required: true, min: 0 },
  width: { type: Number, required: true, min: 0 },
  length: { type: Number, required: true, min: 0 },
  count: { type: Number, required: true, min: 0 },
  remainingCount: Number,
  m3PerPiece: Number,
  totalM3: Number,
  deductions: [deductionSchema],
  location: { type: String, enum: ['vagon', 'ombor'], default: 'vagon' }
});

woodBundleSchema.pre('validate', function () {
  // thickness(mm) * width(mm) * length(m) -> m3
  this.m3PerPiece = (this.thickness * this.width * this.length) / 1e6;
  // remainingCount = count - total deducted
  const totalDeducted = (this.deductions || []).reduce((s, d) => s + (d.count || 0), 0);
  this.remainingCount = this.count - totalDeducted;
  this.totalM3 = this.m3PerPiece * this.remainingCount;
});

const wagonSchema = new mongoose.Schema({
  type: { type: String, enum: ['vagon', 'mashina'], default: 'vagon' },
  wagonCode: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        // ASTATKA is a special wagon, skip validation
        if (v === 'ASTATKA') return true;
        // Mashina type: any alphanumeric code
        if (this.type === 'mashina') return v.length > 0;
        // Vagon type: exactly 8 digits
        return /^\d{8}$/.test(v);
      },
      message: 'Vagon kodi 8 ta raqamdan iborat bo\'lishi kerak',
    },
  },
  status: {
    type: String,
    enum: ['kelyapti', 'faol', 'omborda', 'sotildi'],
    default: 'kelyapti'
  },
  sentDate: Date,
  arrivedDate: Date,
  origin: String,
  destination: String,
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  coder: { type: mongoose.Schema.Types.ObjectId, ref: 'Coder' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  expenses: [expenseSchema],
  exchangeRate: { type: Number, default: 0 },
  costPricePerM3: { type: Number, default: 0 },
  woodBundles: [woodBundleSchema],
  totalM3: { type: Number, default: 0 },
  tonnage: { type: Number, default: 0 }
}, { timestamps: true });

wagonSchema.pre('save', async function () {
  // Calculate totalM3
  this.totalM3 = this.woodBundles.reduce((sum, b) => sum + (b.totalM3 || 0), 0);

  // Get exchange rate: use wagon's own rate, or fetch global rate from Settings
  let rate = this.exchangeRate || 0;
  if (rate === 0) {
    try {
      const Settings = mongoose.model('Settings');
      rate = await Settings.getExchangeRate();
      this.exchangeRate = rate;
    } catch (_) { /* Settings model may not be loaded yet */ }
  }

  // Calculate costPricePerM3: USD expenses + RUB expenses converted to USD
  const usdTotal = this.expenses
    .filter(e => e.currency === 'USD')
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  const rubTotal = this.expenses
    .filter(e => e.currency === 'RUB')
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  const rubInUsd = rate > 0 ? rubTotal / rate : 0;
  const totalExpenses = usdTotal + rubInUsd;
  this.costPricePerM3 = this.totalM3 > 0 ? totalExpenses / this.totalM3 : 0;

  // Auto status calculation
  const hasWood = this.woodBundles.length > 0;
  const hasExpenses = this.expenses.length > 0;
  const hasCost = this.costPricePerM3 > 0;
  if (this.status !== 'sotildi' && this.status !== 'omborda') {
    this.status = (hasWood && hasExpenses && hasCost) ? 'faol' : 'kelyapti';
  }
});

wagonSchema.index({ status: 1 });
wagonSchema.index({ createdAt: -1 });
wagonSchema.index({ sentDate: -1 });

module.exports = mongoose.model('Wagon', wagonSchema);

const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  wagon: { type: mongoose.Schema.Types.ObjectId, ref: 'Wagon', required: true },
  bundleIndex: Number,
  quantity: Number,
  pricePerPiece: Number,
  m3PerPiece: Number,
  totalM3: Number,
  totalAmount: Number,
  source: { type: String, enum: ['vagon', 'ombor'] }
});

const saleSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  date: { type: Date, default: Date.now },
  items: [saleItemSchema],
  totalAmount: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  currency: { type: String, enum: ['USD', 'RUB'], default: 'USD' },
  note: String
}, { timestamps: true });

saleSchema.pre('save', function () {
  this.totalAmount = this.items.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
});

saleSchema.index({ customer: 1 });
saleSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Sale', saleSchema);

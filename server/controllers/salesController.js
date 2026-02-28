const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Wagon = require('../models/Wagon');
const CashTransaction = require('../models/CashTransaction');

exports.getAll = async (req, res, next) => {
  try {
    const sales = await Sale.find()
      .populate('customer')
      .sort({ createdAt: -1 })
      .lean();
    res.json(sales);
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('customer')
      .populate('items.wagon')
      .lean();
    if (!sale) return res.status(404).json({ message: 'Sotuv topilmadi' });
    res.json(sale);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { items, customer, paidAmount, currency, note, date } = req.body;

    // Validate items
    for (const item of items) {
      if (!item.quantity || item.quantity <= 0) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Miqdor noto\'g\'ri' });
      }
      if (item.pricePerPiece == null || item.pricePerPiece < 0) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Narx noto\'g\'ri' });
      }
    }

    // Update wagon bundle remaining counts within transaction
    for (const item of items) {
      const wagon = await Wagon.findById(item.wagon).session(session);
      if (!wagon) {
        await session.abortTransaction();
        return res.status(400).json({ message: `Vagon ${item.wagon} topilmadi` });
      }
      const bundle = wagon.woodBundles[item.bundleIndex];
      if (!bundle) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Bundle topilmadi' });
      }
      if (bundle.remainingCount < item.quantity) {
        await session.abortTransaction();
        return res.status(400).json({ message: `Yetarli yog'och yo'q. Qoldiq: ${bundle.remainingCount}` });
      }
      bundle.deductions.push({ reason: 'Sotuv', count: item.quantity, date: new Date() });
      // Auto-calculate
      item.m3PerPiece = bundle.m3PerPiece;
      item.totalM3 = item.quantity * bundle.m3PerPiece;
      item.totalAmount = item.quantity * item.pricePerPiece;
      item.source = bundle.location;
      await wagon.save({ session });
    }

    const [sale] = await Sale.create([{ customer, items, paidAmount: paidAmount || 0, currency, note, date }], { session });
    const populated = await sale.populate('customer');

    // Auto kirim to cash if paid
    if (paidAmount > 0) {
      await CashTransaction.create([{
        type: 'kirim',
        category: 'sotuv',
        amount: paidAmount,
        currency: currency || 'USD',
        account: currency === 'RUB' ? 'RUB_account' : 'USD_account',
        description: `Yog'och sotuvi: ${populated.customer?.name || ''}`,
        relatedSale: sale._id,
        date: date || new Date(),
      }], { session });
    }

    await session.commitTransaction();
    res.status(201).json(populated);
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

exports.remove = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const sale = await Sale.findById(req.params.id).session(session);
    if (!sale) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Sotuv topilmadi' });
    }

    // Restore wagon bundle counts
    for (const item of sale.items) {
      const wagon = await Wagon.findById(item.wagon).session(session);
      if (wagon) {
        const bundle = wagon.woodBundles[item.bundleIndex];
        if (bundle) {
          // Remove the sale deduction
          const dedIdx = bundle.deductions.findIndex(
            d => d.reason === 'Sotuv' && d.count === item.quantity
          );
          if (dedIdx >= 0) bundle.deductions.splice(dedIdx, 1);
          await wagon.save({ session });
        }
      }
    }

    // Delete related payments and cash transactions
    const Payment = require('../models/Payment');
    await Payment.deleteMany({ sale: sale._id }).session(session);
    await CashTransaction.deleteMany({ relatedSale: sale._id }).session(session);

    await sale.deleteOne({ session });

    await session.commitTransaction();
    res.json({ message: 'Deleted' });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

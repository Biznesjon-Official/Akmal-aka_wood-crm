const Sale = require('../models/Sale');
const Payment = require('../models/Payment');
const Wagon = require('../models/Wagon');
const CashTransaction = require('../models/CashTransaction');

exports.getStats = async (req, res, next) => {
  try {
    const [salesAgg, paymentsAgg, wagonStats, balanceAgg, recentSales, incomingWagons] = await Promise.all([
      // Aggregate sales by currency
      Sale.aggregate([
        { $group: { _id: '$currency', totalAmount: { $sum: '$totalAmount' }, paidAmount: { $sum: '$paidAmount' } } }
      ]),
      // Aggregate payments by currency
      Payment.aggregate([
        { $group: { _id: '$currency', totalPaid: { $sum: '$amount' } } }
      ]),
      // Wagon counts
      Wagon.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      // Cash balance
      CashTransaction.aggregate([
        { $group: { _id: '$currency', kirim: { $sum: { $cond: [{ $eq: ['$type', 'kirim'] }, '$amount', 0] } }, chiqim: { $sum: { $cond: [{ $eq: ['$type', 'chiqim'] }, '$amount', 0] } } } }
      ]),
      Sale.find().populate('customer').sort({ createdAt: -1 }).limit(5).lean(),
      Wagon.find({ status: 'kelyapti' }).sort({ sentDate: -1 }).limit(5).lean(),
    ]);

    // Build sales/debt by currency
    const totalSales = { USD: 0, RUB: 0 };
    const totalDebt = { USD: 0, RUB: 0 };
    salesAgg.forEach(s => {
      const cur = s._id === 'RUB' ? 'RUB' : 'USD';
      totalSales[cur] += s.totalAmount || 0;
      totalDebt[cur] += (s.totalAmount || 0) - (s.paidAmount || 0);
    });
    paymentsAgg.forEach(p => {
      const cur = p._id === 'RUB' ? 'RUB' : 'USD';
      totalDebt[cur] -= p.totalPaid || 0;
    });

    // Cash balance
    const balance = { USD: 0, RUB: 0 };
    balanceAgg.forEach(b => {
      const cur = b._id === 'RUB' ? 'RUB' : 'USD';
      balance[cur] = (b.kirim || 0) - (b.chiqim || 0);
    });

    // Wagon counts
    let activeWagons = 0;
    let totalWagons = 0;
    wagonStats.forEach(w => {
      totalWagons += w.count;
      if (w._id === 'faol') activeWagons = w.count;
    });

    res.json({
      totalSales,
      totalDebt,
      balance,
      activeWagons,
      totalWagons,
      recentSales,
      incomingWagons
    });
  } catch (err) { next(err); }
};

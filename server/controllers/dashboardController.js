const Sale = require('../models/Sale');
const Wagon = require('../models/Wagon');
const CashTransaction = require('../models/CashTransaction');
const Delivery = require('../models/Delivery');

exports.getStats = async (req, res, next) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      salesAgg, balanceAgg, wagonStats,
      recentSales, incomingWagons,
      deliveries, thisMonthSalesAgg, cashMonthAgg,
    ] = await Promise.all([
      Sale.aggregate([
        { $group: { _id: '$currency', totalAmount: { $sum: '$totalAmount' }, paidAmount: { $sum: '$paidAmount' } } },
      ]),
      CashTransaction.aggregate([
        { $group: { _id: '$currency', kirim: { $sum: { $cond: [{ $eq: ['$type', 'kirim'] }, '$amount', 0] } }, chiqim: { $sum: { $cond: [{ $eq: ['$type', 'chiqim'] }, '$amount', 0] } } } },
      ]),
      Wagon.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Sale.find().populate('customer', 'name').sort({ createdAt: -1 }).limit(5).lean(),
      Wagon.find({ status: 'kelyapti' }).sort({ sentDate: -1 }).limit(5).lean(),
      Delivery.find().lean(),
      Sale.aggregate([
        { $match: { createdAt: { $gte: monthStart } } },
        { $group: { _id: '$currency', total: { $sum: '$totalAmount' } } },
      ]),
      CashTransaction.aggregate([
        { $match: { date: { $gte: monthStart } } },
        { $group: { _id: { currency: '$currency', type: '$type' }, total: { $sum: '$amount' } } },
      ]),
    ]);

    // Sales totals & debts
    const totalSales = { USD: 0, RUB: 0 };
    const totalDebt = { USD: 0, RUB: 0 };
    salesAgg.forEach(s => {
      const cur = s._id === 'RUB' ? 'RUB' : 'USD';
      totalSales[cur] += s.totalAmount || 0;
      totalDebt[cur] += Math.max(0, (s.totalAmount || 0) - (s.paidAmount || 0));
    });

    // Cash balance
    const balance = { USD: 0, RUB: 0 };
    balanceAgg.forEach(b => {
      const cur = b._id === 'RUB' ? 'RUB' : 'USD';
      balance[cur] = (b.kirim || 0) - (b.chiqim || 0);
    });

    // Wagon counts by status
    const wagonCounts = { kelyapti: 0, faol: 0, sotildi: 0, omborda: 0 };
    let totalWagons = 0;
    wagonStats.forEach(w => {
      if (wagonCounts.hasOwnProperty(w._id)) wagonCounts[w._id] = w.count;
      totalWagons += w.count;
    });

    // Delivery stats (compute virtuals manually from lean docs)
    let deliveryTotalDebt = 0;
    let deliveryPaid = 0;
    let deliveryActive = 0;
    deliveries.forEach(d => {
      const eff = Math.max(0, (d.cargoWeight || 0) - (d.ogirlik || 0));
      const debt = (d.uzRate || 0) * eff + (d.kzRate || 0) * eff
        + (d.avgExpense || 0) + (d.kodExpense || 0) + (d.prastoy || 0);
      const paid = (d.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
      deliveryTotalDebt += debt;
      deliveryPaid += paid;
      if (d.status !== 'yakunlandi') deliveryActive++;
    });

    // This month sales
    const thisMonth = { USD: 0, RUB: 0 };
    thisMonthSalesAgg.forEach(s => {
      const cur = s._id === 'RUB' ? 'RUB' : 'USD';
      thisMonth[cur] = s.total || 0;
    });

    // This month cash flow
    const monthCash = { kirimUSD: 0, chiqimUSD: 0, kirimRUB: 0, chiqimRUB: 0 };
    cashMonthAgg.forEach(c => {
      const cur = c._id.currency === 'RUB' ? 'RUB' : 'USD';
      if (c._id.type === 'kirim') monthCash[`kirim${cur}`] = c.total;
      else monthCash[`chiqim${cur}`] = c.total;
    });

    res.json({
      totalSales,
      totalDebt,
      balance,
      wagonCounts,
      totalWagons,
      deliveryStats: {
        totalDebt: deliveryTotalDebt,
        paidAmount: deliveryPaid,
        remaining: Math.max(0, deliveryTotalDebt - deliveryPaid),
        active: deliveryActive,
        total: deliveries.length,
      },
      thisMonth,
      monthCash,
      recentSales,
      incomingWagons,
    });
  } catch (err) { next(err); }
};

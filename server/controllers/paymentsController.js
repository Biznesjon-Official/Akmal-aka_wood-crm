const Payment = require('../models/Payment');
const CashTransaction = require('../models/CashTransaction');

exports.getAll = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.sale) filter.sale = req.query.sale;
    if (req.query.customer) filter.customer = req.query.customer;
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = new Date(req.query.from);
      if (req.query.to) filter.date.$lte = new Date(req.query.to);
    }
    const payments = await Payment.find(filter)
      .populate('customer')
      .populate('sale')
      .sort({ date: -1 })
      .lean();
    res.json(payments);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const payment = await Payment.create(req.body);
    const populated = await payment.populate(['customer', 'sale']);

    // Auto kirim to cash
    await CashTransaction.create({
      type: 'kirim',
      category: 'qarz_tolovi',
      amount: payment.amount,
      currency: payment.currency || 'USD',
      account: payment.currency === 'RUB' ? 'RUB_account' : 'USD_account',
      description: `Qarz to'lovi: ${populated.customer?.name || ''}`,
      relatedSale: payment.sale,
      date: payment.date,
    });

    res.status(201).json(populated);
  } catch (err) { next(err); }
};

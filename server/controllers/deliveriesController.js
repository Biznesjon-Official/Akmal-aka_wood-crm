const Delivery = require('../models/Delivery');
const CashTransaction = require('../models/CashTransaction');
const Settings = require('../models/Settings');

// Sync cash transactions for a delivery
const syncDeliveryCashTransactions = async (delivery) => {
  await CashTransaction.deleteMany({ relatedDelivery: delivery._id });

  const txns = [];

  // Each expense → chiqim
  for (const exp of delivery.expenses) {
    txns.push({
      type: 'chiqim',
      category: 'yetkazma',
      amount: exp.amount,
      currency: exp.currency,
      account: exp.currency === 'RUB' ? 'RUB_account' : 'USD_account',
      description: `Yetkazma: ${delivery.wagonCode} - ${exp.description}`,
      relatedDelivery: delivery._id,
      date: delivery.sentDate,
    });
  }

  // Income → kirim
  if (delivery.income > 0) {
    txns.push({
      type: 'kirim',
      category: 'yetkazma',
      amount: delivery.income,
      currency: delivery.incomeCurrency,
      account: delivery.incomeCurrency === 'RUB' ? 'RUB_account' : 'USD_account',
      description: `Yetkazma daromad: ${delivery.wagonCode}`,
      relatedDelivery: delivery._id,
      date: delivery.sentDate,
    });
  }

  if (txns.length) await CashTransaction.insertMany(txns);
};

exports.getAll = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const deliveries = await Delivery.find(filter).sort({ sentDate: -1 });
    res.json(deliveries);
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: 'Yetkazma topilmadi' });
    res.json(delivery);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const rate = await Settings.getExchangeRate();
    const delivery = await Delivery.create({ ...req.body, exchangeRate: rate });
    await syncDeliveryCashTransactions(delivery);
    res.status(201).json(delivery);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: 'Yetkazma topilmadi' });
    Object.assign(delivery, req.body);
    await delivery.save();
    await syncDeliveryCashTransactions(delivery);
    res.json(delivery);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: 'Yetkazma topilmadi' });
    await CashTransaction.deleteMany({ relatedDelivery: delivery._id });
    await delivery.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

exports.markDelivered = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: 'Yetkazma topilmadi' });
    delivery.status = 'yetkazildi';
    delivery.deliveredDate = new Date();
    await delivery.save();
    res.json(delivery);
  } catch (err) { next(err); }
};

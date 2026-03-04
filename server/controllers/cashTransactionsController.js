const CashTransaction = require('../models/CashTransaction');

exports.getAll = async (req, res, next) => {
  try {
    const { type, category, source, from, to, account, relatedPerson } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (source) filter.source = source;
    if (account) filter.account = account;
    if (relatedPerson) filter.relatedPerson = relatedPerson;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const transactions = await CashTransaction.find(filter)
      .populate('source', 'name')
      .populate('relatedPerson', 'name')
      .sort({ date: -1 })
      .lean();
    res.json(transactions);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const tx = await CashTransaction.create(req.body);
    res.status(201).json(tx);
  } catch (err) { next(err); }
};

exports.getBalance = async (req, res, next) => {
  try {
    const transactions = await CashTransaction.find().lean();
    const balance = { USD: 0, RUB_personal: 0, RUB_russia: 0 };
    transactions.forEach(tx => {
      let key;
      if (tx.currency === 'USD') key = 'USD';
      else if (tx.account === 'RUB_russia') key = 'RUB_russia';
      else key = 'RUB_personal'; // RUB_account + RUB_personal → shaxsiy
      if (tx.type === 'kirim') balance[key] += tx.amount;
      else balance[key] -= tx.amount;
    });
    res.json(balance);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const tx = await CashTransaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ message: 'Topilmadi' });
    await tx.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

exports.getReport = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const filter = {};
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const transactions = await CashTransaction.find(filter).lean();
    const report = { kirim: { USD: 0, RUB: 0 }, chiqim: { USD: 0, RUB: 0 }, byCategory: {} };
    transactions.forEach(tx => {
      const key = tx.currency === 'RUB' ? 'RUB' : 'USD';
      report[tx.type][key] += tx.amount;
      if (!report.byCategory[tx.category]) report.byCategory[tx.category] = { USD: 0, RUB: 0 };
      const sign = tx.type === 'kirim' ? 1 : -1;
      report.byCategory[tx.category][key] += sign * tx.amount;
    });
    res.json(report);
  } catch (err) { next(err); }
};

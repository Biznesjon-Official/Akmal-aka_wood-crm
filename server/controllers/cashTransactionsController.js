const CashTransaction = require('../models/CashTransaction');

exports.getAll = async (req, res, next) => {
  try {
    const { type, category, source, from, to } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (source) filter.source = source;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const transactions = await CashTransaction.find(filter)
      .populate('source', 'name')
      .sort({ date: -1 });
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
    const transactions = await CashTransaction.find();
    const balance = { USD: 0, RUB: 0 };
    transactions.forEach(tx => {
      const key = tx.currency === 'RUB' ? 'RUB' : 'USD';
      if (tx.type === 'kirim') balance[key] += tx.amount;
      else balance[key] -= tx.amount;
    });
    res.json(balance);
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
    const transactions = await CashTransaction.find(filter);
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

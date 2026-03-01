const Transfer = require('../models/Transfer');
const CashTransaction = require('../models/CashTransaction');
const CurrencyConversion = require('../models/CurrencyConversion');
const Settings = require('../models/Settings');
const TopUp = require('../models/TopUp');

exports.getAll = async (req, res, next) => {
  try {
    const transfers = await Transfer.find()
      .populate('wagon')
      .populate('customer')
      .sort({ createdAt: -1 })
      .lean();
    res.json(transfers);
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const transfer = await Transfer.findById(req.params.id)
      .populate('wagon')
      .populate('customer')
      .lean();
    if (!transfer) return res.status(404).json({ message: 'Topilmadi' });
    res.json(transfer);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const transfer = await Transfer.create(req.body);
    const populated = await transfer.populate(['wagon', 'customer']);
    res.status(201).json(populated);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) return res.status(404).json({ message: 'Topilmadi' });
    Object.assign(transfer, req.body);
    await transfer.save();
    await transfer.populate(['wagon', 'customer']);
    res.json(transfer);
  } catch (err) { next(err); }
};

exports.convertCurrency = async (req, res, next) => {
  try {
    const { amountUSD, amountRUB, commissionPercent, note, date } = req.body;
    if (!amountUSD || !amountRUB || amountUSD <= 0 || amountRUB <= 0) {
      return res.status(400).json({ message: 'USD va RUB summalarini kiriting' });
    }

    const effectiveRate = amountRUB / amountUSD;

    // Save conversion history
    const conversion = await CurrencyConversion.create({
      amountUSD,
      amountRUB,
      commissionPercent: commissionPercent || 0,
      effectiveRate,
      date: date || new Date(),
      note,
    });

    // USD chiqim
    await CashTransaction.create({
      type: 'chiqim',
      category: 'boshqa',
      amount: amountUSD,
      currency: 'USD',
      account: 'USD_account',
      description: `Konversiya: ${amountUSD} USD → ${amountRUB} RUB (kurs: ${effectiveRate.toFixed(2)})`,
      relatedConversion: conversion._id,
      date: date || new Date(),
    });

    // RUB kirim
    await CashTransaction.create({
      type: 'kirim',
      category: 'boshqa',
      amount: amountRUB,
      currency: 'RUB',
      account: 'RUB_personal',
      description: `Konversiya: ${amountUSD} USD → ${amountRUB} RUB (kurs: ${effectiveRate.toFixed(2)})`,
      relatedConversion: conversion._id,
      date: date || new Date(),
    });

    // Auto-update exchange rate in Settings
    await Settings.setExchangeRate(effectiveRate);

    res.status(201).json(conversion);
  } catch (err) { next(err); }
};

exports.getConversions = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const filter = {};
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const conversions = await CurrencyConversion.find(filter).sort({ date: -1 }).lean();
    res.json(conversions);
  } catch (err) { next(err); }
};

exports.deleteConversion = async (req, res, next) => {
  try {
    const conversion = await CurrencyConversion.findById(req.params.id);
    if (!conversion) return res.status(404).json({ message: 'Topilmadi' });

    // Delete related CashTransactions by ref
    await CashTransaction.deleteMany({ relatedConversion: conversion._id });

    await conversion.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

exports.createTopUp = async (req, res, next) => {
  try {
    const { amount, currency, description, date } = req.body;
    const topUp = await TopUp.create({ amount, currency, description, date });

    await CashTransaction.create({
      type: 'kirim',
      category: 'boshqa',
      amount,
      currency: currency || 'USD',
      account: currency === 'RUB' ? 'RUB_personal' : 'USD_account',
      description: description || 'Hisobni to\'ldirish',
      relatedTopUp: topUp._id,
      date: date || new Date(),
    });

    res.status(201).json(topUp);
  } catch (err) { next(err); }
};

exports.getTopUps = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const filter = {};
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const topUps = await TopUp.find(filter).sort({ date: -1 }).lean();
    res.json(topUps);
  } catch (err) { next(err); }
};

exports.deleteTopUp = async (req, res, next) => {
  try {
    const topUp = await TopUp.findById(req.params.id);
    if (!topUp) return res.status(404).json({ message: 'Topilmadi' });

    // Delete related CashTransaction by ref
    await CashTransaction.deleteMany({ relatedTopUp: topUp._id });

    await topUp.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

// Transfer: RUB_personal → RUB_russia
exports.transferRub = async (req, res, next) => {
  try {
    const { amount, note, date } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Summani kiriting' });
    const txDate = date || new Date();
    const desc = note || 'RUB o\'tkazma: shaxsiy → rossiya';
    await CashTransaction.create({
      type: 'chiqim', category: 'boshqa', amount, currency: 'RUB',
      account: 'RUB_personal', description: desc, date: txDate,
    });
    await CashTransaction.create({
      type: 'kirim', category: 'boshqa', amount, currency: 'RUB',
      account: 'RUB_russia', description: desc, date: txDate,
    });
    res.status(201).json({ ok: true, amount });
  } catch (err) { next(err); }
};

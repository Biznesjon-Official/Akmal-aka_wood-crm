const Partner = require('../models/Partner');

exports.getAll = async (req, res, next) => {
  try {
    const partners = await Partner.find().sort({ createdAt: -1 }).lean();
    res.json(partners);
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) return res.status(404).json({ message: 'Sherik topilmadi' });
    res.json(partner);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const partner = await Partner.create(req.body);
    res.status(201).json(partner);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) return res.status(404).json({ message: 'Sherik topilmadi' });
    Object.assign(partner, req.body);
    await partner.save();
    res.json(partner);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await Partner.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

exports.addInvestment = async (req, res, next) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) return res.status(404).json({ message: 'Sherik topilmadi' });
    partner.investments.push(req.body);
    await partner.save();
    res.status(201).json(partner);
  } catch (err) { next(err); }
};

exports.removeInvestment = async (req, res, next) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) return res.status(404).json({ message: 'Sherik topilmadi' });
    partner.investments.id(req.params.investmentId).deleteOne();
    await partner.save();
    res.json(partner);
  } catch (err) { next(err); }
};

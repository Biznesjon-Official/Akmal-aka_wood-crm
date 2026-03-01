const Supplier = require('../models/Supplier');

exports.getAll = async (req, res, next) => {
  try {
    const suppliers = await Supplier.find().sort({ createdAt: -1 }).lean();
    res.json(suppliers);
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Rus topilmadi' });
    res.json(supplier);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const supplier = await Supplier.create(req.body);
    res.status(201).json(supplier);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Rus topilmadi' });
    Object.assign(supplier, req.body);
    await supplier.save();
    res.json(supplier);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await Supplier.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

exports.getWagons = async (req, res, next) => {
  try {
    const Wagon = require('../models/Wagon');
    const wagons = await Wagon.find({ supplier: req.params.id }).sort({ createdAt: -1 }).lean();
    res.json(wagons);
  } catch (err) { next(err); }
};

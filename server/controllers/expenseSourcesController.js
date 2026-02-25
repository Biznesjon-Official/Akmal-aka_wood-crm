const ExpenseSource = require('../models/ExpenseSource');

exports.getAll = async (req, res, next) => {
  try {
    const sources = await ExpenseSource.find().sort({ name: 1 });
    res.json(sources);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const source = await ExpenseSource.create({ name: req.body.name });
    res.status(201).json(source);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Bu manba allaqachon mavjud' });
    }
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const source = await ExpenseSource.findById(req.params.id);
    if (!source) return res.status(404).json({ message: 'Manba topilmadi' });
    source.name = req.body.name;
    await source.save();
    res.json(source);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Bu manba allaqachon mavjud' });
    }
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const source = await ExpenseSource.findById(req.params.id);
    if (!source) return res.status(404).json({ message: 'Manba topilmadi' });
    if (source.isDefault) return res.status(400).json({ message: 'Default manbani o\'chirib bo\'lmaydi' });
    await source.deleteOne();
    res.json({ message: 'O\'chirildi' });
  } catch (err) { next(err); }
};

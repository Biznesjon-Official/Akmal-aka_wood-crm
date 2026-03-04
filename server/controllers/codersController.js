const Coder = require('../models/Coder');
const Wagon = require('../models/Wagon');
const Delivery = require('../models/Delivery');

exports.getAll = async (req, res, next) => {
  try {
    const coders = await Coder.find().sort({ createdAt: -1 });
    res.json(coders);
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const coder = await Coder.findById(req.params.id);
    if (!coder) return res.status(404).json({ message: 'Kodchi topilmadi' });
    res.json(coder);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const coder = await Coder.create(req.body);
    res.status(201).json(coder);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const coder = await Coder.findById(req.params.id);
    if (!coder) return res.status(404).json({ message: 'Kodchi topilmadi' });
    Object.assign(coder, req.body);
    await coder.save();
    res.json(coder);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await Wagon.updateMany({ coder: req.params.id }, { $unset: { coder: '' } });
    await Delivery.updateMany({ coder: req.params.id }, { $unset: { coder: '' } });
    await Coder.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

exports.getCodes = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [wagons, deliveries] = await Promise.all([
      Wagon.find({ coder: id }).sort({ sentDate: -1 }).lean(),
      Delivery.find({ coder: id }).populate('customer', 'name phone').sort({ sentDate: -1 }).lean(),
    ]);

    const codes = [
      ...wagons.map(w => ({
        _id: w._id,
        type: 'wagon',
        wagonCode: w.wagonCode,
        customer: null,
        sentDate: w.sentDate,
        status: w.status,
        createdAt: w.createdAt,
      })),
      ...deliveries.map(d => ({
        _id: d._id,
        type: 'delivery',
        wagonCode: d.wagonCode,
        customer: d.customer,
        sentDate: d.sentDate,
        status: d.status,
        createdAt: d.createdAt,
      })),
    ];

    codes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(codes);
  } catch (err) { next(err); }
};

// Code inventory endpoints
exports.addCode = async (req, res, next) => {
  try {
    const coder = await Coder.findById(req.params.id);
    if (!coder) return res.status(404).json({ message: 'Kodchi topilmadi' });
    coder.codes.push(req.body);
    await coder.save();
    res.status(201).json(coder.codes[coder.codes.length - 1]);
  } catch (err) { next(err); }
};

exports.removeCode = async (req, res, next) => {
  try {
    const coder = await Coder.findById(req.params.id);
    if (!coder) return res.status(404).json({ message: 'Kodchi topilmadi' });
    const code = coder.codes.id(req.params.codeId);
    if (!code) return res.status(404).json({ message: 'Kod topilmadi' });
    if (code.status === 'band') return res.status(400).json({ message: 'Band kodni o\'chirib bo\'lmaydi' });
    code.deleteOne();
    await coder.save();
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

exports.assignCode = async (req, res, next) => {
  try {
    const coder = await Coder.findById(req.params.id);
    if (!coder) return res.status(404).json({ message: 'Kodchi topilmadi' });
    const code = coder.codes.id(req.params.codeId);
    if (!code) return res.status(404).json({ message: 'Kod topilmadi' });
    if (code.status === 'band') return res.status(400).json({ message: 'Kod allaqachon band' });
    code.status = 'band';
    code.assignedTo = req.body.assignedTo;
    code.assignedModel = req.body.assignedModel;
    await coder.save();
    res.json(code);
  } catch (err) { next(err); }
};

exports.releaseCode = async (req, res, next) => {
  try {
    const coder = await Coder.findById(req.params.id);
    if (!coder) return res.status(404).json({ message: 'Kodchi topilmadi' });
    const code = coder.codes.id(req.params.codeId);
    if (!code) return res.status(404).json({ message: 'Kod topilmadi' });
    code.status = 'mavjud';
    code.assignedTo = undefined;
    code.assignedModel = undefined;
    await coder.save();
    res.json(code);
  } catch (err) { next(err); }
};

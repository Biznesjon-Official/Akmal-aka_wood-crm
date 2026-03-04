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

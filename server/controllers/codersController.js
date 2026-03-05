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
    await Wagon.updateMany({ coderUZ: req.params.id }, { $unset: { coderUZ: '' } });
    await Wagon.updateMany({ coderKZ: req.params.id }, { $unset: { coderKZ: '' } });
    await Delivery.updateMany({ uzCoder: req.params.id }, { $unset: { uzCoder: '' } });
    await Delivery.updateMany({ kzCoder: req.params.id }, { $unset: { kzCoder: '' } });
    await Delivery.updateMany({ avgCoder: req.params.id }, { $unset: { avgCoder: '' } });
    await Coder.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

exports.getCodes = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [wagons, deliveries] = await Promise.all([
      Wagon.find({ $or: [{ coderUZ: id }, { coderKZ: id }] }).sort({ sentDate: -1 }).lean(),
      Delivery.find({ $or: [{ uzCoder: id }, { kzCoder: id }, { avgCoder: id }] }).populate('customer', 'name phone').sort({ sentDate: -1 }).lean(),
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

// Debt calculation
exports.getDebt = async (req, res, next) => {
  try {
    const { id } = req.params;
    const coder = await Coder.findById(id);
    if (!coder) return res.status(404).json({ message: 'Kodchi topilmadi' });

    const [wagons, deliveries] = await Promise.all([
      Wagon.find({ $or: [{ coderUZ: id }, { coderKZ: id }] }).lean(),
      Delivery.find({ $or: [{ uzCoder: id }, { kzCoder: id }, { avgCoder: id }] }).lean(),
    ]);

    const details = [];
    let totalDebt = 0;

    for (const w of wagons) {
      if (w.coderUZ?.toString() === id && (w.uzCostPerTon || 0) > 0) {
        const amount = (w.uzCostPerTon || 0) * (w.tonnage || 0);
        totalDebt += amount;
        details.push({
          type: 'wagon', _id: w._id, wagonCode: w.wagonCode,
          codeType: 'UZ', codeName: w.uzCode || '',
          rate: w.uzCostPerTon, weight: w.tonnage, amount,
          date: w.sentDate || w.createdAt,
        });
      }
      if (w.coderKZ?.toString() === id && (w.kzCostPerTon || 0) > 0) {
        const amount = (w.kzCostPerTon || 0) * (w.tonnage || 0);
        totalDebt += amount;
        details.push({
          type: 'wagon', _id: w._id, wagonCode: w.wagonCode,
          codeType: 'KZ', codeName: w.kzCode || '',
          rate: w.kzCostPerTon, weight: w.tonnage, amount,
          date: w.sentDate || w.createdAt,
        });
      }
    }

    for (const d of deliveries) {
      const ew = Math.max(0, (d.cargoWeight || 0) - (d.ogirlik || 0));
      if (d.uzCoder?.toString() === id && (d.uzCost || 0) > 0) {
        const amount = (d.uzCost || 0) * ew;
        totalDebt += amount;
        details.push({
          type: 'delivery', _id: d._id, wagonCode: d.wagonCode,
          codeType: 'UZ', codeName: d.uzCode || '',
          rate: d.uzCost, weight: ew, amount,
          date: d.sentDate || d.createdAt,
        });
      }
      if (d.kzCoder?.toString() === id && (d.kzCost || 0) > 0) {
        const amount = (d.kzCost || 0) * ew;
        totalDebt += amount;
        details.push({
          type: 'delivery', _id: d._id, wagonCode: d.wagonCode,
          codeType: 'KZ', codeName: d.kzCode || '',
          rate: d.kzCost, weight: ew, amount,
          date: d.sentDate || d.createdAt,
        });
      }
      if (d.avgCoder?.toString() === id && (d.avgCost || 0) > 0) {
        const amount = d.avgCost || 0;
        totalDebt += amount;
        details.push({
          type: 'delivery', _id: d._id, wagonCode: d.wagonCode,
          codeType: 'AVG', codeName: d.avgCode || '',
          rate: null, weight: null, amount,
          date: d.sentDate || d.createdAt,
        });
      }
    }

    const paidAmount = (coder.payments || []).reduce((s, p) => s + (p.amount || 0), 0);

    res.json({ totalDebt, paidAmount, remainingDebt: totalDebt - paidAmount, details, payments: coder.payments || [] });
  } catch (err) { next(err); }
};

// Add payment
exports.addPayment = async (req, res, next) => {
  try {
    const CashTransaction = require('../models/CashTransaction');
    const coder = await Coder.findById(req.params.id);
    if (!coder) return res.status(404).json({ message: 'Kodchi topilmadi' });

    const { amount, date, note } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Summa noto\'g\'ri' });

    coder.payments.push({ amount, date: date || new Date(), note });
    await coder.save();

    await CashTransaction.create({
      type: 'chiqim',
      category: 'boshqa',
      amount,
      currency: 'USD',
      account: 'USD_account',
      description: `Kodchi to'lov: ${coder.name}${note ? ' — ' + note : ''}`,
      relatedPerson: coder._id,
      personModel: 'Supplier',
      date: date || new Date(),
    });

    res.json(coder);
  } catch (err) { next(err); }
};

// Remove payment
exports.removePayment = async (req, res, next) => {
  try {
    const CashTransaction = require('../models/CashTransaction');
    const coder = await Coder.findById(req.params.id);
    if (!coder) return res.status(404).json({ message: 'Kodchi topilmadi' });

    const idx = coder.payments.findIndex(p => p._id.toString() === req.params.paymentId);
    if (idx < 0) return res.status(404).json({ message: "To'lov topilmadi" });

    const [removed] = coder.payments.splice(idx, 1);
    await coder.save();

    await CashTransaction.deleteOne({
      description: { $regex: `Kodchi to'lov: ${coder.name}` },
      amount: removed.amount,
      type: 'chiqim',
    });

    res.json(coder);
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

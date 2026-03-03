const Delivery = require('../models/Delivery');
const CashTransaction = require('../models/CashTransaction');

exports.getAll = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const deliveries = await Delivery.find(filter)
      .populate('customer', 'name phone')
      .sort({ sentDate: -1 });
    res.json(deliveries.map(d => d.toJSON()));
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id).populate('customer', 'name phone');
    if (!delivery) return res.status(404).json({ message: 'Yetkazma topilmadi' });
    res.json(delivery);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const delivery = await Delivery.create(req.body);
    const populated = await delivery.populate('customer', 'name phone');
    res.status(201).json(populated.toJSON());
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: 'Yetkazma topilmadi' });
    Object.assign(delivery, req.body);
    await delivery.save();
    const populated = await delivery.populate('customer', 'name phone');
    res.json(populated.toJSON());
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
    delivery.arrivedDate = delivery.arrivedDate || new Date();
    await delivery.save();
    res.json(delivery.toJSON());
  } catch (err) { next(err); }
};

exports.removePayment = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: 'Topilmadi' });
    const idx = delivery.payments.findIndex(p => p._id.toString() === req.params.paymentId);
    if (idx < 0) return res.status(404).json({ message: "To'lov topilmadi" });
    const [removed] = delivery.payments.splice(idx, 1);
    if (delivery.status === 'yakunlandi') {
      const newPaid = delivery.payments.reduce((s, p) => s + p.amount, 0);
      if (newPaid < delivery.totalDebt) delivery.status = 'yetkazildi';
    }
    await delivery.save();
    await CashTransaction.deleteMany({
      relatedDelivery: delivery._id, category: 'yetkazma', amount: removed.amount,
    });
    res.json(delivery.toJSON());
  } catch (err) { next(err); }
};

// Add customer payment for delivery debt
exports.addPayment = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id).populate('customer', 'name');
    if (!delivery) return res.status(404).json({ message: 'Yetkazma topilmadi' });

    const { amount, date, note } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Summa noto\'g\'ri' });

    delivery.payments.push({ amount, date: date || new Date(), note });

    // Auto-complete when fully paid
    const newPaid = delivery.payments.reduce((s, p) => s + p.amount, 0);
    if (newPaid >= delivery.totalDebt && delivery.status !== 'yakunlandi') {
      delivery.status = 'yakunlandi';
    }

    await delivery.save();

    // Cash kirim when customer pays
    await CashTransaction.create({
      type: 'kirim',
      category: 'yetkazma',
      amount,
      currency: 'USD',
      account: 'USD_account',
      description: `Yetkazma to'lov: ${delivery.wagonCode || ''} — ${delivery.customer?.name || ''}`,
      relatedDelivery: delivery._id,
      date: date || new Date(),
    });

    res.json(delivery.toJSON());
  } catch (err) { next(err); }
};

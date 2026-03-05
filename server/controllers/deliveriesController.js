const Delivery = require('../models/Delivery');
const CashTransaction = require('../models/CashTransaction');

const populateFields = [
  { path: 'customer', select: 'name phone' },
  { path: 'sender', select: 'name phone' },
  { path: 'uzCoder', select: 'name' },
  { path: 'kzCoder', select: 'name' },
  { path: 'avgCoder', select: 'name' },
];

exports.getAll = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.customer) filter.customer = req.query.customer;
    const deliveries = await Delivery.find(filter)
      .populate(populateFields)
      .sort({ sentDate: -1 });
    res.json(deliveries.map(d => d.toJSON()));
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id).populate(populateFields);
    if (!delivery) return res.status(404).json({ message: 'Yetkazma topilmadi' });
    res.json(delivery);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const delivery = await Delivery.create(req.body);
    const populated = await delivery.populate(populateFields);
    res.status(201).json(populated.toJSON());
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: 'Yetkazma topilmadi' });
    Object.assign(delivery, req.body);
    await delivery.save();
    const populated = await delivery.populate(populateFields);
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
    delivery.arrivedDate = delivery.arrivedDate || new Date();
    await delivery.save();
    const populated = await delivery.populate(populateFields);
    res.json(populated.toJSON());
  } catch (err) { next(err); }
};

// Add customer payment
exports.addPayment = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id).populate(populateFields);
    if (!delivery) return res.status(404).json({ message: 'Yetkazma topilmadi' });

    const { amount, date, note } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Summa noto\'g\'ri' });

    delivery.payments.push({ amount, date: date || new Date(), note });
    await delivery.save();

    await CashTransaction.create({
      type: 'kirim',
      category: 'yetkazma',
      amount,
      currency: 'USD',
      account: 'USD_account',
      description: `Yetkazma to'lov: ${delivery.wagonCode || ''} — ${delivery.customer?.name || ''}`,
      relatedDelivery: delivery._id,
      relatedPerson: delivery.customer?._id || delivery.customer,
      personModel: 'Customer',
      date: date || new Date(),
    });

    res.json(delivery.toJSON());
  } catch (err) { next(err); }
};

// Remove customer payment
exports.removePayment = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: 'Topilmadi' });
    const idx = delivery.payments.findIndex(p => p._id.toString() === req.params.paymentId);
    if (idx < 0) return res.status(404).json({ message: "To'lov topilmadi" });
    const [removed] = delivery.payments.splice(idx, 1);
    await delivery.save();
    await CashTransaction.deleteMany({
      relatedDelivery: delivery._id, category: 'yetkazma', amount: removed.amount,
    });
    const populated = await delivery.populate(populateFields);
    res.json(populated.toJSON());
  } catch (err) { next(err); }
};

// Add supplier payment (cash chiqim)
exports.addSupplierPayment = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id).populate(populateFields);
    if (!delivery) return res.status(404).json({ message: 'Yetkazma topilmadi' });

    const { amount, date, note } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Summa noto\'g\'ri' });

    delivery.supplierPayments.push({ amount, date: date || new Date(), note });
    await delivery.save();

    await CashTransaction.create({
      type: 'chiqim',
      category: 'yetkazma',
      amount,
      currency: 'USD',
      account: 'USD_account',
      description: `Supplier to'lov: ${delivery.wagonCode || ''} — ${delivery.sender?.name || ''}`,
      relatedDelivery: delivery._id,
      relatedPerson: delivery.sender?._id || delivery.sender,
      personModel: 'Supplier',
      date: date || new Date(),
    });

    res.json(delivery.toJSON());
  } catch (err) { next(err); }
};

// Add expense (cash chiqim)
exports.addExpense = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id).populate(populateFields);
    if (!delivery) return res.status(404).json({ message: 'Yetkazma topilmadi' });

    const { description, amount, currency = 'USD' } = req.body;
    if (!description || !amount || amount <= 0) return res.status(400).json({ message: 'Tavsif va summa kerak' });

    delivery.expenses.push({ description, amount, currency });
    await delivery.save();

    await CashTransaction.create({
      type: 'chiqim',
      category: 'yetkazma-xarajat',
      amount,
      currency,
      account: currency === 'USD' ? 'USD_account' : 'RUB_account',
      description: `Yetkazma xarajat: ${delivery.wagonCode || ''} — ${description}`,
      relatedDelivery: delivery._id,
      date: new Date(),
    });

    res.json(delivery.toJSON());
  } catch (err) { next(err); }
};

// Remove expense
exports.removeExpense = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: 'Topilmadi' });
    const idx = delivery.expenses.findIndex(e => e._id.toString() === req.params.expenseId);
    if (idx < 0) return res.status(404).json({ message: 'Xarajat topilmadi' });
    const [removed] = delivery.expenses.splice(idx, 1);
    await delivery.save();
    await CashTransaction.deleteMany({
      relatedDelivery: delivery._id, category: 'yetkazma-xarajat', amount: removed.amount,
    });
    const populated = await delivery.populate(populateFields);
    res.json(populated.toJSON());
  } catch (err) { next(err); }
};

// Remove supplier payment
exports.removeSupplierPayment = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: 'Topilmadi' });
    const idx = delivery.supplierPayments.findIndex(p => p._id.toString() === req.params.paymentId);
    if (idx < 0) return res.status(404).json({ message: "To'lov topilmadi" });
    const [removed] = delivery.supplierPayments.splice(idx, 1);
    await delivery.save();
    await CashTransaction.deleteMany({
      relatedDelivery: delivery._id, category: 'yetkazma', amount: removed.amount, type: 'chiqim',
    });
    const populated = await delivery.populate(populateFields);
    res.json(populated.toJSON());
  } catch (err) { next(err); }
};

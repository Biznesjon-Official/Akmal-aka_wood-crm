const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const Payment = require('../models/Payment');

exports.getAll = async (req, res, next) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 }).lean();
    res.json(customers);
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Mijoz topilmadi' });
    res.json(customer);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json(customer);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Mijoz topilmadi' });
    Object.assign(customer, req.body);
    await customer.save();
    res.json(customer);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await Sale.deleteMany({ customer: req.params.id });
    await Payment.deleteMany({ customer: req.params.id });
    await Customer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

exports.getSales = async (req, res, next) => {
  try {
    const sales = await Sale.find({ customer: req.params.id })
      .populate('customer')
      .populate('items.wagon', 'wagonCode woodBundles')
      .sort({ date: -1 })
      .lean();
    res.json(sales);
  } catch (err) { next(err); }
};

exports.getDebts = async (req, res, next) => {
  try {
    const sales = await Sale.find({ customer: req.params.id }).lean();
    const payments = await Payment.find({ customer: req.params.id }).lean();
    const paymentsBySale = {};
    payments.forEach(p => {
      paymentsBySale[p.sale.toString()] = (paymentsBySale[p.sale.toString()] || 0) + p.amount;
    });
    const debts = sales
      .map(s => ({
        sale: s._id,
        date: s.date,
        totalAmount: s.totalAmount,
        paidAmount: s.paidAmount + (paymentsBySale[s._id.toString()] || 0),
        debt: s.totalAmount - s.paidAmount - (paymentsBySale[s._id.toString()] || 0)
      }))
      .filter(d => d.debt > 0);
    res.json(debts);
  } catch (err) { next(err); }
};

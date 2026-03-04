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

exports.getDebtors = async (req, res, next) => {
  try {
    const sales = await Sale.find().lean();
    const payments = await Payment.find().lean();

    // Group payments by customer
    const paymentsByCustomer = {};
    payments.forEach(p => {
      const cId = p.customer?.toString();
      if (!cId) return;
      paymentsByCustomer[cId] = (paymentsByCustomer[cId] || 0) + p.amount;
    });

    // Group sales by customer
    const salesByCustomer = {};
    sales.forEach(s => {
      const cId = s.customer?.toString();
      if (!cId) return;
      if (!salesByCustomer[cId]) salesByCustomer[cId] = { totalAmount: 0, paidAmount: 0 };
      salesByCustomer[cId].totalAmount += s.totalAmount || 0;
      salesByCustomer[cId].paidAmount += s.paidAmount || 0;
    });

    // Calculate debt per customer
    const debtorIds = [];
    const debtMap = {};
    for (const [cId, info] of Object.entries(salesByCustomer)) {
      const extraPaid = paymentsByCustomer[cId] || 0;
      const debt = info.totalAmount - info.paidAmount - extraPaid;
      if (debt > 0) {
        debtorIds.push(cId);
        debtMap[cId] = { totalAmount: info.totalAmount, paidAmount: info.paidAmount + extraPaid, debt };
      }
    }

    const customers = await Customer.find({ _id: { $in: debtorIds } }).lean();
    const result = customers.map(c => ({
      ...c,
      totalSaleAmount: debtMap[c._id.toString()].totalAmount,
      totalPaid: debtMap[c._id.toString()].paidAmount,
      debt: debtMap[c._id.toString()].debt,
    }));

    // Sort by debt descending
    result.sort((a, b) => b.debt - a.debt);
    res.json(result);
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

const MyDebt = require('../models/MyDebt');
const CashTransaction = require('../models/CashTransaction');

exports.getAll = async (req, res, next) => {
  try {
    const debts = await MyDebt.find().sort({ date: -1 });
    res.json(debts);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const debt = await MyDebt.create(req.body);

    // Qarz olinganda kassaga kirim
    await CashTransaction.create({
      type: 'kirim',
      category: 'boshqa',
      amount: debt.amount,
      currency: debt.currency || 'USD',
      account: debt.currency === 'RUB' ? 'RUB_account' : 'USD_account',
      description: `Qarz olindi: ${debt.creditor}`,
      relatedMyDebt: debt._id,
      date: debt.date,
    });

    res.status(201).json(debt);
  } catch (err) { next(err); }
};

exports.addPayment = async (req, res, next) => {
  try {
    const debt = await MyDebt.findById(req.params.id);
    if (!debt) return res.status(404).json({ message: 'Qarz topilmadi' });
    debt.payments.push(req.body);
    await debt.save();

    // Qarz to'langanda kassadan chiqim
    await CashTransaction.create({
      type: 'chiqim',
      category: 'boshqa',
      amount: req.body.amount,
      currency: debt.currency || 'USD',
      account: debt.currency === 'RUB' ? 'RUB_account' : 'USD_account',
      description: `Qarz to'landi: ${debt.creditor}`,
      relatedMyDebt: debt._id,
      date: req.body.date || new Date(),
    });

    res.json(debt);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const debt = await MyDebt.findById(req.params.id);
    if (!debt) return res.status(404).json({ message: 'Qarz topilmadi' });

    // Delete related CashTransactions by ref
    await CashTransaction.deleteMany({ relatedMyDebt: debt._id });

    await debt.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

const LentDebt = require('../models/LentDebt');
const CashTransaction = require('../models/CashTransaction');

exports.getAll = async (req, res, next) => {
  try {
    const debts = await LentDebt.find().sort({ date: -1 }).lean({ virtuals: true });
    res.json(debts);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const debt = await LentDebt.create(req.body);

    // Qarz berganda kassadan chiqim
    await CashTransaction.create({
      type: 'chiqim',
      category: 'boshqa',
      amount: debt.amount,
      currency: debt.currency || 'USD',
      account: debt.currency === 'RUB' ? 'RUB_account' : 'USD_account',
      description: `Qarz berildi: ${debt.debtor}`,
      relatedLentDebt: debt._id,
      date: debt.date,
    });

    res.status(201).json(debt);
  } catch (err) { next(err); }
};

exports.addPayment = async (req, res, next) => {
  try {
    const debt = await LentDebt.findById(req.params.id);
    if (!debt) return res.status(404).json({ message: 'Qarz topilmadi' });
    debt.payments.push(req.body);
    await debt.save();

    // Qarz qaytarilganda kassaga kirim
    await CashTransaction.create({
      type: 'kirim',
      category: 'boshqa',
      amount: req.body.amount,
      currency: debt.currency || 'USD',
      account: debt.currency === 'RUB' ? 'RUB_account' : 'USD_account',
      description: `Qarz qaytarildi: ${debt.debtor}`,
      relatedLentDebt: debt._id,
      date: req.body.date || new Date(),
    });

    res.json(debt);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const debt = await LentDebt.findById(req.params.id);
    if (!debt) return res.status(404).json({ message: 'Qarz topilmadi' });

    await CashTransaction.deleteMany({ relatedLentDebt: debt._id });
    await debt.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

const Wagon = require('../models/Wagon');
const CashTransaction = require('../models/CashTransaction');

// Map expense description to category
function mapCategory(description) {
  const desc = (description || '').toLowerCase();
  if (desc.includes("yog'och")) return 'xarid';
  if (desc.includes("temir yo'l") || desc.includes('tupik') || desc.includes('xrannei') || desc.includes('klent') || desc.includes('yerga')) return 'transport';
  if (desc.includes('nds') || desc.includes('soliq')) return 'soliq';
  return 'boshqa';
}

// Sync wagon expenses → CashTransaction records
async function syncWagonCashTransactions(wagonId, expenses) {
  await CashTransaction.deleteMany({ relatedWagon: wagonId });
  if (!expenses || expenses.length === 0) return;
  const docs = expenses.map((e) => ({
    type: 'chiqim',
    category: mapCategory(e.description),
    amount: e.amount,
    currency: e.currency || 'USD',
    account: (e.currency || 'USD') === 'RUB' ? 'RUB_account' : 'USD_account',
    description: `Vagon: ${e.description}`,
    relatedWagon: wagonId,
  }));
  await CashTransaction.insertMany(docs);
}

exports.getAll = async (req, res, next) => {
  try {
    const { status, startDate, endDate } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.sentDate = {};
      if (startDate) filter.sentDate.$gte = new Date(startDate);
      if (endDate) filter.sentDate.$lte = new Date(endDate);
    }
    const wagons = await Wagon.find(filter).sort({ createdAt: -1 });
    res.json(wagons);
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const wagon = await Wagon.findById(req.params.id);
    if (!wagon) return res.status(404).json({ message: 'Vagon topilmadi' });
    res.json(wagon);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const wagon = await Wagon.create(req.body);
    await syncWagonCashTransactions(wagon._id, wagon.expenses);
    res.status(201).json(wagon);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const wagon = await Wagon.findById(req.params.id);
    if (!wagon) return res.status(404).json({ message: 'Vagon topilmadi' });
    Object.assign(wagon, req.body);
    await wagon.save();
    await syncWagonCashTransactions(wagon._id, wagon.expenses);
    res.json(wagon);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const Sale = require('../models/Sale');
    await CashTransaction.deleteMany({ relatedWagon: req.params.id });
    await Sale.deleteMany({ 'items.wagon': req.params.id });
    await Wagon.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

exports.bundleToWarehouse = async (req, res, next) => {
  try {
    const wagon = await Wagon.findById(req.params.id);
    if (!wagon) return res.status(404).json({ message: 'Vagon topilmadi' });
    const bundle = wagon.woodBundles[req.params.index];
    if (!bundle) return res.status(404).json({ message: 'Bundle topilmadi' });
    bundle.location = 'ombor';
    await wagon.save();
    res.json(wagon);
  } catch (err) { next(err); }
};

exports.allBundlesToWarehouse = async (req, res, next) => {
  try {
    const wagon = await Wagon.findById(req.params.id);
    if (!wagon) return res.status(404).json({ message: 'Vagon topilmadi' });
    wagon.woodBundles.forEach((b) => { b.location = 'ombor'; });
    wagon.status = 'omborda';
    await wagon.save();
    res.json(wagon);
  } catch (err) { next(err); }
};

exports.updateExpenses = async (req, res, next) => {
  try {
    const wagon = await Wagon.findById(req.params.id);
    if (!wagon) return res.status(404).json({ message: 'Vagon topilmadi' });
    wagon.expenses = req.body.expenses;
    await wagon.save();
    await syncWagonCashTransactions(wagon._id, wagon.expenses);
    res.json(wagon);
  } catch (err) { next(err); }
};

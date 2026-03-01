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
async function syncWagonCashTransactions(wagonId, expenses, transportType) {
  await CashTransaction.deleteMany({ relatedWagon: wagonId });
  if (!expenses || expenses.length === 0) return;
  const prefix = transportType === 'mashina' ? 'Mashina' : 'Vagon';
  const docs = expenses.map((e) => ({
    type: 'chiqim',
    category: mapCategory(e.description),
    amount: e.amount,
    currency: e.currency || 'USD',
    account: (e.currency || 'USD') === 'RUB' ? 'RUB_account' : 'USD_account',
    description: `${prefix}: ${e.description}`,
    relatedWagon: wagonId,
  }));
  await CashTransaction.insertMany(docs);
}

exports.getAll = async (req, res, next) => {
  try {
    const { status, startDate, endDate, supplier } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (supplier) filter.supplier = supplier;
    if (startDate || endDate) {
      filter.sentDate = {};
      if (startDate) filter.sentDate.$gte = new Date(startDate);
      if (endDate) filter.sentDate.$lte = new Date(endDate);
    }
    const wagons = await Wagon.find(filter).populate('supplier', 'name phone').sort({ createdAt: -1 }).lean();
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
    await syncWagonCashTransactions(wagon._id, wagon.expenses, wagon.type);
    res.status(201).json(wagon);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const wagon = await Wagon.findById(req.params.id);
    if (!wagon) return res.status(404).json({ message: 'Vagon topilmadi' });
    Object.assign(wagon, req.body);
    await wagon.save();
    await syncWagonCashTransactions(wagon._id, wagon.expenses, wagon.type);
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
    await syncWagonCashTransactions(wagon._id, wagon.expenses, wagon.type);
    res.json(wagon);
  } catch (err) { next(err); }
};

// Profit summary for selected wagons (for partner share calculation)
exports.profitSummary = async (req, res, next) => {
  try {
    const ids = req.query.ids ? req.query.ids.split(',') : [];
    const Sale = require('../models/Sale');
    const Settings = require('../models/Settings');

    const wagons = ids.length
      ? await Wagon.find({ _id: { $in: ids } }).lean()
      : await Wagon.find().lean();

    const rate = await Settings.getExchangeRate();

    // Sum sales income per wagon
    const sales = await Sale.find({ 'items.wagon': { $in: wagons.map(w => w._id) } }).lean();
    const incomeByWagon = {};
    for (const sale of sales) {
      for (const item of sale.items) {
        const wid = item.wagon.toString();
        incomeByWagon[wid] = (incomeByWagon[wid] || 0) + (item.totalAmount || 0);
      }
    }

    const result = wagons.map(w => {
      const usdCost = w.expenses.filter(e => e.currency === 'USD').reduce((s, e) => s + e.amount, 0);
      const rubCost = w.expenses.filter(e => e.currency === 'RUB').reduce((s, e) => s + e.amount, 0);
      const totalCostUSD = usdCost + (rate > 0 ? rubCost / rate : 0);
      const totalIncomeUSD = incomeByWagon[w._id.toString()] || 0;
      return {
        _id: w._id,
        wagonCode: w.wagonCode,
        status: w.status,
        totalCostUSD: Math.round(totalCostUSD * 100) / 100,
        totalIncomeUSD: Math.round(totalIncomeUSD * 100) / 100,
        profitUSD: Math.round((totalIncomeUSD - totalCostUSD) * 100) / 100,
      };
    });

    res.json(result);
  } catch (err) { next(err); }
};

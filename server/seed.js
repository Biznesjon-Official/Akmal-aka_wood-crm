require('dotenv').config();
const mongoose = require('mongoose');

const Customer = require('./models/Customer');
const Wagon = require('./models/Wagon');
const Sale = require('./models/Sale');
const Payment = require('./models/Payment');
const CashTransaction = require('./models/CashTransaction');
const ExpenseSource = require('./models/ExpenseSource');
const Settings = require('./models/Settings');
const Transfer = require('./models/Transfer');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');

  // Clear all collections
  await Promise.all([
    Customer.deleteMany({}),
    Wagon.deleteMany({}),
    Sale.deleteMany({}),
    Payment.deleteMany({}),
    CashTransaction.deleteMany({}),
    ExpenseSource.deleteMany({}),
    Transfer.deleteMany({}),
  ]);
  console.log('DB cleared');

  // Set exchange rate
  await Settings.setExchangeRate(12800);

  // Create expense sources
  const sourceNames = ['Akmal aka', 'Toshkent ofis', 'Samarqand filial', 'Transport kompaniya', 'Boshqa'];
  const sources = await ExpenseSource.insertMany(sourceNames.map((name) => ({ name })));
  console.log(`${sources.length} expense sources created`);

  // Create customers
  const customers = await Customer.insertMany([
    { name: 'Namoz Kmaolov', phone: '+998901234567' },
    { name: 'Sardor Rahimov', phone: '+998911234567' },
    { name: 'Bobur Karimov', phone: '+998931234567' },
  ]);
  console.log(`${customers.length} customers created`);

  // Create 5 wagons with wood bundles
  const wagonsData = [
    {
      wagonCode: '111111111',
      status: 'faol',
      origin: 'Rossiya',
      destination: 'Toshkent',
      exchangeRate: 12800,
      expenses: [
        { description: 'Yog\'och xaridi', amount: 5000, currency: 'USD' },
        { description: 'Transport', amount: 800000, currency: 'RUB' },
      ],
      woodBundles: [
        { thickness: 50, width: 180, length: 6, count: 200, location: 'ombor' },
        { thickness: 40, width: 200, length: 4, count: 300, location: 'ombor' },
        { thickness: 30, width: 150, length: 6, count: 250, location: 'vagon' },
      ],
    },
    {
      wagonCode: '222222222',
      status: 'faol',
      origin: 'Rossiya',
      destination: 'Samarqand',
      exchangeRate: 12800,
      expenses: [
        { description: 'Yog\'och xaridi', amount: 4500, currency: 'USD' },
        { description: 'Transport', amount: 600000, currency: 'RUB' },
      ],
      woodBundles: [
        { thickness: 50, width: 150, length: 4, count: 350, location: 'ombor' },
        { thickness: 60, width: 150, length: 6, count: 200, location: 'ombor' },
      ],
    },
    {
      wagonCode: '333333333',
      status: 'faol',
      origin: 'Rossiya',
      destination: 'Buxoro',
      exchangeRate: 12800,
      expenses: [
        { description: 'Yog\'och xaridi', amount: 6000, currency: 'USD' },
        { description: 'Transport', amount: 900000, currency: 'RUB' },
        { description: 'Bojxona', amount: 500, currency: 'USD' },
      ],
      woodBundles: [
        { thickness: 50, width: 180, length: 6, count: 150, location: 'ombor' },
        { thickness: 40, width: 200, length: 4, count: 400, location: 'ombor' },
        { thickness: 25, width: 100, length: 6, count: 500, location: 'vagon' },
        { thickness: 50, width: 200, length: 6, count: 180, location: 'vagon' },
      ],
    },
    {
      wagonCode: '444444444',
      status: 'kelyapti',
      origin: 'Rossiya',
      destination: 'Toshkent',
      sentDate: new Date('2026-02-20'),
      exchangeRate: 12800,
      expenses: [
        { description: 'Yog\'och xaridi', amount: 5500, currency: 'USD' },
        { description: 'Transport', amount: 750000, currency: 'RUB' },
      ],
      woodBundles: [
        { thickness: 40, width: 150, length: 6, count: 300, location: 'vagon' },
        { thickness: 50, width: 200, length: 4, count: 250, location: 'vagon' },
      ],
    },
    {
      wagonCode: '555555555',
      status: 'faol',
      origin: 'Rossiya',
      destination: 'Navoiy',
      exchangeRate: 12800,
      expenses: [
        { description: 'Yog\'och xaridi', amount: 4000, currency: 'USD' },
        { description: 'Transport', amount: 500000, currency: 'RUB' },
      ],
      woodBundles: [
        { thickness: 30, width: 100, length: 4, count: 600, location: 'ombor' },
        { thickness: 50, width: 150, length: 6, count: 200, location: 'ombor' },
        { thickness: 40, width: 180, length: 6, count: 150, location: 'vagon' },
      ],
    },
  ];

  // Save wagons one by one (pre-save hook needs save())
  const wagons = [];
  for (const data of wagonsData) {
    const wagon = new Wagon(data);
    await wagon.save();
    wagons.push(wagon);
    console.log(`Wagon ${wagon.wagonCode} created — tannarx: ${wagon.costPricePerM3?.toFixed(2)} USD/m³`);
  }

  // Create some cash transactions
  const txData = [
    { type: 'chiqim', amount: 5000, currency: 'USD', account: 'USD_account', source: sources[0]._id, description: 'Vagon 111 xaridi', date: new Date('2026-02-10') },
    { type: 'chiqim', amount: 4500, currency: 'USD', account: 'USD_account', source: sources[0]._id, description: 'Vagon 222 xaridi', date: new Date('2026-02-12') },
    { type: 'chiqim', amount: 800000, currency: 'RUB', account: 'RUB_account', source: sources[3]._id, description: 'Vagon 111 transport', date: new Date('2026-02-11') },
    { type: 'chiqim', amount: 600000, currency: 'RUB', account: 'RUB_account', source: sources[3]._id, description: 'Vagon 222 transport', date: new Date('2026-02-13') },
    { type: 'chiqim', amount: 500, currency: 'USD', account: 'USD_account', source: sources[1]._id, description: 'Ofis ijarasi', date: new Date('2026-02-15') },
    { type: 'kirim', amount: 3000, currency: 'USD', account: 'USD_account', source: sources[4]._id, description: 'Yog\'och sotuvi', date: new Date('2026-02-18') },
    { type: 'kirim', amount: 2000, currency: 'USD', account: 'USD_account', source: sources[4]._id, description: 'Yog\'och sotuvi 2', date: new Date('2026-02-20') },
    { type: 'chiqim', amount: 300, currency: 'USD', account: 'USD_account', source: sources[2]._id, description: 'Samarqand xarajat', date: new Date('2026-02-22') },
  ];
  await CashTransaction.insertMany(txData);
  console.log(`${txData.length} cash transactions created`);

  console.log('\nSeed completed!');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});

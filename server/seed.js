require('dotenv').config();
const mongoose = require('mongoose');

const Customer = require('./models/Customer');
const Supplier = require('./models/Supplier');
const Coder = require('./models/Coder');
const Partner = require('./models/Partner');
const Wagon = require('./models/Wagon');
const Sale = require('./models/Sale');
const Payment = require('./models/Payment');
const Delivery = require('./models/Delivery');
const CashTransaction = require('./models/CashTransaction');
const LentDebt = require('./models/LentDebt');
const MyDebt = require('./models/MyDebt');
const Transfer = require('./models/Transfer');
const CurrencyConversion = require('./models/CurrencyConversion');
const TopUp = require('./models/TopUp');
const ExpenseSource = require('./models/ExpenseSource');
const Settings = require('./models/Settings');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Drop all collections
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const col of collections) {
    await mongoose.connection.db.dropCollection(col.name);
  }
  console.log('All collections dropped');

  // Settings
  await Settings.create({ key: 'exchangeRate', value: 12800 });
  console.log('Settings created');

  // Expense Sources
  await ExpenseSource.ensureDefaults();
  console.log('Expense sources created');

  // Suppliers
  const suppliers = await Supplier.create([
    { name: 'Sergey Petrov', phone: '+79161234567', note: 'Krasnoyarsk yetkazuvchi' },
    { name: 'Andrey Ivanov', phone: '+79267654321', note: 'Irkutsk yetkazuvchi' },
    { name: 'Viktor Sidorov', phone: '+79031112233', note: 'Novosibirsk' },
  ]);
  console.log('Suppliers:', suppliers.length);

  // Coders
  const coders = await Coder.create([
    { name: 'Bobur', phone: '+998901234567', note: 'Asosiy kodchi' },
    { name: 'Sardor', phone: '+998907654321', note: 'Yordamchi kodchi' },
  ]);
  console.log('Coders:', coders.length);

  // Customers
  const customers = await Customer.create([
    { name: 'Alisher Karimov', phone: '+998901112233', note: 'Doimiy mijoz', customerType: 'customer' },
    { name: 'Jamshid Toshmatov', phone: '+998902223344', customerType: 'customer' },
    { name: 'Otabek Rahimov', phone: '+998903334455', note: 'Katta buyurtmalar', customerType: 'customer' },
    { name: 'Bekzod Normatov', phone: '+998904445566', customerType: 'customer' },
    { name: 'Dilshod Umarov', phone: '+998905556677', customerType: 'customer' },
    { name: 'Ahmad Shah', phone: '+93701234567', note: 'Kabul', customerType: 'afghan' },
    { name: 'Mohammad Reza', phone: '+93702345678', note: 'Mazar-i-Sharif', customerType: 'afghan' },
    { name: 'Akmaljon (o\'zim)', phone: '+998911234567', note: 'O\'zim uchun', customerType: 'ozim' },
    { name: 'Bozor uchun', phone: '', note: 'Bozorga olib ketish', customerType: 'ozim' },
  ]);
  console.log('Customers:', customers.length);

  const ozimCustomer = customers.find(c => c.name.includes('Akmaljon'));

  // Partners
  const p1 = await Partner.create({
    name: 'Ravshan Sobirov', phone: '+998931112233', note: 'Asosiy sherik', profitPercent: 30,
    investments: [
      { type: 'deposit', amount: 50000, currency: 'USD', date: new Date('2025-01-15'), note: 'Boshlang\'ich investitsiya' },
      { type: 'deposit', amount: 20000, currency: 'USD', date: new Date('2025-03-01'), note: 'Qo\'shimcha' },
      { type: 'withdrawal', amount: 10000, currency: 'USD', date: new Date('2025-05-01'), note: 'Foyda olish' },
    ],
  });
  const p2 = await Partner.create({
    name: 'Nodir Xasanov', phone: '+998942223344', note: 'Kichik sherik', profitPercent: 15,
    investments: [
      { type: 'deposit', amount: 25000, currency: 'USD', date: new Date('2025-02-10'), note: 'Boshlang\'ich' },
    ],
  });
  console.log('Partners: 2');

  // Wagons
  const w1 = new Wagon({
    type: 'vagon', wagonCode: '52345678', status: 'faol',
    sentDate: new Date('2026-02-10'), arrivedDate: new Date('2026-02-20'),
    origin: 'Krasnoyarsk', destination: 'Toshkent',
    supplier: suppliers[0]._id, coder: coders[0]._id,
    exchangeRate: 12800,
    expenses: [
      { description: "Yog'och xaridi", amount: 3500000, currency: 'RUB' },
      { description: 'Kod UZ', amount: 200, currency: 'USD' },
      { description: 'Kod KZ', amount: 150, currency: 'USD' },
      { description: 'NDS', amount: 300, currency: 'USD' },
      { description: 'Usluga', amount: 100, currency: 'USD' },
      { description: "Temir yo'l KZ", amount: 450, currency: 'USD' },
      { description: "Temir yo'l UZ", amount: 380, currency: 'USD' },
      { description: 'Tupik', amount: 60, currency: 'USD' },
      { description: 'Xrannei', amount: 40, currency: 'USD' },
    ],
    woodBundles: [
      { thickness: 50, width: 150, length: 6, count: 200, location: 'ombor' },
      { thickness: 50, width: 200, length: 6, count: 150, location: 'ombor' },
      { thickness: 40, width: 150, length: 6, count: 180, location: 'ombor' },
    ],
  });
  await w1.save();

  const w2 = new Wagon({
    type: 'vagon', wagonCode: '61234567', status: 'faol',
    sentDate: new Date('2026-02-15'), arrivedDate: new Date('2026-02-25'),
    origin: 'Irkutsk', destination: 'Toshkent',
    supplier: suppliers[1]._id, coder: coders[1]._id,
    exchangeRate: 12800,
    expenses: [
      { description: "Yog'och xaridi", amount: 4200000, currency: 'RUB' },
      { description: 'Kod UZ', amount: 220, currency: 'USD' },
      { description: 'Kod KZ', amount: 170, currency: 'USD' },
      { description: 'NDS', amount: 350, currency: 'USD' },
      { description: 'Usluga', amount: 120, currency: 'USD' },
      { description: "Temir yo'l KZ", amount: 500, currency: 'USD' },
      { description: "Temir yo'l UZ", amount: 400, currency: 'USD' },
      { description: 'Tupik', amount: 80, currency: 'USD' },
      { description: 'Klentga ortish', amount: 50, currency: 'USD' },
    ],
    woodBundles: [
      { thickness: 50, width: 150, length: 6, count: 250, location: 'ombor' },
      { thickness: 50, width: 100, length: 6, count: 300, location: 'ombor' },
    ],
  });
  await w2.save();

  const w3 = new Wagon({
    type: 'vagon', wagonCode: '71122334', status: 'kelyapti',
    sentDate: new Date('2026-02-25'), origin: 'Novosibirsk', destination: 'Toshkent',
    supplier: suppliers[2]._id, coder: coders[0]._id, customer: ozimCustomer._id,
    exchangeRate: 12800,
    expenses: [
      { description: "Yog'och xaridi", amount: 2800000, currency: 'RUB' },
      { description: 'Kod UZ', amount: 180, currency: 'USD' },
      { description: 'Kod KZ', amount: 140, currency: 'USD' },
      { description: 'NDS', amount: 280, currency: 'USD' },
      { description: "Temir yo'l UZ", amount: 350, currency: 'USD' },
    ],
    woodBundles: [
      { thickness: 40, width: 100, length: 6, count: 400, location: 'vagon' },
      { thickness: 50, width: 150, length: 6, count: 200, location: 'vagon' },
    ],
  });
  await w3.save();

  const w4 = new Wagon({
    type: 'mashina', wagonCode: 'AB1234', status: 'kelyapti',
    sentDate: new Date('2026-03-01'), origin: 'Krasnoyarsk', destination: 'Andijon',
    supplier: suppliers[0]._id, coder: coders[1]._id,
    exchangeRate: 12800,
    expenses: [
      { description: "Yog'och xaridi", amount: 1500000, currency: 'RUB' },
      { description: 'Kod UZ', amount: 100, currency: 'USD' },
    ],
    woodBundles: [
      { thickness: 50, width: 200, length: 6, count: 100, location: 'vagon' },
    ],
  });
  await w4.save();

  const w5 = new Wagon({
    type: 'vagon', wagonCode: '88776655', status: 'faol',
    sentDate: new Date('2026-01-20'), arrivedDate: new Date('2026-02-01'),
    origin: 'Krasnoyarsk', destination: 'Samarqand',
    supplier: suppliers[0]._id, coder: coders[0]._id,
    exchangeRate: 12800,
    expenses: [
      { description: "Yog'och xaridi", amount: 5000000, currency: 'RUB' },
      { description: 'Kod UZ', amount: 250, currency: 'USD' },
      { description: 'Kod KZ', amount: 200, currency: 'USD' },
      { description: 'NDS', amount: 400, currency: 'USD' },
      { description: 'Usluga', amount: 150, currency: 'USD' },
      { description: "Temir yo'l KZ", amount: 550, currency: 'USD' },
      { description: "Temir yo'l UZ", amount: 420, currency: 'USD' },
      { description: 'Yerga tushurish', amount: 70, currency: 'USD' },
    ],
    woodBundles: [
      { thickness: 50, width: 180, length: 6, count: 300, location: 'ombor' },
      { thickness: 40, width: 200, length: 4, count: 250, location: 'ombor' },
      { thickness: 30, width: 150, length: 6, count: 350, location: 'ombor' },
    ],
  });
  await w5.save();

  console.log('Wagons: 5');

  // Sales
  const sale1 = await Sale.create({
    customer: customers[0]._id, date: new Date('2026-02-28'),
    items: [
      { wagon: w1._id, bundleIndex: 0, quantity: 50, pricePerPiece: 8, m3PerPiece: 0.045, totalM3: 2.25, totalAmount: 400 },
      { wagon: w1._id, bundleIndex: 1, quantity: 30, pricePerPiece: 10, m3PerPiece: 0.06, totalM3: 1.8, totalAmount: 300 },
    ],
    totalAmount: 700, paidAmount: 300, currency: 'USD',
  });

  const sale2 = await Sale.create({
    customer: customers[1]._id, date: new Date('2026-03-01'),
    items: [
      { wagon: w2._id, bundleIndex: 0, quantity: 100, pricePerPiece: 7.5, m3PerPiece: 0.045, totalM3: 4.5, totalAmount: 750 },
    ],
    totalAmount: 750, paidAmount: 750, currency: 'USD',
  });

  const sale3 = await Sale.create({
    customer: customers[2]._id, date: new Date('2026-03-02'),
    items: [
      { wagon: w5._id, bundleIndex: 0, quantity: 80, pricePerPiece: 9, m3PerPiece: 0.054, totalM3: 4.32, totalAmount: 720 },
    ],
    totalAmount: 720, paidAmount: 0, currency: 'USD',
  });

  const sale4 = await Sale.create({
    customer: customers[3]._id, date: new Date('2026-03-03'),
    items: [
      { wagon: w2._id, bundleIndex: 1, quantity: 60, pricePerPiece: 5, m3PerPiece: 0.03, totalM3: 1.8, totalAmount: 300 },
    ],
    totalAmount: 300, paidAmount: 100, currency: 'USD',
  });

  const sale5 = await Sale.create({
    customer: customers[4]._id, date: new Date('2026-03-04'),
    items: [
      { wagon: w5._id, bundleIndex: 1, quantity: 120, pricePerPiece: 4, m3PerPiece: 0.032, totalM3: 3.84, totalAmount: 480 },
      { wagon: w5._id, bundleIndex: 2, quantity: 100, pricePerPiece: 3.5, m3PerPiece: 0.027, totalM3: 2.7, totalAmount: 350 },
    ],
    totalAmount: 830, paidAmount: 500, currency: 'USD',
  });
  console.log('Sales: 5');

  // Payments
  await Payment.create([
    { sale: sale1._id, customer: customers[0]._id, amount: 200, currency: 'USD', date: new Date('2026-03-01'), note: 'Birinchi to\'lov' },
    { sale: sale3._id, customer: customers[2]._id, amount: 300, currency: 'USD', date: new Date('2026-03-03'), note: 'Qisman to\'lov' },
    { sale: sale4._id, customer: customers[3]._id, amount: 50, currency: 'USD', date: new Date('2026-03-04'), note: 'Qisman' },
    { sale: sale5._id, customer: customers[4]._id, amount: 100, currency: 'USD', date: new Date('2026-03-04'), note: 'Qisman' },
  ]);
  console.log('Payments: 4');

  // Cash transactions
  await CashTransaction.create([
    { type: 'kirim', category: 'sotuv', amount: 300, currency: 'USD', account: 'USD_account', description: 'Sale1 boshlang\'ich', relatedSale: sale1._id, relatedPerson: customers[0]._id, personModel: 'Customer', date: new Date('2026-02-28') },
    { type: 'kirim', category: 'sotuv', amount: 200, currency: 'USD', account: 'USD_account', description: 'Sale1 to\'lov', relatedPerson: customers[0]._id, personModel: 'Customer', date: new Date('2026-03-01') },
    { type: 'kirim', category: 'sotuv', amount: 750, currency: 'USD', account: 'USD_account', description: 'Sale2 to\'liq', relatedSale: sale2._id, relatedPerson: customers[1]._id, personModel: 'Customer', date: new Date('2026-03-01') },
    { type: 'kirim', category: 'sotuv', amount: 500, currency: 'USD', account: 'USD_account', description: 'Sale5 boshlang\'ich', relatedSale: sale5._id, relatedPerson: customers[4]._id, personModel: 'Customer', date: new Date('2026-03-04') },
    { type: 'chiqim', category: 'xarid', amount: 1680, currency: 'USD', account: 'USD_account', description: 'Wagon1 USD xarajatlar', relatedWagon: w1._id, date: new Date('2026-02-20') },
    { type: 'chiqim', category: 'xarid', amount: 1890, currency: 'USD', account: 'USD_account', description: 'Wagon2 USD xarajatlar', relatedWagon: w2._id, date: new Date('2026-02-25') },
    { type: 'chiqim', category: 'xarid', amount: 2040, currency: 'USD', account: 'USD_account', description: 'Wagon5 USD xarajatlar', relatedWagon: w5._id, date: new Date('2026-02-05') },
    { type: 'chiqim', category: 'boshqa', amount: 500, currency: 'USD', account: 'USD_account', description: 'Ofis ijarasi', date: new Date('2026-03-01') },
    { type: 'chiqim', category: 'boshqa', amount: 200, currency: 'USD', account: 'USD_account', description: 'Kommunal xizmatlar', date: new Date('2026-03-01') },
  ]);
  console.log('Cash transactions: 9');

  // LentDebts
  const ld1 = new LentDebt({
    debtor: 'Alisher Karimov', amount: 500, currency: 'USD', description: 'Shaxsiy qarz', date: new Date('2026-02-20'),
    payments: [{ amount: 100, date: new Date('2026-03-01'), note: 'Qisman qaytardi' }],
  });
  await ld1.save();
  const ld2 = new LentDebt({
    debtor: 'Dilshod Umarov', amount: 1000, currency: 'USD', description: 'Yog\'och uchun qarz', date: new Date('2026-02-25'),
    payments: [],
  });
  await ld2.save();
  const ld3 = new LentDebt({
    debtor: 'Ahmad Shah', amount: 2000, currency: 'USD', description: 'Afg\'on yog\'och qarz', date: new Date('2026-01-10'),
    payments: [{ amount: 500, date: new Date('2026-02-15'), note: 'Birinchi' }],
  });
  await ld3.save();
  console.log('Lent debts: 3');

  // MyDebts
  const md1 = new MyDebt({
    creditor: 'Sergey Petrov', amount: 3500000, currency: 'RUB', description: 'Wagon1 yog\'och', date: new Date('2026-02-15'),
    payments: [{ amount: 1000000, date: new Date('2026-03-01'), note: 'Birinchi' }],
  });
  await md1.save();
  const md2 = new MyDebt({
    creditor: 'Andrey Ivanov', amount: 4200000, currency: 'RUB', description: 'Wagon2 yog\'och', date: new Date('2026-02-20'),
    payments: [],
  });
  await md2.save();
  console.log('My debts: 2');

  // Deliveries
  const del1 = new Delivery({
    wagonCode: 'DEL-001', customer: customers[4]._id, coder: coders[0]._id,
    sentDate: new Date('2026-02-28'), status: "yo'lda",
    uzCode: 'UZ-12345', uzCost: 200, kzCode: 'KZ-67890', kzCost: 150,
    expenses: [{ description: 'Transport', amount: 300, currency: 'USD', date: new Date('2026-02-28') }],
    payments: [{ amount: 200, currency: 'USD', date: new Date('2026-03-01'), note: 'Oldindan' }],
  });
  await del1.save();
  const del2 = new Delivery({
    wagonCode: 'DEL-002', customer: customers[0]._id, coder: coders[1]._id,
    sentDate: new Date('2026-03-01'), status: "yo'lda",
    uzCode: 'UZ-22222', uzCost: 180, kzCode: 'KZ-33333', kzCost: 160,
    expenses: [{ description: 'Bojxona', amount: 250, currency: 'USD', date: new Date('2026-03-01') }],
    payments: [],
  });
  await del2.save();
  const del3 = new Delivery({
    wagonCode: 'DEL-003', customer: customers[5]._id, coder: coders[0]._id,
    sentDate: new Date('2026-03-02'), status: "yo'lda",
    uzCode: 'UZ-33333', uzCost: 190, kzCode: 'KZ-44444', kzCost: 145,
    expenses: [],
    payments: [{ amount: 150, currency: 'USD', date: new Date('2026-03-03'), note: 'Avans' }],
  });
  await del3.save();
  console.log('Deliveries: 3');

  // Currency conversions
  await CurrencyConversion.create([
    { amountUSD: 5000, amountRUB: 64000000, commissionPercent: 1.5, effectiveRate: 12800, date: new Date('2026-02-20'), note: 'Valyuta almashtirish' },
    { amountUSD: 3000, amountRUB: 38400000, commissionPercent: 1.0, effectiveRate: 12800, date: new Date('2026-03-01'), note: 'Ikkinchi konvertatsiya' },
  ]);
  console.log('Currency conversions: 2');

  // Top-ups
  await TopUp.create([
    { amount: 10000, currency: 'USD', description: 'Kassaga naqd kiritish', date: new Date('2026-02-10') },
    { amount: 5000000, currency: 'RUB', description: 'RUB hisobiga to\'ldirish', date: new Date('2026-02-15') },
    { amount: 5000, currency: 'USD', description: 'Qo\'shimcha kiritish', date: new Date('2026-03-01') },
  ]);
  console.log('Top-ups: 3');

  console.log('\n=== SEED YAKUNLANDI ===');
  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => { console.error('Seed error:', err); process.exit(1); });

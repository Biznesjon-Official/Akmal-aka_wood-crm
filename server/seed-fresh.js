'use strict';

require('dotenv').config();
const mongoose = require('mongoose');

const MyDebt = require('./models/MyDebt');
const LentDebt = require('./models/LentDebt');
const CashTransaction = require('./models/CashTransaction');
const Customer = require('./models/Customer');
const Sale = require('./models/Sale');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✓ MongoDB ulandi\n');

  // 1. Clear existing debts and related cash transactions
  const myDebtIds = (await MyDebt.find().lean()).map(d => d._id);
  const lentDebtIds = (await LentDebt.find().lean()).map(d => d._id);
  await CashTransaction.deleteMany({ $or: [
    { relatedMyDebt: { $in: myDebtIds } },
    { relatedLentDebt: { $in: lentDebtIds } },
  ]});
  await MyDebt.deleteMany({});
  await LentDebt.deleteMany({});
  console.log('✓ Eski MyDebt, LentDebt va bog\'liq CashTransaction tozalandi');

  // 2. Seed MyDebts (mening qarzdorligim)
  const myDebts = [
    { creditor: 'Faxri aka', amount: 20000, currency: 'USD', description: 'Shaxsiy qarz' },
    { creditor: 'H.B.B.', amount: 27230, currency: 'USD', description: 'Sherik ulushi' },
  ];
  await MyDebt.insertMany(myDebts);
  console.log(`✓ MyDebt: ${myDebts.length} ta qo'shildi`);

  // 3. Seed LentDebts (mendan qarzdorlar — shaxsiy)
  const lentDebts = [
    { debtor: "Nodir jo'ram", amount: 1450, currency: 'USD', description: 'Shaxsiy qarz' },
    { debtor: 'Murod Donot', amount: 700, currency: 'USD', description: 'Shaxsiy qarz' },
    { debtor: 'Mohina', amount: 150, currency: 'USD', description: 'Shaxsiy qarz' },
  ];
  await LentDebt.insertMany(lentDebts);
  console.log(`✓ LentDebt: ${lentDebts.length} ta qo'shildi`);

  // 4. Seed yogoch qarzdorlar (Customer + Sale)
  const woodDebtors = [
    { name: 'Otabek Padon', debt: 4355 },
    { name: "Jo'rabek Zamon", debt: 7199 },
    { name: "Ulug'bek Yaznam", debt: 24465 },
    { name: "Nodir Qarako'l", debt: 10485 },
    { name: 'Azam aka Samarqand', debt: 18216 },
    { name: 'Sherzod Taxta klent', debt: 5328 },
    { name: "Umid Kattaqo'rg'on", debt: 5222 },
    { name: 'Aziz Padon', debt: 5875 },
  ];

  for (const wd of woodDebtors) {
    // Find or create customer
    let customer = await Customer.findOne({ name: wd.name });
    if (!customer) {
      customer = await Customer.create({ name: wd.name });
      console.log(`  + Mijoz yaratildi: ${wd.name}`);
    }

    // Check existing sales debt for this customer
    const existingSales = await Sale.find({ customer: customer._id }).lean();
    const existingDebt = existingSales.reduce((s, sale) => s + (sale.totalAmount || 0) - (sale.paidAmount || 0), 0);

    if (existingDebt >= wd.debt - 1) {
      console.log(`  ○ ${wd.name}: mavjud qarz $${existingDebt.toFixed(0)}, skip`);
      continue;
    }

    // Create sale with remaining debt as totalAmount (insertMany skips pre-save)
    const needDebt = wd.debt - existingDebt;
    await Sale.collection.insertOne({
      customer: customer._id,
      date: new Date(),
      items: [],
      totalAmount: needDebt,
      paidAmount: 0,
      currency: 'USD',
      note: "Yog'och qarzi — astatka",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`  + Sotuv yaratildi: ${wd.name} — $${needDebt}`);
  }
  console.log(`✓ Yogoch qarzdorlar: ${woodDebtors.length} ta`);

  await mongoose.disconnect();
  console.log('\n✓ Seed muvaffaqiyatli tugadi!');
}

main().catch(err => {
  console.error('Xato:', err.message);
  process.exit(1);
});

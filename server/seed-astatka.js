'use strict';

require('dotenv').config();
const mongoose = require('mongoose');

const DRY_RUN = process.argv.includes('--dry');

const LentDebt = require('./models/LentDebt');
const MyDebt   = require('./models/MyDebt');

const lentDebts = [
  // Yog'och qarzdorlar
  { debtor: 'Otabek Padon',        amount: 4355,  currency: 'USD', description: "Yog'och qarzi — astatka" },
  { debtor: "Jo'rabek Zamon",       amount: 7199,  currency: 'USD', description: "Yog'och qarzi — astatka" },
  { debtor: "Ulug'bek Yaznam",      amount: 24465, currency: 'USD', description: "Yog'och qarzi — astatka" },
  { debtor: "Nodir Qarako'l",       amount: 10485, currency: 'USD', description: "Yog'och qarzi — astatka" },
  { debtor: 'Azam aka Samarqand',   amount: 18216, currency: 'USD', description: "Yog'och qarzi — astatka" },
  { debtor: 'Sherzod Taxta klent',  amount: 5328,  currency: 'USD', description: "Yog'och qarzi — astatka" },
  { debtor: "Umid Kattaqo'rg'on",   amount: 5222,  currency: 'USD', description: "Yog'och qarzi — astatka" },
  { debtor: 'Aziz Padon',           amount: 5875,  currency: 'USD', description: "Yog'och qarzi — astatka" },
  // Shaxsiy qarzdorlar
  { debtor: "Nodir jo'ram",         amount: 1450,  currency: 'USD', description: 'Shaxsiy qarz — astatka' },
  { debtor: 'Murod Donot',          amount: 700,   currency: 'USD', description: 'Shaxsiy qarz — astatka' },
  { debtor: 'Mohina',               amount: 150,   currency: 'USD', description: 'Shaxsiy qarz — astatka' },
];

const myDebts = [
  { creditor: 'H.B.B.',      amount: 27230, currency: 'USD', description: 'Sherik ulushi — astatka' },
  { creditor: 'Faxri aka',   amount: 20000, currency: 'USD', description: 'Shaxsiy qarz — astatka' },
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✓ MongoDB ulandi\n');

  if (DRY_RUN) {
    console.log('━━━ DRY-RUN ━━━\n');
    console.log(`LentDebt qo'shiladi: ${lentDebts.length} ta`);
    lentDebts.forEach(d => console.log(`  ${d.debtor}: $${d.amount} — ${d.description}`));
    console.log(`\nMyDebt qo'shiladi: ${myDebts.length} ta`);
    myDebts.forEach(d => console.log(`  ${d.creditor}: $${d.amount} — ${d.description}`));
    console.log('\n✓ Dry-run tugadi. Hech narsa o\'zgartirilmadi.');
  } else {
    const ld = await LentDebt.insertMany(lentDebts);
    console.log(`✓ LentDebt: ${ld.length} ta qo'shildi`);

    const md = await MyDebt.insertMany(myDebts);
    console.log(`✓ MyDebt: ${md.length} ta qo'shildi`);

    console.log('\n✓ Astatka ma\'lumotlari muvaffaqiyatli qo\'shildi.');
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Xato:', err.message);
  process.exit(1);
});

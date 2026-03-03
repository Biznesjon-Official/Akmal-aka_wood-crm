/**
 * reset-cash.js — Kassa ma'lumotlarini tozalash
 *
 * O'CHIRILADI:
 *   - CashTransaction   → barcha kassa kirimi/chiqimi yozuvlari
 *   - Sale              → barcha sotuvlar (mijozlarning yog'och qarzlari)
 *   - Payment           → barcha qarz to'lovlari (Sale ga bog'liq)
 *   - Transfer          → barcha RUB o'tkazmalari
 *   - CurrencyConversion → barcha USD↔RUB konversiyalari
 *   - TopUp             → barcha USD/RUB zaryadlari (kirim)
 *
 * TOZALANADI (yozuv o'chirilmaydi, faqat to'lovlar bo'shatiladi):
 *   - Delivery.payments → har bir yetkazma uchun to'lovlar massivi bo'shatiladi
 *                         status "yakunlandi" bo'lsa "yetkazildi" ga qaytariladi
 *
 * O'ZGARMAYDI:
 *   - Wagon        (vagonlar va ombordagi yog'ochlar)
 *   - Customer     (mijozlar)
 *   - Delivery     (yetkazmalar — faqat to'lovlar tozalanadi)
 *   - Supplier     (etkazib beruvchilar)
 *   - ExpenseSource (xarajat manbalari)
 *   - MyDebt       (mening qarzlarim)
 *   - LentDebt     (mendan qarzdorlar)
 *   - Settings     (valyuta kursi va sozlamalar)
 *
 * ISHLATISH (server/ papkasidan):
 *   node reset-cash.js --dry    ← faqat hisob (hech narsa o'chirmaydi)
 *   node reset-cash.js          ← haqiqiy o'chirish
 */

'use strict';

require('dotenv').config();
const mongoose = require('mongoose');

const DRY_RUN = process.argv.includes('--dry');

const CashTransaction    = require('./models/CashTransaction');
const Sale               = require('./models/Sale');
const Payment            = require('./models/Payment');
const Transfer           = require('./models/Transfer');
const CurrencyConversion = require('./models/CurrencyConversion');
const TopUp              = require('./models/TopUp');
const Delivery           = require('./models/Delivery');
const Wagon              = require('./models/Wagon');
const Customer           = require('./models/Customer');
const Supplier           = require('./models/Supplier');
const ExpenseSource      = require('./models/ExpenseSource');
const MyDebt             = require('./models/MyDebt');
const LentDebt           = require('./models/LentDebt');
const Settings           = require('./models/Settings');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✓ MongoDB ulandi\n');

  if (DRY_RUN) {
    console.log('━━━ DRY-RUN rejimi — hech narsa o\'chirilmaydi ━━━\n');
  } else {
    console.log('━━━ HAQIQIY O\'CHIRISH ━━━\n');
  }

  // 1. CashTransaction
  const cashCount = await CashTransaction.countDocuments();
  console.log(`CashTransaction    : ${cashCount} ta yozuv`);
  if (!DRY_RUN && cashCount > 0) {
    const r = await CashTransaction.deleteMany({});
    console.log(`  → ${r.deletedCount} ta o'chirildi`);
  }

  // 2. Sale
  const saleCount = await Sale.countDocuments();
  console.log(`Sale               : ${saleCount} ta yozuv`);
  if (!DRY_RUN && saleCount > 0) {
    const r = await Sale.deleteMany({});
    console.log(`  → ${r.deletedCount} ta o'chirildi`);
  }

  // 3. Payment
  const paymentCount = await Payment.countDocuments();
  console.log(`Payment            : ${paymentCount} ta yozuv`);
  if (!DRY_RUN && paymentCount > 0) {
    const r = await Payment.deleteMany({});
    console.log(`  → ${r.deletedCount} ta o'chirildi`);
  }

  // 4. Transfer
  const transferCount = await Transfer.countDocuments();
  console.log(`Transfer           : ${transferCount} ta yozuv`);
  if (!DRY_RUN && transferCount > 0) {
    const r = await Transfer.deleteMany({});
    console.log(`  → ${r.deletedCount} ta o'chirildi`);
  }

  // 5. CurrencyConversion
  const convCount = await CurrencyConversion.countDocuments();
  console.log(`CurrencyConversion : ${convCount} ta yozuv`);
  if (!DRY_RUN && convCount > 0) {
    const r = await CurrencyConversion.deleteMany({});
    console.log(`  → ${r.deletedCount} ta o'chirildi`);
  }

  // 6. TopUp
  const topUpCount = await TopUp.countDocuments();
  console.log(`TopUp              : ${topUpCount} ta yozuv`);
  if (!DRY_RUN && topUpCount > 0) {
    const r = await TopUp.deleteMany({});
    console.log(`  → ${r.deletedCount} ta o'chirildi`);
  }

  // 7. Delivery.payments — subdoclarni tozalash
  const deliveriesWithPay = await Delivery.find({ 'payments.0': { $exists: true } });
  const totalPayments = deliveriesWithPay.reduce((s, d) => s + d.payments.length, 0);
  console.log(`\nDelivery.payments  : ${deliveriesWithPay.length} ta yetkazmada jami ${totalPayments} ta to'lov bor`);
  if (!DRY_RUN && deliveriesWithPay.length > 0) {
    let statusResetCount = 0;
    for (const d of deliveriesWithPay) {
      d.payments = [];
      if (d.status === 'yakunlandi') {
        d.status = 'yetkazildi';
        statusResetCount++;
      }
      await d.save();
    }
    console.log(`  → ${deliveriesWithPay.length} ta yetkazma to'lovlari tozalandi`);
    if (statusResetCount > 0) {
      console.log(`  → ${statusResetCount} ta yetkazma: "yakunlandi" → "yetkazildi"`);
    }
  }

  // ─── O'zgarmaydigan ma'lumotlar ─────────────────────────────────────────
  const [wC, cuC, dC, suC, esC, mdC, ldC, sC] = await Promise.all([
    Wagon.countDocuments(),
    Customer.countDocuments(),
    Delivery.countDocuments(),
    Supplier.countDocuments(),
    ExpenseSource.countDocuments(),
    MyDebt.countDocuments(),
    LentDebt.countDocuments(),
    Settings.countDocuments(),
  ]);

  console.log('\n━━━ O\'ZGARMAGAN MA\'LUMOTLAR ━━━');
  console.log(`Wagon        : ${wC} ta`);
  console.log(`Customer     : ${cuC} ta`);
  console.log(`Delivery     : ${dC} ta (to'lovlarsiz)`);
  console.log(`Supplier     : ${suC} ta`);
  console.log(`ExpenseSource: ${esC} ta`);
  console.log(`MyDebt       : ${mdC} ta`);
  console.log(`LentDebt     : ${ldC} ta`);
  console.log(`Settings     : ${sC} ta`);

  console.log(DRY_RUN
    ? '\n✓ Dry-run tugadi. Hech narsa o\'zgartirilmadi.'
    : '\n✓ Kassa ma\'lumotlari muvaffaqiyatli tozalandi.'
  );

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Xato:', err.message);
  process.exit(1);
});

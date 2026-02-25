# Models

Mongoose schemalar. Har bir model `server/models/` da.

## Modellar
- **Wagon** — Vagon (expenses[], woodBundles[], deductions[], auto-status pre-save)
- **Customer** — Mijoz (name, phone, note)
- **Sale** — Sotuv (items[] with wagon ref, pre-save totalAmount hisoblash)
- **Payment** — To'lov (sale + customer ref)
- **Transfer** — O'tkazma (wagon + customer ref, status: jarayonda/tugallandi)
- **CashTransaction** — Kassa (kirim/chiqim, category, USD/RUB account)
- **Settings** — Sozlamalar (key/value, exchangeRate static methods)

## Qoidalar
- `findByIdAndUpdate` ISHLATMA — `findById` + `save()` (pre-save hooks uchun)
- Valyuta: `enum: ['USD', 'RUB']`
- Nested schema yaratganda `pre('validate')` yoki `pre('save')` hook ishlat
- m³: `thickness(mm) * width(mm) * length(m) / 1e6`

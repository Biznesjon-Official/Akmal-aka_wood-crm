# Yogoch Savdo CRM
Yog'och import-savdo biznesini boshqarish tizimi. Vagon, xarajat, sotuv, qarz, kassa, o'tkazma.

## Texnologiyalar
- **Frontend**: React 19 + Vite 7 + Ant Design 6 + React Query 5 + React Router 7 + Axios + Dayjs
- **Backend**: Express 4 + Mongoose 8 + MongoDB Atlas
- **Dev**: `npm run dev` (concurrently server:5010 + client:3010)
- **Deploy**: PM2 (`ecosystem.config.js`) + Nginx (`nginx-akmalaka.conf`)
- **Domain**: akmalaka.biznesjon.uz

## Struktura
```
crm/
  client/src/
    api/index.js        — barcha API funksiyalari (axios)
    components/         — AppLayout (sidebar + outlet)
    pages/              — Dashboard, Wagons, Warehouse, Sales, Customers, Debts, Cash, Transfers
    utils/format.js     — formatDate, formatMoney, formatM3, statusLabels
  server/
    models/             — Wagon, Customer, Sale, Payment, CashTransaction, Transfer, Settings
    controllers/        — har bir model uchun CRUD
    routes/             — Express router (model nomi bilan)
    middleware/          — errorHandler
```

## Buyruqlar
- `npm run dev` — server + client parallel
- `cd client && npm run build` — production build
- `cd client && npm run lint` — eslint

## Kod qoidalari
- Semicolonlar MAJBURIY
- 2 space indent
- camelCase (variables/functions), PascalCase (components)
- Server: CommonJS (`require`), Client: ES modules (`import`)
- Arrow function: `exports.getAll = async (req, res, next) => {}`
- Error handling: `try {} catch (err) { next(err); }`
- API response: to'g'ridan-to'g'ri `res.json(data)`, xato: `res.status(4xx).json({ message: '...' })`
- Frontend: `useQuery`/`useMutation` + `queryClient.invalidateQueries`
- Valyuta: USD va RUB (enum), kurs Settings modelda

## API format
- GET list: `res.json([...])` — array
- GET one: `res.json({...})` — object, 404 agar topilmasa
- POST: `res.status(201).json(created)`
- PUT: `res.json(updated)` — `findById` + `Object.assign` + `save()` (pre-save triggerlar uchun)
- DELETE: `res.json({ message: 'Deleted' })`

## Skill shablonlar
Quyidagi vazifalarni bajarishdan OLDIN tegishli skill faylni o'qi:
- API endpoint yaratish → `.claude/skills/api-endpoint.md`
- Yangi sahifa yaratish → `.claude/skills/new-page.md`
- Bug tuzatish → `.claude/skills/bug-fix.md`
- Refactor → `.claude/skills/refactor.md`

## TOKEN TEJASH (MAJBURIY)
- Ortiqcha tushuntirma BERMA, faqat kod yoz
- Savol BERMA, eng yaxshi variantni tanla va qisqacha ayt
- Faqat o'zgargan fayllarni ko'rsat, o'zgarmagan fayllarni QAYTA YOZMA
- Bir xil kodni takrorlab tushuntirma BERMA
- Agar 3 tadan kam qator o'zgarsa, faqat o'sha qatorlarni ko'rsat
- Har bir javob MAKSIMUM 50 qator kod, undan ko'p bo'lsa faylga yoz
- Bo'sh gaplar YOZMA, tasdiq so'rama
- Xato bo'lsa o'zing tuzat

## TAQIQLANGAN
- `var` ishlatma — `const`/`let`
- `console.log` productiondan olib tashla
- `any` type
- inline style o'rniga Ant Design components ishlat (faqat jadval stillar bundan mustasno)
- `findByIdAndUpdate` model pre-save hook kerak bo'lganda — `findById` + `save()` ishlat

## Muhim
- Wagon status avtomatik: kelyapti → faol (yog'och+xarajat+tannarx) → sotildi
- m3 hisob: `thickness(mm) * width(mm) * length(m) / 1e6`
- Tannarx: `(USD_xarajatlar + RUB_xarajatlar/kurs) / jami_m3`
- Kurs Settings modeldan olinadi yoki vagon.exchangeRate
- woodBundle.remainingCount = count - deductions.sum(count)

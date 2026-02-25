# Bug tuzatish

## Qadamlar
1. Xatoni aniqla — console/network/terminal xatolarni o'qi
2. Tegishli faylni top va o'qi
3. Root cause ni aniqla
4. Minimal o'zgartirish bilan tuzat
5. Bog'liq joylarni tekshir (model ↔ controller ↔ API ↔ frontend)

## Tekshirish ro'yxati
- [ ] Model field nomlari frontend bilan mos kelayaptimi?
- [ ] API response formati kutilganday mi? (array vs object)
- [ ] Pre-save hooklar ishlayaptimi? (`findById` + `save()` ishlatilganmi?)
- [ ] Required fieldlar to'ldirilganmi?
- [ ] Nested modal zIndex muammosi yo'qmi? (1100 ishlat)
- [ ] Date formatlar to'g'rimi? (dayjs ↔ toISOString)

## Tez-tez uchraydigan muammolar
- `findByIdAndUpdate` pre-save hookni ishga tushirmaydi → `findById` + `save()`
- Nested Modal ko'rinmaydi → `zIndex: 1100` qo'sh
- Filter params mos kelmaydi → frontend va backend param nomlarini solishtir
- 500 xato → server console ni tekshir, model validation xatosi bo'lishi mumkin

# Refactor

## Qadamlar
1. O'zgartirilayotgan kodni to'liq o'qi
2. Bog'liq fayllarni aniqla (import/export chain)
3. Minimal o'zgartirish bilan refactor qil
4. Hech qanday funksionallikni o'zgartirma

## Prinsiplar
- Shared logic → alohida helper/component chiqar
- Takrorlanuvchi kod → bir joyga yig'
- Katta component → kichik componentlarga bo'l (faqat 200+ qator bo'lsa)
- `var` → `const`/`let`
- Inline style → Ant Design component props (jadval stillar bundan mustasno)

## Qoidalar
- Ishlayotgan kodni BUZMA
- Test qilib ko'r (npm run lint)
- Faqat kerakli o'zgarishlarni qil, ortiqcha "yaxshilash" QILMA

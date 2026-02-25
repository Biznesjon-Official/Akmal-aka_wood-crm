# Pages

Har bir sahifa `pages/<Name>/index.jsx` da. React Query + Ant Design.

## Sahifalar
- **Dashboard** — Statistika (sotuvlar, qarzlar, balans, faol vagonlar)
- **Wagons** — Vagonlar CRUD (CreateWagonModal + WagonDetailModal, inline expenses, wood bundles)
- **Warehouse** — Ombordagi yog'ochlar
- **Sales** — Sotuvlar (items[] with wagon bundle selection)
- **Customers** — Mijozlar CRUD
- **Debts** — Qarzlar (sale - payments)
- **Cash** — Kassa (kirim/chiqim, balans, hisobot)
- **Transfers** — O'tkazmalar + valyuta kursi boshqaruvi

## Pattern
- `useQuery` data olish, `useMutation` yaratish/yangilash
- `queryClient.invalidateQueries` muvaffaqiyatdan keyin
- `message.success/error` notification
- `rowKey="_id"` jadvalda

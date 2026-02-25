# API Client

`api/index.js` — barcha API funksiyalar. Axios instance `baseURL: '/api'`.

## Format
```js
export const getItems = (params) => api.get('/items', { params }).then(r => r.data);
export const createItem = (data) => api.post('/items', data).then(r => r.data);
```

## Qoidalar
- Har doim `.then(r => r.data)` bilan response unwrap qil
- params GET uchun `{ params }` orqali yuboriladi
- Yangi endpoint qo'shganda shu faylga qo'sh

# Routes

Express router fayllar. Har biri `server/index.js` da `app.use('/api/<name>', require('./routes/<name>'))` bilan ulanadi.

## Mavjud routelar
- `/api/wagons` — CRUD + bundleToWarehouse + updateExpenses
- `/api/customers` — CRUD + getSales + getDebts
- `/api/sales` — getAll, getOne, create
- `/api/payments` — getAll, create
- `/api/cash-transactions` — getAll, create, getBalance, getReport
- `/api/transfers` — CRUD
- `/api/dashboard` — getStats
- `/api/settings` — GET/PUT exchange-rate

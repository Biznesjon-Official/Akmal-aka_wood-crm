import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

// Wagons
export const getWagons = (params) =>
  api.get("/wagons", { params }).then((r) => r.data);
export const getWagon = (id) => api.get(`/wagons/${id}`).then((r) => r.data);
export const createWagon = (data) =>
  api.post("/wagons", data).then((r) => r.data);
export const updateWagon = (id, data) =>
  api.put(`/wagons/${id}`, data).then((r) => r.data);
export const deleteWagon = (id) =>
  api.delete(`/wagons/${id}`).then((r) => r.data);
export const bundleToWarehouse = (id, index) =>
  api.put(`/wagons/${id}/bundles/${index}/to-warehouse`).then((r) => r.data);
export const updateExpenses = (id, expenses) =>
  api.put(`/wagons/${id}/expenses`, { expenses }).then((r) => r.data);
export const allBundlesToWarehouse = (id) =>
  api.put(`/wagons/${id}/to-warehouse`).then((r) => r.data);

// Customers
export const getCustomers = () => api.get("/customers").then((r) => r.data);
export const getCustomer = (id) =>
  api.get(`/customers/${id}`).then((r) => r.data);
export const createCustomer = (data) =>
  api.post("/customers", data).then((r) => r.data);
export const updateCustomer = (id, data) =>
  api.put(`/customers/${id}`, data).then((r) => r.data);
export const deleteCustomer = (id) =>
  api.delete(`/customers/${id}`).then((r) => r.data);
export const getCustomerSales = (id) =>
  api.get(`/customers/${id}/sales`).then((r) => r.data);
export const getCustomerDebts = (id) =>
  api.get(`/customers/${id}/debts`).then((r) => r.data);

// Salesad  f a fja;lf asdaoij a  k aslf ja fa;lkma ajfioaaaawlij mma,ozkpw f aa
export const getSales = () => api.get("/sales").then((r) => r.data);
export const getSale = (id) => api.get(`/sales/${id}`).then((r) => r.data);
export const createSale = (data) =>
  api.post("/sales", data).then((r) => r.data);
export const deleteSale = (id) =>
  api.delete(`/sales/${id}`).then((r) => r.data);

// Payments
export const getPayments = (params) =>
  api.get("/payments", { params }).then((r) => r.data);
export const createPayment = (data) =>
  api.post("/payments", data).then((r) => r.data);

// Cash Transactions
export const getCashTransactions = (params) =>
  api.get("/cash-transactions", { params }).then((r) => r.data);
export const createCashTransaction = (data) =>
  api.post("/cash-transactions", data).then((r) => r.data);
export const getCashBalance = () =>
  api.get("/cash-transactions/balance").then((r) => r.data);
export const getCashReport = (params) =>
  api.get("/cash-transactions/report", { params }).then((r) => r.data);

// Transfers
export const getTransfers = () => api.get("/transfers").then((r) => r.data);
export const getTransfer = (id) =>
  api.get(`/transfers/${id}`).then((r) => r.data);
export const createTransfer = (data) =>
  api.post("/transfers", data).then((r) => r.data);
export const updateTransfer = (id, data) =>
  api.put(`/transfers/${id}`, data).then((r) => r.data);
export const convertCurrency = (data) =>
  api.post("/transfers/convert", data).then((r) => r.data);
export const getConversions = () =>
  api.get("/transfers/conversions").then((r) => r.data);
export const deleteConversion = (id) =>
  api.delete(`/transfers/conversions/${id}`).then((r) => r.data);
export const getTopUps = () =>
  api.get("/transfers/top-ups").then((r) => r.data);
export const createTopUp = (data) =>
  api.post("/transfers/top-ups", data).then((r) => r.data);
export const deleteTopUp = (id) =>
  api.delete(`/transfers/top-ups/${id}`).then((r) => r.data);

// Dashboard
export const getDashboardStats = () =>
  api.get("/dashboard/stats").then((r) => r.data);

// Expense Sources
export const getExpenseSources = () =>
  api.get("/expense-sources").then((r) => r.data);
export const createExpenseSource = (data) =>
  api.post("/expense-sources", data).then((r) => r.data);
export const updateExpenseSource = (id, data) =>
  api.put(`/expense-sources/${id}`, data).then((r) => r.data);
export const getWagonProfitSummary = (ids) =>
  api.get('/wagons/profit-summary', { params: ids?.length ? { ids: ids.join(',') } : {} }).then((r) => r.data);
export const deleteExpenseSource = (id) =>
  api.delete(`/expense-sources/${id}`).then((r) => r.data);

// My Debts
export const getMyDebts = () => api.get("/my-debts").then((r) => r.data);
export const createMyDebt = (data) =>
  api.post("/my-debts", data).then((r) => r.data);
export const addMyDebtPayment = (id, data) =>
  api.post(`/my-debts/${id}/payments`, data).then((r) => r.data);
export const deleteMyDebt = (id) =>
  api.delete(`/my-debts/${id}`).then((r) => r.data);

// Lent Debts (mendan qarzdarlar)
export const getLentDebts = () => api.get("/lent-debts").then((r) => r.data);
export const createLentDebt = (data) =>
  api.post("/lent-debts", data).then((r) => r.data);
export const addLentDebtPayment = (id, data) =>
  api.post(`/lent-debts/${id}/payments`, data).then((r) => r.data);
export const deleteLentDebt = (id) =>
  api.delete(`/lent-debts/${id}`).then((r) => r.data);

// Deliveries
export const getDeliveries = (params) =>
  api.get("/deliveries", { params }).then((r) => r.data);
export const createDelivery = (data) =>
  api.post("/deliveries", data).then((r) => r.data);
export const updateDelivery = (id, data) =>
  api.put(`/deliveries/${id}`, data).then((r) => r.data);
export const deleteDelivery = (id) =>
  api.delete(`/deliveries/${id}`).then((r) => r.data);
export const markDelivered = (id) =>
  api.put(`/deliveries/${id}/deliver`).then((r) => r.data);
export const addDeliveryPayment = (id, data) =>
  api.post(`/deliveries/${id}/payment`, data).then((r) => r.data);

// Suppliers
export const getSuppliers = () => api.get("/suppliers").then((r) => r.data);
export const createSupplier = (data) =>
  api.post("/suppliers", data).then((r) => r.data);
export const updateSupplier = (id, data) =>
  api.put(`/suppliers/${id}`, data).then((r) => r.data);
export const deleteSupplier = (id) =>
  api.delete(`/suppliers/${id}`).then((r) => r.data);
export const getSupplierWagons = (id) =>
  api.get(`/suppliers/${id}/wagons`).then((r) => r.data);

// Settings
export const getExchangeRate = () =>
  api.get("/settings/exchange-rate").then((r) => r.data);
export const setExchangeRate = (rate) =>
  api.put("/settings/exchange-rate", { rate }).then((r) => r.data);

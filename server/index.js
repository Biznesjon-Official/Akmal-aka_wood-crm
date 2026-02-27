require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Trust proxy (nginx orqasida)
app.set('trust proxy', 1);

app.use(compression());
app.use(cors({
  origin: process.env.CLIENT_URL || (process.env.NODE_ENV === 'production'
    ? 'https://akmalaka.biznesjon.uz'
    : 'http://localhost:3010'),
}));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/wagons', require('./routes/wagons'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/cash-transactions', require('./routes/cashTransactions'));
app.use('/api/transfers', require('./routes/transfers'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/expense-sources', require('./routes/expenseSources'));
app.use('/api/my-debts', require('./routes/myDebts'));
app.use('/api/lent-debts', require('./routes/lentDebts'));
app.use('/api/deliveries', require('./routes/deliveries'));

// Production: serve client build
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(errorHandler);

const PORT = process.env.PORT || 5010;

let server;
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    await require('./models/ExpenseSource').ensureDefaults();
    server = app.listen(PORT);
  })
  .catch(() => {
    process.exit(1);
  });

// Graceful shutdown
const shutdown = async () => {
  if (server) server.close();
  await mongoose.connection.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

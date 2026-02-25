const router = require('express').Router();
const Settings = require('../models/Settings');

// Get exchange rate
router.get('/exchange-rate', async (req, res, next) => {
  try {
    const rate = await Settings.getExchangeRate();
    res.json({ rate });
  } catch (err) { next(err); }
});

// Set exchange rate
router.put('/exchange-rate', async (req, res, next) => {
  try {
    const { rate } = req.body;
    if (!rate || rate <= 0) {
      return res.status(400).json({ message: 'Kurs musbat son bo\'lishi kerak' });
    }
    await Settings.setExchangeRate(rate);
    res.json({ rate });
  } catch (err) { next(err); }
});

module.exports = router;

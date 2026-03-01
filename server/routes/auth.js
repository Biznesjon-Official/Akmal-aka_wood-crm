const router = require('express').Router();
const Settings = require('../models/Settings');

// Verify PIN
router.post('/verify', async (req, res, next) => {
  try {
    const { pin } = req.body;
    const doc = await Settings.findOne({ key: 'pin' });
    if (!doc) return res.status(404).json({ message: 'PIN sozlanmagan' });
    if (doc.value !== pin) return res.status(401).json({ message: 'Noto\'g\'ri PIN' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Setup PIN (only if not set yet, or with old pin)
router.post('/setup', async (req, res, next) => {
  try {
    const { pin, oldPin } = req.body;
    if (!/^\d{4}$/.test(pin)) return res.status(400).json({ message: 'PIN 4 ta raqamdan iborat bo\'lishi kerak' });
    const existing = await Settings.findOne({ key: 'pin' });
    if (existing) {
      if (existing.value !== oldPin) return res.status(401).json({ message: 'Eski PIN noto\'g\'ri' });
    }
    await Settings.findOneAndUpdate({ key: 'pin' }, { value: pin }, { upsert: true });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Check if PIN is set
router.get('/status', async (req, res, next) => {
  try {
    const doc = await Settings.findOne({ key: 'pin' });
    res.json({ hasPin: !!doc });
  } catch (err) { next(err); }
});

module.exports = router;

const router = require('express').Router();
const c = require('../controllers/dashboardController');

router.get('/stats', c.getStats);

module.exports = router;

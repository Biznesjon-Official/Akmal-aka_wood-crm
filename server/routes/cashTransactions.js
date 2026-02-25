const router = require('express').Router();
const c = require('../controllers/cashTransactionsController');

router.get('/', c.getAll);
router.post('/', c.create);
router.get('/balance', c.getBalance);
router.get('/report', c.getReport);

module.exports = router;

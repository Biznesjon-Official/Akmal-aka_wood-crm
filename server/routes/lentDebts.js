const router = require('express').Router();
const ctrl = require('../controllers/lentDebtsController');

router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.post('/:id/payments', ctrl.addPayment);
router.delete('/:id', ctrl.remove);

module.exports = router;

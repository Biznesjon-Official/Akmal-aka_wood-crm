const router = require('express').Router();
const ctrl = require('../controllers/deliveriesController');

router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.put('/:id/deliver', ctrl.markDelivered);
router.post('/:id/payment', ctrl.addPayment);

module.exports = router;

const router = require('express').Router();
const ctrl = require('../controllers/deliveriesController');

router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.put('/:id/deliver', ctrl.markDelivered);
router.post('/:id/payment', ctrl.addPayment);
router.delete('/:id/payments/:paymentId', ctrl.removePayment);
router.post('/:id/supplier-payment', ctrl.addSupplierPayment);
router.delete('/:id/supplier-payments/:paymentId', ctrl.removeSupplierPayment);

module.exports = router;

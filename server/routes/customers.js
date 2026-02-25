const router = require('express').Router();
const c = require('../controllers/customersController');

router.get('/', c.getAll);
router.post('/', c.create);
router.get('/:id', c.getOne);
router.put('/:id', c.update);
router.delete('/:id', c.remove);
router.get('/:id/sales', c.getSales);
router.get('/:id/debts', c.getDebts);

module.exports = router;

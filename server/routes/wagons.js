const router = require('express').Router();
const c = require('../controllers/wagonsController');

router.get('/profit-summary', c.profitSummary);
router.post('/astatka-bundle', c.addAstatkaBundle);
router.get('/', c.getAll);
router.post('/', c.create);
router.get('/:id', c.getOne);
router.put('/:id', c.update);
router.delete('/:id', c.remove);
router.put('/:id/to-warehouse', c.allBundlesToWarehouse);
router.put('/:id/bundles/:index/to-warehouse', c.bundleToWarehouse);
router.put('/:id/expenses', c.updateExpenses);

module.exports = router;

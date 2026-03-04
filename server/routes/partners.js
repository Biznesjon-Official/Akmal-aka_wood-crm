const router = require('express').Router();
const c = require('../controllers/partnersController');

router.get('/', c.getAll);
router.post('/', c.create);
router.get('/:id', c.getOne);
router.put('/:id', c.update);
router.delete('/:id', c.remove);
router.post('/:id/investments', c.addInvestment);
router.delete('/:id/investments/:investmentId', c.removeInvestment);

module.exports = router;

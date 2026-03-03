const router = require('express').Router();
const c = require('../controllers/paymentsController');

router.get('/', c.getAll);
router.post('/', c.create);
router.delete('/:id', c.remove);

module.exports = router;

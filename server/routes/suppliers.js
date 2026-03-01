const router = require('express').Router();
const c = require('../controllers/suppliersController');

router.get('/', c.getAll);
router.post('/', c.create);
router.get('/:id', c.getOne);
router.put('/:id', c.update);
router.delete('/:id', c.remove);

module.exports = router;

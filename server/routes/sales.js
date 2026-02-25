const router = require('express').Router();
const c = require('../controllers/salesController');

router.get('/', c.getAll);
router.post('/', c.create);
router.get('/:id', c.getOne);
router.delete('/:id', c.remove);

module.exports = router;

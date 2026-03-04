const router = require('express').Router();
const c = require('../controllers/codersController');

router.get('/', c.getAll);
router.post('/', c.create);
router.get('/:id', c.getOne);
router.get('/:id/codes', c.getCodes);
router.put('/:id', c.update);
router.delete('/:id', c.remove);

module.exports = router;

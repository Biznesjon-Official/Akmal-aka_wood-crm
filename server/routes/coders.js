const router = require('express').Router();
const c = require('../controllers/codersController');

router.get('/', c.getAll);
router.post('/', c.create);
router.get('/:id', c.getOne);
router.get('/:id/codes', c.getCodes);
router.post('/:id/codes', c.addCode);
router.delete('/:id/codes/:codeId', c.removeCode);
router.put('/:id/codes/:codeId/assign', c.assignCode);
router.put('/:id/codes/:codeId/release', c.releaseCode);
router.put('/:id', c.update);
router.delete('/:id', c.remove);

module.exports = router;

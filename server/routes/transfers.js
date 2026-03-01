const router = require('express').Router();
const c = require('../controllers/transfersController');

router.post('/rub-transfer', c.transferRub);
router.post('/convert', c.convertCurrency);
router.get('/conversions', c.getConversions);
router.delete('/conversions/:id', c.deleteConversion);
router.post('/top-ups', c.createTopUp);
router.get('/top-ups', c.getTopUps);
router.delete('/top-ups/:id', c.deleteTopUp);
router.get('/', c.getAll);
router.post('/', c.create);
router.get('/:id', c.getOne);
router.put('/:id', c.update);

module.exports = router;

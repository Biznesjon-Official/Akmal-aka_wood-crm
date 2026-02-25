# API Endpoint yaratish

## Qadamlar
1. `server/models/` da Mongoose model yarat (schema + pre-save hooks)
2. `server/controllers/` da controller yarat (getAll, getOne, create, update, remove)
3. `server/routes/` da Express router yarat
4. `server/index.js` ga route qo'sh: `app.use('/api/<name>', require('./routes/<name>'))`
5. `client/src/api/index.js` ga API funksiyalarni qo'sh

## Controller shablon
```js
const Model = require('../models/ModelName');

exports.getAll = async (req, res, next) => {
  try {
    const items = await Model.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const item = await Model.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Topilmadi' });
    res.json(item);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const item = await Model.create(req.body);
    res.status(201).json(item);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const item = await Model.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Topilmadi' });
    Object.assign(item, req.body);
    await item.save();
    res.json(item);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await Model.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};
```

## Qoidalar
- `findByIdAndUpdate` ISHLATMA — `findById` + `save()` ishlat (pre-save hooks uchun)
- Response: list → array, one → object, create → 201, delete → `{ message }`
- Error: `try/catch` + `next(err)`

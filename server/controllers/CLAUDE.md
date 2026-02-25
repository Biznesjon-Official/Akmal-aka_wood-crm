# Controllers

Har bir model uchun CRUD controller. Format: `exports.methodName = async (req, res, next) => {}`

## Pattern
```js
exports.getAll = async (req, res, next) => {
  try {
    const items = await Model.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) { next(err); }
};
```

## Qoidalar
- Error: `try/catch` + `next(err)`
- GET list → `res.json([...])`, GET one → `res.json({})` + 404
- POST → `res.status(201).json(created)`
- PUT → `findById` + `Object.assign` + `save()` + `res.json(updated)`
- DELETE → `findByIdAndDelete` + `res.json({ message: 'Deleted' })`
- populate kerak bo'lsa `.populate('field')` qo'sh

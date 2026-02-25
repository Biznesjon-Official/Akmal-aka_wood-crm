module.exports = (err, req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }
  res.status(err.status || 500).json({
    message: err.message || 'Server xatosi',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

exports.notFound = (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
};

exports.errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err.type === 'entity.parse.failed') return res.status(400).json({ success: false, message: 'Invalid JSON body' });
  if (err.type === 'entity.too.large') return res.status(413).json({ success: false, message: 'Request body too large' });
  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: Object.values(err.errors).map((e) => e.message).join(', ') });
  }
  if (err.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid value or id' });
  if (err.code === 11000) return res.status(409).json({ success: false, message: 'Duplicate record already exists' });
  console.error(err);
  res.status(500).json({ success: false, message: 'Something went wrong on the server' });
};

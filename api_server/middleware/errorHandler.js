// ============================================================
// Error Handler Middleware
// ============================================================

/**
 * Global error handler — catches all unhandled errors
 */
function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err.message);
  console.error(err.stack);

  // Multer errors (file size limit, etc.)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'Ukuran file terlalu besar! Maksimal ukuran file adalah 5 MB.',
    });
  }

  // Blockchain errors
  if (err.code === 'CALL_EXCEPTION') {
    return res.status(400).json({
      success: false,
      message: `Blockchain error: ${err.reason || err.message}`,
    });
  }

  // Default server error
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'development'
      ? err.message
      : 'Internal server error',
  });
}

module.exports = { errorHandler };

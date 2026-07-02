// ============================================================
// Error Handler Middleware
// ============================================================

/**
 * Global error handler — catches all unhandled errors
 */
function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err.message);
  console.error(err.stack);

  // MySQL errors
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry. Record already exists.',
    });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      success: false,
      message: 'Referenced record not found (foreign key constraint).',
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

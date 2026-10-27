export const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || 'Internal Server Error';

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Resource not found with malformed identifier: '${err.value}'`;
  }

  // Handle MongoDB E11000 duplicate key error dynamically without leaking sensitive values (HTTP 409 Conflict)
  if (err.code === 11000) {
    statusCode = 409;
    const field = err.keyValue
      ? Object.keys(err.keyValue)[0]
      : (err.keyPattern ? Object.keys(err.keyPattern)[0] : null);

    if (field === 'email') {
      message = 'User already exists with this email address';
    } else if (field) {
      message = `Duplicate value entered for ${field}. Please use another value.`;
    } else {
      message = 'Duplicate field value entered. Please use another value.';
    }
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  // Handle Multer upload errors (10MB upload limit configured in upload.middleware.js)
  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Uploaded file exceeds the maximum allowed size limit (10MB)';
    } else {
      message = `File upload error: ${err.message}`;
    }
  }

  // Handle JSON parse errors from express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Malformed JSON syntax in request body';
  }

  // Handle JWT verification errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token signature';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired. Please log in again.';
  }

  // Consolidated server-side logging for debugging (suppressed in test environment, avoids logging raw request body)
  if (process.env.NODE_ENV !== 'test') {
    const errorDetails = err instanceof Error ? (err.stack || err.message) : err;
    console.error(`[API Error] ${req?.method || 'UNKNOWN'} ${req?.originalUrl || req?.url || ''}:`, errorDetails);
  }

  // In production, mask unexpected 500 errors with a safe generic message to avoid disclosing raw internal messages
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal Server Error';
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { errorHandler } from '../middleware/error.middleware.js';

// Ensure tests run in test environment by default to suppress unwanted console logging
process.env.NODE_ENV = 'test';

describe('Centralized Error Handling Middleware Tests', () => {
  const createMockReqRes = (initialStatusCode = 200) => {
    let statusCode = initialStatusCode;
    let jsonResult = null;
    const req = { method: 'GET', originalUrl: '/api/test' };
    const res = {
      statusCode: initialStatusCode,
      status(code) {
        statusCode = code;
        this.statusCode = code;
        return this;
      },
      json(data) {
        jsonResult = data;
        return this;
      },
    };
    return { req, res, getStatus: () => statusCode, getJson: () => jsonResult };
  };

  test('maps CastError (invalid ObjectId) to 400 Bad Request', () => {
    const { req, res, getStatus, getJson } = createMockReqRes();
    const err = new Error('Cast to ObjectId failed');
    err.name = 'CastError';
    err.value = 'invalid-mongo-id';

    errorHandler(err, req, res, () => {});

    assert.equal(getStatus(), 400);
    assert.equal(getJson().success, false);
    assert.match(getJson().message, /malformed identifier: 'invalid-mongo-id'/);
  });

  test('maps MongoDB 11000 duplicate key error to 409 Conflict with dynamic field name without exposing raw value', () => {
    const { req, res, getStatus, getJson } = createMockReqRes();
    const err = new Error('Duplicate key');
    err.code = 11000;
    err.keyValue = { name: 'React.js' };

    errorHandler(err, req, res, () => {});

    assert.equal(getStatus(), 409);
    assert.equal(getJson().success, false);
    assert.equal(getJson().message, 'Duplicate value entered for name. Please use another value.');
    assert.doesNotMatch(getJson().message, /React\.js/, 'Sensitive duplicate value must not be exposed in response');
  });

  test('maps MongoDB 11000 duplicate key on email to 409 with user-friendly message', () => {
    const { req, res, getStatus, getJson } = createMockReqRes();
    const err = new Error('Duplicate email');
    err.code = 11000;
    err.keyValue = { email: 'demo@nexusai.com' };

    errorHandler(err, req, res, () => {});

    assert.equal(getStatus(), 409);
    assert.equal(getJson().success, false);
    assert.equal(getJson().message, 'User already exists with this email address');
    assert.doesNotMatch(getJson().message, /demo@nexusai\.com/, 'Email value must not be leaked');
  });

  test('maps MongoDB 11000 duplicate key fallback to 409 when keyValue is missing or uses keyPattern', () => {
    const { req, res, getStatus, getJson } = createMockReqRes();
    const errWithPattern = new Error('Duplicate key with pattern');
    errWithPattern.code = 11000;
    errWithPattern.keyPattern = { username: 1 };

    errorHandler(errWithPattern, req, res, () => {});
    assert.equal(getStatus(), 409);
    assert.equal(getJson().message, 'Duplicate value entered for username. Please use another value.');

    const mockFallback = createMockReqRes();
    const errFallback = new Error('Duplicate key without fields');
    errFallback.code = 11000;

    errorHandler(errFallback, mockFallback.req, mockFallback.res, () => {});
    assert.equal(mockFallback.getStatus(), 409);
    assert.equal(mockFallback.getJson().message, 'Duplicate field value entered. Please use another value.');
  });

  test('maps Mongoose ValidationError to 400 Bad Request with combined messages', () => {
    const { req, res, getStatus, getJson } = createMockReqRes();
    const err = new Error('Validation failed');
    err.name = 'ValidationError';
    err.errors = {
      title: { message: 'Title is required' },
      level: { message: 'Level is required' },
    };

    errorHandler(err, req, res, () => {});

    assert.equal(getStatus(), 400);
    assert.equal(getJson().success, false);
    assert.equal(getJson().message, 'Title is required, Level is required');
  });

  test('maps Multer LIMIT_FILE_SIZE error to 400 Bad Request matching upload config (10MB)', () => {
    const { req, res, getStatus, getJson } = createMockReqRes();
    const err = new Error('File too large');
    err.name = 'MulterError';
    err.code = 'LIMIT_FILE_SIZE';

    errorHandler(err, req, res, () => {});

    assert.equal(getStatus(), 400);
    assert.equal(getJson().success, false);
    assert.match(getJson().message, /maximum allowed size limit \(10MB\)/);
  });

  test('maps generic MulterError to 400 Bad Request with upload details', () => {
    const { req, res, getStatus, getJson } = createMockReqRes();
    const err = new Error('Unexpected field');
    err.name = 'MulterError';
    err.code = 'LIMIT_UNEXPECTED_FILE';

    errorHandler(err, req, res, () => {});

    assert.equal(getStatus(), 400);
    assert.equal(getJson().success, false);
    assert.equal(getJson().message, 'File upload error: Unexpected field');
  });

  test('maps malformed JSON SyntaxError to 400 Bad Request', () => {
    const { req, res, getStatus, getJson } = createMockReqRes();
    const err = new SyntaxError('Unexpected token in JSON at position 5');
    err.status = 400;
    err.body = '{ bad json }';

    errorHandler(err, req, res, () => {});

    assert.equal(getStatus(), 400);
    assert.equal(getJson().success, false);
    assert.match(getJson().message, /Malformed JSON syntax in request body/);
  });

  test('maps JWT errors to 401 Unauthorized', () => {
    const mock1 = createMockReqRes();
    const jwtErr = new Error('jwt malformed');
    jwtErr.name = 'JsonWebTokenError';
    errorHandler(jwtErr, mock1.req, mock1.res, () => {});
    assert.equal(mock1.getStatus(), 401);
    assert.match(mock1.getJson().message, /Invalid authentication token signature/);

    const mock2 = createMockReqRes();
    const expErr = new Error('jwt expired');
    expErr.name = 'TokenExpiredError';
    errorHandler(expErr, mock2.req, mock2.res, () => {});
    assert.equal(mock2.getStatus(), 401);
    assert.match(mock2.getJson().message, /Authentication token has expired/);
  });

  test('handles unexpected 500 error in development mode with error message and stack trace', () => {
    const prevEnv = process.env.NODE_ENV;
    const origConsoleError = console.error;
    console.error = () => {};
    try {
      process.env.NODE_ENV = 'development';
      const { req, res, getStatus, getJson } = createMockReqRes();
      const err = new Error('Detailed development error message');

      errorHandler(err, req, res, () => {});

      assert.equal(getStatus(), 500);
      assert.equal(getJson().success, false);
      assert.equal(getJson().message, 'Detailed development error message');
      assert.ok(getJson().stack, 'Stack trace should be included in development');
    } finally {
      process.env.NODE_ENV = prevEnv;
      console.error = origConsoleError;
    }
  });

  test('production error disclosure: hides raw error message and stack on unexpected 500', () => {
    const prevEnv = process.env.NODE_ENV;
    const origConsoleError = console.error;
    console.error = () => {};
    try {
      process.env.NODE_ENV = 'production';
      const { req, res, getStatus, getJson } = createMockReqRes();
      const err = new Error('Sensitive DB connection string: mongodb://user:pass123@internal-db:27017/nexus');

      errorHandler(err, req, res, () => {});

      assert.equal(getStatus(), 500);
      assert.equal(getJson().success, false);
      assert.equal(getJson().message, 'Internal Server Error');
      assert.doesNotMatch(getJson().message, /pass123/);
      assert.doesNotMatch(getJson().message, /internal-db/);
      assert.equal(getJson().stack, null, 'Stack trace must be hidden in production');
    } finally {
      process.env.NODE_ENV = prevEnv;
      console.error = origConsoleError;
    }
  });

  test('production error disclosure: preserves specific user-friendly 4xx messages', () => {
    const prevEnv = process.env.NODE_ENV;
    const origConsoleError = console.error;
    console.error = () => {};
    try {
      process.env.NODE_ENV = 'production';
      const { req, res, getStatus, getJson } = createMockReqRes();
      const err = new Error('Cast to ObjectId failed');
      err.name = 'CastError';
      err.value = 'invalid-mongo-id';

      errorHandler(err, req, res, () => {});

      assert.equal(getStatus(), 400);
      assert.equal(getJson().success, false);
      assert.match(getJson().message, /malformed identifier/);
      assert.notEqual(getJson().message, 'Internal Server Error');
      assert.equal(getJson().stack, null);
    } finally {
      process.env.NODE_ENV = prevEnv;
      console.error = origConsoleError;
    }
  });

  test('consolidated logging: logs errors in development mode and suppresses during tests', () => {
    const originalConsoleError = console.error;
    const loggedMessages = [];
    console.error = (...args) => {
      loggedMessages.push(args);
    };

    const prevEnv = process.env.NODE_ENV;
    try {
      // 1. Verify logging in non-test environment
      process.env.NODE_ENV = 'development';
      const mockDev = createMockReqRes();
      const devErr = new Error('Sample server error for logging');
      errorHandler(devErr, mockDev.req, mockDev.res, () => {});

      assert.equal(loggedMessages.length, 1, 'Should log exactly once for development error');
      assert.match(loggedMessages[0][0], /\[API Error\] GET \/api\/test:/);
      assert.equal(loggedMessages[0][1], devErr.stack, 'Should pass sanitized error stack to console.error');

      // 2. Verify logging is suppressed in test environment
      loggedMessages.length = 0;
      process.env.NODE_ENV = 'test';
      const mockTest = createMockReqRes();
      const testErr = new Error('Test error should not log');
      errorHandler(testErr, mockTest.req, mockTest.res, () => {});

      assert.equal(loggedMessages.length, 0, 'Should not log in test environment');
    } finally {
      console.error = originalConsoleError;
      process.env.NODE_ENV = prevEnv;
    }
  });

  test('avoids logging raw request body on JSON SyntaxError to prevent credential leakage in logs', () => {
    const originalConsoleError = console.error;
    const loggedMessages = [];
    console.error = (...args) => {
      loggedMessages.push(args);
    };

    const prevEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'development';
      const { req, res } = createMockReqRes();
      const syntaxErr = new SyntaxError('Unexpected token in JSON at position 10');
      syntaxErr.status = 400;
      syntaxErr.body = '{"email":"user@test.com","password":"SensitiveSecretPassword!"}';

      errorHandler(syntaxErr, req, res, () => {});

      assert.equal(loggedMessages.length, 1);
      const loggedDetails = String(loggedMessages[0][1]);
      assert.doesNotMatch(loggedDetails, /SensitiveSecretPassword!/, 'Raw rejected body containing credentials must not be logged');
    } finally {
      console.error = originalConsoleError;
      process.env.NODE_ENV = prevEnv;
    }
  });
});

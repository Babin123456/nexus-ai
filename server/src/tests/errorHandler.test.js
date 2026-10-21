import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { errorHandler } from '../middleware/error.middleware.js';

describe('Centralized Error Handling Middleware Tests', () => {
  const createMockReqRes = () => {
    let statusCode = 200;
    let jsonResult = null;
    const req = { method: 'GET', originalUrl: '/api/test' };
    const res = {
      statusCode: 200,
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

  test('maps MongoDB 11000 duplicate key error to 400 with dynamic field name', () => {
    const { req, res, getStatus, getJson } = createMockReqRes();
    const err = new Error('Duplicate key');
    err.code = 11000;
    err.keyValue = { name: 'React.js' };

    errorHandler(err, req, res, () => {});

    assert.equal(getStatus(), 400);
    assert.equal(getJson().success, false);
    assert.match(getJson().message, /Duplicate value 'React\.js' entered for name/);
  });

  test('maps MongoDB 11000 duplicate key on email to user-friendly message', () => {
    const { req, res, getStatus, getJson } = createMockReqRes();
    const err = new Error('Duplicate email');
    err.code = 11000;
    err.keyValue = { email: 'demo@nexusai.com' };

    errorHandler(err, req, res, () => {});

    assert.equal(getStatus(), 400);
    assert.equal(getJson().success, false);
    assert.match(getJson().message, /User already exists with this email address/);
  });

  test('maps Multer LIMIT_FILE_SIZE error to 400 Bad Request', () => {
    const { req, res, getStatus, getJson } = createMockReqRes();
    const err = new Error('File too large');
    err.name = 'MulterError';
    err.code = 'LIMIT_FILE_SIZE';

    errorHandler(err, req, res, () => {});

    assert.equal(getStatus(), 400);
    assert.equal(getJson().success, false);
    assert.match(getJson().message, /maximum allowed size limit \(10MB\)/);
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

  test('maps unhandled generic error to 500 Internal Server Error', () => {
    const { req, res, getStatus, getJson } = createMockReqRes();
    const err = new Error('Unexpected database failure');

    errorHandler(err, req, res, () => {});

    assert.equal(getStatus(), 500);
    assert.equal(getJson().success, false);
    assert.equal(getJson().message, 'Unexpected database failure');
  });
});

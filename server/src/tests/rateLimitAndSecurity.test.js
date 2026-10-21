import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { securityHeaders } from '../middleware/security.middleware.js';
import { createRateLimiter } from '../middleware/rateLimit.middleware.js';

describe('Security Headers & Rate Limiting Tests', () => {
  test('securityHeaders attaches defensive HTTP headers and strips X-Powered-By', () => {
    const headers = {};
    let poweredByRemoved = false;

    const req = {};
    const res = {
      setHeader(name, val) {
        headers[name.toLowerCase()] = val;
      },
      removeHeader(name) {
        if (name.toLowerCase() === 'x-powered-by') poweredByRemoved = true;
      },
    };

    let nextCalled = false;
    securityHeaders(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
    assert.equal(poweredByRemoved, true);
    assert.equal(headers['x-content-type-options'], 'nosniff');
    assert.equal(headers['x-frame-options'], 'DENY');
    assert.equal(headers['x-xss-protection'], '1; mode=block');
    assert.equal(headers['referrer-policy'], 'strict-origin-when-cross-origin');
    assert.match(headers['strict-transport-security'], /max-age=/);
  });

  test('rateLimiter tracks requests and blocks with 429 when threshold exceeded', () => {
    const limiter = createRateLimiter({
      windowMs: 1000,
      max: 3,
      message: 'Too many test requests.',
    });

    const createMockReqRes = (ip = '192.168.1.10') => {
      const headers = {};
      let statusCode = 200;
      let jsonResult = null;

      const req = { ip };
      const res = {
        setHeader(name, val) {
          headers[name] = val;
        },
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonResult = data;
          return this;
        },
      };

      return { req, res, getHeaders: () => headers, getStatus: () => statusCode, getJson: () => jsonResult };
    };

    // Request 1: Allowed, remaining = 2
    const call1 = createMockReqRes();
    let next1 = false;
    limiter(call1.req, call1.res, () => { next1 = true; });
    assert.equal(next1, true);
    assert.equal(call1.getHeaders()['RateLimit-Remaining'], 2);

    // Request 2: Allowed, remaining = 1
    const call2 = createMockReqRes();
    let next2 = false;
    limiter(call2.req, call2.res, () => { next2 = true; });
    assert.equal(next2, true);
    assert.equal(call2.getHeaders()['RateLimit-Remaining'], 1);

    // Request 3: Allowed, remaining = 0
    const call3 = createMockReqRes();
    let next3 = false;
    limiter(call3.req, call3.res, () => { next3 = true; });
    assert.equal(next3, true);
    assert.equal(call3.getHeaders()['RateLimit-Remaining'], 0);

    // Request 4: Exceeded threshold -> 429 Too Many Requests
    const call4 = createMockReqRes();
    let next4 = false;
    limiter(call4.req, call4.res, () => { next4 = true; });
    assert.equal(next4, false);
    assert.equal(call4.getStatus(), 429);
    assert.equal(call4.getJson().success, false);
    assert.match(call4.getJson().message, /Too many test requests/);

    // Different IP is NOT blocked
    const callOtherIp = createMockReqRes('10.0.0.99');
    let nextOther = false;
    limiter(callOtherIp.req, callOtherIp.res, () => { nextOther = true; });
    assert.equal(nextOther, true);
  });
});

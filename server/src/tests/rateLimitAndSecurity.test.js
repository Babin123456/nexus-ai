import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { securityHeaders } from '../middleware/security.middleware.js';
import { createRateLimiter, authRateLimiter, aiRateLimiter } from '../middleware/rateLimit.middleware.js';

describe('Security Headers & Rate Limiting Tests', () => {
  const activeLimiters = [];

  const createTrackedLimiter = (options) => {
    const limiter = createRateLimiter(options);
    activeLimiters.push(limiter);
    return limiter;
  };

  afterEach(() => {
    for (const limiter of activeLimiters) {
      if (limiter?.cleanup) limiter.cleanup();
    }
    activeLimiters.length = 0;
  });

  const createMockReqRes = (ip = '192.168.1.10', extraReq = {}) => {
    const headers = {};
    let statusCode = 200;
    let jsonResult = null;
    let poweredByRemoved = false;

    const req = {
      ip,
      headers: {},
      ...extraReq,
    };

    const res = {
      setHeader(name, val) {
        headers[name.toLowerCase()] = val;
        headers[name] = val;
      },
      removeHeader(name) {
        if (name.toLowerCase() === 'x-powered-by') poweredByRemoved = true;
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

    return {
      req,
      res,
      getHeaders: () => headers,
      getStatus: () => statusCode,
      getJson: () => jsonResult,
      isPoweredByRemoved: () => poweredByRemoved,
    };
  };

  test('securityHeaders attaches defensive HTTP headers and strips X-Powered-By in development/standard mode', () => {
    const { req, res, getHeaders, isPoweredByRemoved } = createMockReqRes();
    let nextCalled = false;

    securityHeaders(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
    assert.equal(isPoweredByRemoved(), true);
    assert.equal(getHeaders()['x-content-type-options'], 'nosniff');
    assert.equal(getHeaders()['x-frame-options'], 'DENY');
    assert.equal(getHeaders()['x-xss-protection'], '1; mode=block');
    assert.equal(getHeaders()['referrer-policy'], 'strict-origin-when-cross-origin');
    // In development or non-HTTPS mode, HSTS must not be set
    assert.equal(getHeaders()['strict-transport-security'], undefined);
  });

  test('securityHeaders enables HSTS only in HTTPS production environment', () => {
    const prevEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';

      // 1. Production over direct HTTPS (req.secure = true) -> HSTS must be set
      const mockHttps = createMockReqRes('127.0.0.1', { secure: true });
      securityHeaders(mockHttps.req, mockHttps.res, () => {});
      assert.match(mockHttps.getHeaders()['strict-transport-security'], /max-age=31536000/);

      // 2. Production over TLS reverse proxy (x-forwarded-proto = 'https') -> HSTS must be set
      const mockProxy = createMockReqRes('127.0.0.1', { headers: { 'x-forwarded-proto': 'https' } });
      securityHeaders(mockProxy.req, mockProxy.res, () => {});
      assert.match(mockProxy.getHeaders()['strict-transport-security'], /max-age=31536000/);

      // 3. Production over plain HTTP (no HTTPS or TLS header) -> HSTS must NOT be set
      const mockHttp = createMockReqRes('127.0.0.1', { secure: false });
      securityHeaders(mockHttp.req, mockHttp.res, () => {});
      assert.equal(mockHttp.getHeaders()['strict-transport-security'], undefined);

      // 4. Development mode over HTTPS -> HSTS must NOT be set
      process.env.NODE_ENV = 'development';
      const mockDevHttps = createMockReqRes('127.0.0.1', { secure: true });
      securityHeaders(mockDevHttps.req, mockDevHttps.res, () => {});
      assert.equal(mockDevHttps.getHeaders()['strict-transport-security'], undefined);
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });

  test('rateLimiter tracks requests and blocks with 429 when threshold exceeded', () => {
    const limiter = createTrackedLimiter({
      windowMs: 1000,
      max: 3,
      message: 'Too many test requests.',
    });

    // Request 1: Allowed, remaining = 2
    const call1 = createMockReqRes();
    let next1 = false;
    limiter(call1.req, call1.res, () => { next1 = true; });
    assert.equal(next1, true);
    assert.equal(call1.getHeaders()['RateLimit-Remaining'], 2);
    assert.equal(call1.getHeaders()['RateLimit-Limit'], 3);

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

  test('rateLimiter window expiration resets request count after windowMs expires', async () => {
    const windowMs = 50; // 50ms test window
    const limiter = createTrackedLimiter({
      windowMs,
      max: 2,
      message: 'Window test limit reached.',
    });

    // 1. Consume limit
    const call1 = createMockReqRes('192.168.1.50');
    limiter(call1.req, call1.res, () => {});
    const call2 = createMockReqRes('192.168.1.50');
    limiter(call2.req, call2.res, () => {});

    // 2. Third request immediately after is blocked
    const callBlocked = createMockReqRes('192.168.1.50');
    limiter(callBlocked.req, callBlocked.res, () => {});
    assert.equal(callBlocked.getStatus(), 429);

    // 3. Wait for the window to expire
    await new Promise((resolve) => setTimeout(resolve, windowMs + 25));

    // 4. Request after expiration should be accepted with count reset
    const callAfterReset = createMockReqRes('192.168.1.50');
    let nextAfterReset = false;
    limiter(callAfterReset.req, callAfterReset.res, () => { nextAfterReset = true; });

    assert.equal(nextAfterReset, true);
    assert.equal(callAfterReset.getStatus(), 200);
    assert.equal(callAfterReset.getHeaders()['RateLimit-Remaining'], 1);
  });

  test('rateLimiter validates options and rejects invalid configurations', () => {
    // windowMs validation
    assert.throws(() => createRateLimiter({ windowMs: -100 }), /windowMs must be a positive number/);
    assert.throws(() => createRateLimiter({ windowMs: 0 }), /windowMs must be a positive number/);
    assert.throws(() => createRateLimiter({ windowMs: 'not-a-number' }), /windowMs must be a positive number/);
    assert.throws(() => createRateLimiter({ windowMs: NaN }), /windowMs must be a positive number/);

    // max validation
    assert.throws(() => createRateLimiter({ max: -5 }), /max must be a positive integer/);
    assert.throws(() => createRateLimiter({ max: 0 }), /max must be a positive integer/);
    assert.throws(() => createRateLimiter({ max: 'invalid' }), /max must be a positive integer/);
    assert.throws(() => createRateLimiter({ max: 2.7 }), /max must be a positive integer/);
    assert.throws(() => createRateLimiter({ max: NaN }), /max must be a positive integer/);

    // Nullish options fallback safely to defaults
    const defaultLimiter = createTrackedLimiter({ windowMs: undefined, max: undefined });
    assert.equal(defaultLimiter.windowMs, 15 * 60 * 1000);
    assert.equal(defaultLimiter.max, 100);
  });

  test('route-level middleware integration for authRateLimiter and aiRateLimiter', () => {
    // 1. Verify authRateLimiter configuration and behavior
    assert.equal(authRateLimiter.max, 20);
    assert.equal(authRateLimiter.windowMs, 15 * 60 * 1000);

    const authMock = createMockReqRes('172.16.0.1');
    let authNextCalled = false;
    authRateLimiter(authMock.req, authMock.res, () => { authNextCalled = true; });
    assert.equal(authNextCalled, true);
    assert.equal(authMock.getHeaders()['RateLimit-Limit'], 20);
    assert.equal(authMock.getHeaders()['RateLimit-Remaining'], 19);

    // 2. Verify aiRateLimiter configuration and behavior
    assert.equal(aiRateLimiter.max, 15);
    assert.equal(aiRateLimiter.windowMs, 60 * 1000);

    const aiMock = createMockReqRes('172.16.0.2');
    let aiNextCalled = false;
    aiRateLimiter(aiMock.req, aiMock.res, () => { aiNextCalled = true; });
    assert.equal(aiNextCalled, true);
    assert.equal(aiMock.getHeaders()['RateLimit-Limit'], 15);
    assert.equal(aiMock.getHeaders()['RateLimit-Remaining'], 14);
  });
});

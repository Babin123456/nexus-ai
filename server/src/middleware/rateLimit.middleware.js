/**
 * In-Memory Sliding-Window Rate Limiter Middleware
 *
 * Architectural Characteristics & Multi-Instance Deployment Notes:
 * - Process-Local Storage: Hit counts are maintained in a process-local JavaScript Map.
 * - Zero Dependencies: Operates with zero runtime dependencies and 100% offline compatibility.
 * - Multi-Instance / Clustered Limitations:
 *   In horizontally scaled deployments (e.g., Kubernetes pods, PM2 cluster mode, multiple container instances),
 *   each process maintains an isolated in-memory hit store. Requests distributed across N instances via
 *   round-robin load balancing without sticky sessions effectively allow up to (max * N) requests per client.
 * - Process Restarts: Counters reset upon application restarts.
 * - Production Recommendation: For multi-instance high-availability production clusters, consider replacing
 *   the in-memory hit store with a shared centralized distributed cache (such as Redis via ioredis or rate-limit-redis)
 *   or implementing rate limiting at the ingress/API gateway layer (e.g., Nginx, Cloudflare, AWS WAF).
 */

export const createRateLimiter = (options = {}) => {
  const windowMs = options.windowMs ?? (15 * 60 * 1000);
  const max = options.max ?? 100;
  const message = options.message ?? 'Too many requests. Please try again later.';

  if (typeof windowMs !== 'number' || Number.isNaN(windowMs) || windowMs <= 0) {
    throw new TypeError('windowMs must be a positive number');
  }

  if (typeof max !== 'number' || Number.isNaN(max) || max <= 0 || !Number.isInteger(max)) {
    throw new TypeError('max must be a positive integer');
  }

  const hits = new Map();

  // Periodic cleanup interval to prevent memory leaks from inactive IPs
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, data] of hits.entries()) {
      if (now > data.resetTime) {
        hits.delete(key);
      }
    }
  }, Math.min(windowMs, 5 * 60 * 1000));

  if (cleanupInterval.unref) cleanupInterval.unref();

  const middleware = (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    const now = Date.now();

    let clientData = hits.get(ip);
    if (!clientData || now > clientData.resetTime) {
      clientData = {
        count: 1,
        resetTime: now + windowMs,
      };
      hits.set(ip, clientData);
    } else {
      clientData.count++;
    }

    const remaining = Math.max(0, max - clientData.count);
    const resetSeconds = Math.ceil((clientData.resetTime - now) / 1000);

    if (res.setHeader) {
      res.setHeader('RateLimit-Limit', max);
      res.setHeader('RateLimit-Remaining', remaining);
      res.setHeader('RateLimit-Reset', resetSeconds);
    }

    if (clientData.count > max) {
      return res.status(429).json({
        success: false,
        message: `${message} Retry after ${resetSeconds} seconds.`,
      });
    }

    next();
  };

  middleware.windowMs = windowMs;
  middleware.max = max;
  middleware.hits = hits;
  middleware.cleanup = () => clearInterval(cleanupInterval);

  return middleware;
};

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts from this IP.',
});

export const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 15,
  message: 'AI generation request limit reached.',
});

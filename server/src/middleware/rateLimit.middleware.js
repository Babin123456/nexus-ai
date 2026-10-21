export const createRateLimiter = (options = {}) => {
  const windowMs = options.windowMs || 15 * 60 * 1000;
  const max = options.max || 100;
  const message = options.message || 'Too many requests. Please try again later.';

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

  return (req, res, next) => {
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

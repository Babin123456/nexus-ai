export const securityHeaders = (req, res, next) => {
  if (res.removeHeader) {
    res.removeHeader('X-Powered-By');
  }
  if (res.setHeader) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Strict-Transport-Security (HSTS) must only be enabled in production over HTTPS
    const isProduction = process.env.NODE_ENV === 'production';
    const isHttps = Boolean(req?.secure || req?.headers?.['x-forwarded-proto'] === 'https');

    if (isProduction && isHttps) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
  }
  next();
};

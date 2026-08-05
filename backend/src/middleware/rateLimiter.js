import rateLimit from 'express-rate-limit';

const windowMs = Number(process.env.LOGIN_RATE_WINDOW_MS || 15 * 60 * 1000);
const max = Number(process.env.LOGIN_RATE_MAX || 20);

export const loginLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan login. Coba lagi nanti.',
  },
});

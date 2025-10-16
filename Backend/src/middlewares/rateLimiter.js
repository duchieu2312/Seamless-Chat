import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: { message: "Too many login attempts. Try again in 5 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

export const refreshLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { message: "Too many refresh requests. Slow down." },
});

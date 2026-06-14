import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth';
import {
  clientsRouter,
  invoicesRouter,
  paymentsRouter,
  reportsRouter,
  profileRouter,
} from './routes';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Behind Render's proxy — needed so rate-limiting/IP detection use the real
// client IP (X-Forwarded-For) instead of lumping all traffic onto one proxy IP.
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
const isAllowedOrigin = (origin?: string) => {
  if (!origin) return true;                                  // curl / mobile / server-to-server
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true; // local dev (any port)
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true; // any Vercel deploy
  if (origin === process.env.FRONTEND_URL) return true;     // explicit production domain
  return false;
};
app.use(cors({
  origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
  credentials: true,
}));

// Rate limiting (per client IP). Skip the health check so uptime probes
// (e.g. Render) are never throttled.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.originalUrl === '/api/health',
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/profile', profileRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`DispatchFlow API running on port ${PORT}`);
});

export default app;

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { corsOrigins } from './config';
import { generalRateLimit } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { authOrPay } from './middleware/x402Payment';
import { x402AnonymousContext } from './middleware/x402Auth';

import authRoutes from './routes/auth';
import vaultRoutes from './routes/vault';
import folderRoutes from './routes/folders';
import keyRoutes from './routes/keys';
import statusRoutes from './routes/status';

export const app = express();

// Request logging (high priority)
app.use(requestLogger);

// Trust the first proxy (Nginx) so express-rate-limit can read X-Forwarded-For
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Payment-Signature', 'Payment-Signature'],
  exposedHeaders: ['X-Payment-Response', 'Payment-Response', 'X-Payment-Required', 'Payment-Required'],
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Global rate limit
app.use(generalRateLimit);

// x402 auth-or-pay middleware on vault routes
// If request has Bearer token → normal auth flow
// If no auth → x402 payment required
app.use('/vault', authOrPay, x402AnonymousContext);

// Routes
app.use('/status', statusRoutes);
app.use('/auth', authRoutes);
app.use('/vault', vaultRoutes);
app.use('/folders', folderRoutes);
app.use('/keys', keyRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use(errorHandler);

export default app;

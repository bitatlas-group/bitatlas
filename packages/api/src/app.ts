import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { corsOrigins } from './config';
import { generalRateLimit } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth';
import vaultRoutes from './routes/vault';
import folderRoutes from './routes/folders';
import keyRoutes from './routes/keys';
import statusRoutes from './routes/status';

export const app = express();

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
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging for errors (4xx/5xx)
app.use((req, res, next) => {
  const origJson = res.json.bind(res);
  res.json = function (body: unknown) {
    if (res.statusCode >= 400) {
      console.error(JSON.stringify({
        _log: 'error_response',
        status: res.statusCode,
        method: req.method,
        path: req.originalUrl,
        resBody: JSON.stringify(body).substring(0, 500),
        reqBody: JSON.stringify(req.body).substring(0, 500),
      }));
    }
    return origJson(body);
  };
  next();
});

// Global rate limit
app.use(generalRateLimit);

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

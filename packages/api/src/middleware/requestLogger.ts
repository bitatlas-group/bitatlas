import pinoHttp from 'pino-http';
import { logger } from '../services/logger';
import { config } from '../config';

export const requestLogger = pinoHttp({
  logger,
  // Custom serializers for security
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      remoteAddress: req.remoteAddress,
      // redact sensitive headers
      headers: {
        ...req.headers,
        authorization: req.headers.authorization ? '***' : undefined,
        cookie: req.headers.cookie ? '***' : undefined,
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
  // Don't log full bodies in production for storage efficiency
  customProps: (req) => ({
    userId: (req as any).user?.id,
  }),
  // Auto-generate trace IDs for cross-request tracking
  genReqId: (req) => req.headers['x-request-id'] || req.id,
  quietReqLogger: config.NODE_ENV === 'production',
});

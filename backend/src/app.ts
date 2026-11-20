import path from 'node:path';
import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { createRootRouter } from './routes';

const localDevelopmentOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5175',
]);

/**
 * Creates and configures the Express application instance.
 */
export function createApp(): express.Express {
  const app = express();

  // Trust proxy headers when deployed behind Railway's reverse proxy
  if (env.isProduction) {
    app.set('trust proxy', 1);
  }

  app.use(
    cors({
      origin: (origin, callback) => {
        const isAllowed =
          origin === undefined ||
          origin === env.frontendUrl ||
          (!env.isProduction && localDevelopmentOrigins.has(origin));
        callback(null, isAllowed);
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '2mb' }));

  app.use(createRootRouter());

  if (env.frontendDistDir) {
    app.use(express.static(env.frontendDistDir));
    app.get(/.*/, (req, res, next) => {
      if (
        req.path.startsWith('/api/') ||
        req.path.startsWith('/auth/') ||
        req.path.startsWith('/admin/')
      ) {
        next();
        return;
      }
      res.sendFile(path.join(env.frontendDistDir, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

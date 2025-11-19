/**
 * CORS Middleware
 */

import { cors as honoCors } from 'hono/cors';

export const cors = () => {
  return honoCors({
    origin: '*', // TODO: Configure specific origins in production
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 600,
    credentials: true,
  });
};

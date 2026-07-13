import type { NextFunction, Request, Response } from 'express';

/**
 * Public short links are served as `/{shortCode}` (e.g. https://go.example.com/abc1234).
 * Internally they map to the existing `/api/r/:shortCode` handlers so API routes
 * stay under the global `api` prefix.
 */
const SHORT_CODE_PATH = /^\/([A-Za-z0-9_-]{3,32})$/;

export function shortLinkRewriteMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    next();
    return;
  }

  const match = SHORT_CODE_PATH.exec(req.path);
  if (!match) {
    next();
    return;
  }

  const shortCode = match[1];
  const queryIndex = req.url.indexOf('?');
  const query = queryIndex >= 0 ? req.url.slice(queryIndex) : '';
  req.url = `/api/r/${shortCode}${query}`;
  next();
}

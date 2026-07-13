import type { NextFunction, Request, Response } from 'express';
import { shortLinkRewriteMiddleware } from './short-link-rewrite.middleware';

function mockReq(
  partial: Partial<Request> & { method: string; path: string; url: string },
): Request {
  return partial as Request;
}

describe('shortLinkRewriteMiddleware', () => {
  const res = {} as Response;
  let next: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    next = jest.fn();
  });

  it('rewrites pretty short URLs to /api/r/:code', () => {
    const req = mockReq({
      method: 'GET',
      path: '/abc1234',
      url: '/abc1234',
    });

    shortLinkRewriteMiddleware(req, res, next);

    expect(req.url).toBe('/api/r/abc1234');
    expect(next).toHaveBeenCalled();
  });

  it('preserves query strings', () => {
    const req = mockReq({
      method: 'POST',
      path: '/my-alias',
      url: '/my-alias?utm=1',
    });

    shortLinkRewriteMiddleware(req, res, next);

    expect(req.url).toBe('/api/r/my-alias?utm=1');
  });

  it('leaves API and multi-segment paths alone', () => {
    const apiReq = mockReq({
      method: 'GET',
      path: '/api/health',
      url: '/api/health',
    });
    shortLinkRewriteMiddleware(apiReq, res, next);
    expect(apiReq.url).toBe('/api/health');

    const nested = mockReq({
      method: 'GET',
      path: '/a/b',
      url: '/a/b',
    });
    shortLinkRewriteMiddleware(nested, res, next);
    expect(nested.url).toBe('/a/b');
  });
});

import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { proxy } from './proxy';

describe('auth proxy', () => {
  it('redirects anonymous protected requests to login with the original path', () => {
    const response = proxy(
      new NextRequest('http://localhost:3000/links/link-1'),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login?redirect=%2Flinks%2Flink-1',
    );
  });

  it('redirects authenticated users away from auth pages', () => {
    const request = new NextRequest('http://localhost:3000/login', {
      headers: { cookie: 'access_token=session-token' },
    });
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/dashboard',
    );
  });

  it('allows authenticated protected requests', () => {
    const request = new NextRequest('http://localhost:3000/analytics', {
      headers: { cookie: 'access_token=session-token' },
    });
    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });
});

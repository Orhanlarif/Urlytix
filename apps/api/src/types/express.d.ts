export {};

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user: {
        sub: string;
        email: string;
      };
    }
  }
}

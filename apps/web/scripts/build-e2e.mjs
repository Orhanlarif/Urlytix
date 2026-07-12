import { execSync } from 'node:child_process';

process.env.NEXT_PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:4001/api';

execSync('next build', { stdio: 'inherit', env: process.env });

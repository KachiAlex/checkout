import type { Express } from 'express';

declare module '../backend-dist/serverless' {
  export function createServer(): Promise<Express>;
}

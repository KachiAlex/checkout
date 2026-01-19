declare module "../backend-dist/serverless" {
  import type { Express } from "express";
  export function createServer(): Promise<Express>;
}

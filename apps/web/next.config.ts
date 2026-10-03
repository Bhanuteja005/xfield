import path from 'node:path';
import type { NextConfig } from 'next';

const config: NextConfig = {
  // Workspace packages ship TypeScript source and are compiled by Next.
  transpilePackages: ['@xfield/api', '@xfield/db', '@xfield/shared'],
  // The embedded development database loads WebAssembly from disk at runtime.
  serverExternalPackages: ['@electric-sql/pglite'],
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
};

export default config;

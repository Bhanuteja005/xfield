import { handleRequest } from '@xfield/api';
import { after } from 'next/server';

// The API needs Node APIs (database driver, filesystem storage in development)
// and must never be cached or prerendered.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const handler = (request: Request) =>
  handleRequest(request, { defer: (task) => after(() => task()) });

export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };

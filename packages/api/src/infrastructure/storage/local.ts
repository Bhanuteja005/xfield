import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { MediaStorage } from './types.ts';

/** Filesystem storage for development, tests and CI. Not suitable for serverless hosts. */
export function createLocalStorage(directory: string): MediaStorage {
  const root = path.resolve(directory);
  const locate = (key: string) => {
    const file = path.resolve(root, key);
    if (!file.startsWith(root + path.sep)) throw new Error('Invalid media key');
    return file;
  };
  return {
    async put(key, body, contentType) {
      const file = locate(key);
      const bytes =
        typeof body === 'string' ? body : new Uint8Array(await new Response(body).arrayBuffer());
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, bytes);
      await writeFile(`${file}.type`, contentType);
    },
    async read(key) {
      const file = locate(key);
      try {
        const [bytes, contentType] = await Promise.all([
          readFile(file),
          readFile(`${file}.type`, 'utf8'),
        ]);
        return { body: new Uint8Array(bytes).buffer, contentType };
      } catch {
        return null;
      }
    },
    async remove(key) {
      const file = locate(key);
      await Promise.all([rm(file, { force: true }), rm(`${file}.type`, { force: true })]);
    },
  };
}

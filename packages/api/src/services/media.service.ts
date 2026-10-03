export const UPLOAD_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'audio/webm',
] as const;

export type UploadType = (typeof UPLOAD_TYPES)[number];

/** Bytes needed by `matchesSignature`. */
export const SIGNATURE_BYTES = 12;

/** Every object is stored under its workspace, so a key can never cross tenants. */
export const mediaKey = (workspaceId: string, assetId: string) => `${workspaceId}/${assetId}`;

export const isUploadType = (type: string): type is UploadType =>
  (UPLOAD_TYPES as readonly string[]).includes(type);

const ascii = (bytes: Uint8Array, start: number, end: number) =>
  String.fromCharCode(...bytes.subarray(start, end));

/**
 * Checks the leading bytes against the declared type. The declared type comes
 * from the client, so it is not trusted on its own.
 */
export function matchesSignature(type: UploadType, head: Uint8Array): boolean {
  const riff = ascii(head, 0, 4) === 'RIFF';
  switch (type) {
    case 'image/png':
      return head[0] === 0x89 && ascii(head, 1, 4) === 'PNG';
    case 'image/jpeg':
      return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    case 'image/webp':
      return riff && ascii(head, 8, 12) === 'WEBP';
    case 'audio/wav':
      return riff && ascii(head, 8, 12) === 'WAVE';
    case 'video/mp4':
      return ascii(head, 4, 8) === 'ftyp';
    case 'video/webm':
    case 'audio/webm':
      return head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3;
    case 'audio/mpeg':
      return ascii(head, 0, 3) === 'ID3' || (head[0] === 0xff && ((head[1] ?? 0) & 0xe0) === 0xe0);
  }
}

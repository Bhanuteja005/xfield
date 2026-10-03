/** Largest upload the API accepts, minus room for the multipart envelope. */
export const UPLOAD_LIMIT = 4 * 1024 * 1024 - 8192;
const MAX_EDGE = 2560;

/** Re-encodes an oversized photo as JPEG so it fits the upload limit; other files pass through. */
export async function fitForUpload(file: File): Promise<File> {
  if (file.size <= UPLOAD_LIMIT || !/^image\/(png|jpeg|webp)$/.test(file.type)) return file;
  const bitmap = await createImageBitmap(file);
  let scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  for (let attempt = 0; attempt < 4; attempt++, scale *= 0.75) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) break;
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, 'image/jpeg', 0.85));
    if (blob && blob.size <= UPLOAD_LIMIT)
      return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  }
  return file;
}

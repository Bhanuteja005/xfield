import type { GenerationInput } from '@xfield/shared';

const DIMENSIONS: Record<GenerationInput['ratio'], [number, number]> = {
  '9:16': [720, 1280],
  '16:9': [1280, 720],
  '1:1': [1024, 1024],
  '4:3': [1024, 768],
  '3:4': [768, 1024],
};

const XML_ENTITIES: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
  "'": '&apos;',
};
const escapeXml = (value: string) => value.replace(/[<>&"']/g, (char) => XML_ENTITIES[char] ?? '');

/** Renders the labelled procedural placeholder. The seed only picks the hue. */
export function previewSvg(prompt: string, ratio: GenerationInput['ratio'], seed: string): string {
  const [w, h] = DIMENSIONS[ratio];
  const short = Math.min(w, h);
  const hue = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
    `<defs><radialGradient id="a"><stop stop-color="hsl(${hue},80%,55%)"/><stop offset="1" stop-color="#090e16"/></radialGradient></defs>`,
    `<rect width="100%" height="100%" fill="#0b1017"/>`,
    `<ellipse cx="${w * 0.6}" cy="${h * 0.4}" rx="${w * 0.6}" ry="${h * 0.6}" fill="url(#a)"/>`,
    `<circle cx="${w * 0.48}" cy="${h * 0.46}" r="${short * 0.23}" fill="none" stroke="#e4ff62" stroke-width="2"/>`,
    `<circle cx="${w * 0.48}" cy="${h * 0.46}" r="${short * 0.19}" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="22"/>`,
    `<path d="M0 ${h * 0.7} Q ${w * 0.5} ${h * 0.45} ${w} ${h * 0.7}" stroke="white" stroke-opacity=".15" fill="none"/>`,
    `<text x="${w * 0.07}" y="${h * 0.1}" fill="#e4ff62" font-family="sans-serif" font-size="18" letter-spacing="6">XFIELD / CONCEPT PREVIEW</text>`,
    `<text x="${w * 0.07}" y="${h * 0.84}" fill="white" font-family="sans-serif" font-weight="bold" font-size="${short * 0.047}">${escapeXml(prompt.slice(0, 38))}</text>`,
    `<text x="${w * 0.07}" y="${h * 0.9}" fill="#a6b0b8" font-family="sans-serif" font-size="18">Procedural composition · Not an AI generation</text>`,
    `</svg>`,
  ].join('');
}

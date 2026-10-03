/** Every studio page, keyed by its URL segment. */
export const SECTION_TITLES = {
  explore: 'Explore',
  image: 'Image studio',
  video: 'Video studio',
  audio: 'Audio studio',
  cinema: 'Cinema studio',
  marketing: 'Marketing studio',
  apps: 'Apps & effects',
  canvas: 'Canvas',
  projects: 'Projects',
  assets: 'My assets',
  community: 'Community',
  pricing: 'Plans',
  settings: 'Settings',
  academy: 'Academy',
  supercomputer: 'Creative assistant',
} as const;

export type SectionName = keyof typeof SECTION_TITLES;

export const isSection = (value: string): value is SectionName => value in SECTION_TITLES;

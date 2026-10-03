'use client';
import { useEffect, useState, type ComponentType } from 'react';
import { Pricing, Settings } from '../../features/account';
import { AssetLibrary } from '../../features/assets';
import { Assistant } from '../../features/assistant';
import { Canvas } from '../../features/canvas';
import { Academy, Apps, Community } from '../../features/discovery';
import { Explore } from '../../features/explore';
import { Marketing } from '../../features/marketing';
import { ProjectLibrary } from '../../features/projects';
import { Studio } from '../../features/studio';
import type { SectionName } from '../../lib/sections';
import type { StudioApi } from '../../lib/types';
import { useStudio } from './context';

const STUDIO_KINDS = { image: 'image', video: 'video', audio: 'audio', cinema: 'video' } as const;
type StudioSection = keyof typeof STUDIO_KINDS;
type PageSection = Exclude<SectionName, StudioSection | 'canvas'>;

const PAGES: Record<PageSection, ComponentType<StudioApi>> = {
  explore: Explore,
  assets: AssetLibrary,
  projects: ProjectLibrary,
  marketing: Marketing,
  apps: Apps,
  community: Community,
  pricing: Pricing,
  settings: Settings,
  academy: Academy,
  supercomputer: Assistant,
};

const isStudioSection = (name: SectionName): name is StudioSection => name in STUDIO_KINDS;

function CanvasPage({ studio }: { studio: StudioApi }) {
  const projectId =
    studio.seed?.project?.id ?? new URLSearchParams(window.location.search).get('project');
  if (studio.loading) return <p>Loading project…</p>;
  const project = studio.seed?.project ?? studio.projects.find((entry) => entry.id === projectId);
  return <Canvas key={projectId ?? 'new'} {...studio} seed={{ project }} />;
}

/** Renders one studio page. Pages use browser APIs, so they mount on the client only. */
export function Section({ name }: { name: SectionName }) {
  const studio = useStudio();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  if (isStudioSection(name))
    return (
      <Studio
        key={name + (studio.seed?.model ?? '')}
        kind={STUDIO_KINDS[name]}
        cinema={name === 'cinema'}
        {...studio}
      />
    );
  if (name === 'canvas') return <CanvasPage studio={studio} />;
  const Page = PAGES[name];
  return <Page {...studio} />;
}

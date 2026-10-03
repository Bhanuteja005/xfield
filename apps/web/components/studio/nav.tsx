'use client';
import { useEffect, useState } from 'react';
import { LIVE_MODELS, imageModels, videoModels } from '../../lib/data';
import type { SectionName } from '../../lib/sections';
import type { RouteTarget, Seed } from '../../lib/types';
import { Icon } from '../ui';

type MenuName = 'image' | 'video';

interface NavEntry {
  target: SectionName;
  label: string;
  badge?: 'New';
  menu?: MenuName;
}

/** Top navigation, in the reference order, limited to sections Xfield has. */
export const NAV: (NavEntry | 'divider')[] = [
  { target: 'explore', label: 'Explore' },
  { target: 'image', label: 'Image', menu: 'image' },
  { target: 'video', label: 'Video', menu: 'video' },
  { target: 'audio', label: 'Audio' },
  'divider',
  { target: 'apps', label: 'Effects' },
  { target: 'cinema', label: 'Cinema Studio' },
  { target: 'marketing', label: 'Marketing Studio', badge: 'New' },
  { target: 'supercomputer', label: 'Assistant', badge: 'New' },
  { target: 'academy', label: 'Academy' },
  { target: 'community', label: 'Community' },
];

/** Route, title, description and icon of each feature listed in a menu. */
type Feature = [SectionName, string, string, string];

const MENUS: Record<MenuName, { features: Feature[]; models: readonly string[] }> = {
  image: {
    features: [
      ['image', 'Create Image', 'Generate images from a prompt or reference', 'ImagePlus'],
      ['canvas', 'Canvas', 'Visual ideation meets repeatable workflows', 'Workflow'],
      ['apps', 'Effects', 'Ready-made looks and transformations', 'WandSparkles'],
      ['assets', 'My assets', 'Everything you have uploaded and made', 'Layers'],
    ],
    models: imageModels,
  },
  video: {
    features: [
      ['video', 'Create Video', 'Turn a prompt or image into motion', 'Video'],
      ['cinema', 'Cinema Studio', 'Cinematic video with camera and lens control', 'Clapperboard'],
      ['marketing', 'Marketing Studio', 'Campaign-ready ads and product shots', 'Megaphone'],
      ['canvas', 'Canvas', 'Plan sequences on an infinite board', 'Workflow'],
    ],
    models: videoModels,
  },
};

const MENU_WIDTH = 560;

interface NavProps {
  active: string;
  go: (target: RouteTarget, seed?: Seed | null) => void;
}

export function MainNav({ active, go }: NavProps) {
  const [open, setOpen] = useState<{ menu: MenuName; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const show = (menu: MenuName, element: HTMLElement) => {
    const { left } = element.getBoundingClientRect();
    setOpen({ menu, left: Math.max(12, Math.min(left, window.innerWidth - MENU_WIDTH - 12)) });
  };

  const pick = (target: RouteTarget, seed?: Seed) => {
    setOpen(null);
    go(target, seed ?? null);
  };

  return (
    <nav aria-label="Main navigation" className="main-nav">
      {NAV.map((entry, index) =>
        entry === 'divider' ? (
          <span key={`divider-${index}`} className="nav-divider" aria-hidden="true" />
        ) : (
          <div
            key={entry.target}
            className="nav-item"
            onMouseEnter={(event) => entry.menu && show(entry.menu, event.currentTarget)}
            onMouseLeave={() => entry.menu && setOpen(null)}
            onFocus={(event) => entry.menu && show(entry.menu, event.currentTarget)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setOpen(null);
            }}
          >
            <button
              className={active === entry.target ? 'active' : ''}
              aria-haspopup={entry.menu ? 'true' : undefined}
              aria-expanded={entry.menu ? open?.menu === entry.menu : undefined}
              onClick={() => pick(entry.target)}
            >
              {entry.label}
              {entry.badge && <span className="nav-badge">{entry.badge}</span>}
              {entry.menu && <Icon name="ChevronDown" size={13} />}
            </button>
            {entry.menu && open?.menu === entry.menu && (
              <div className="mega-menu" style={{ left: open.left }}>
                <div>
                  <small>Features</small>
                  {MENUS[entry.menu].features.map(([target, title, text, icon]) => (
                    <button key={title} className="mega-row" onClick={() => pick(target)}>
                      <span className="mega-icon">
                        <Icon name={icon} size={17} />
                      </span>
                      <span>
                        <b>{title}</b>
                        <em>{text}</em>
                      </span>
                    </button>
                  ))}
                </div>
                <div>
                  <small>Models</small>
                  {MENUS[entry.menu].models.map((model) => (
                    <button
                      key={model}
                      className="mega-row compact"
                      onClick={() => pick(entry.target, { model })}
                    >
                      <b>{model}</b>
                      {model === LIVE_MODELS[entry.menu as MenuName] ? (
                        <span className="nav-badge">Live</span>
                      ) : (
                        <span className="mega-note">Preview</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ),
      )}
    </nav>
  );
}

const BANNER_KEY = 'xf_banner_dismissed';

/** A dismissible strip above the bar that invites guests to create an account. */
export function usePromoBanner(visible: boolean) {
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(BANNER_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);
  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(BANNER_KEY, '1');
    } catch {
      // Storage can be unavailable; the banner simply returns next visit.
    }
  };
  return { shown: visible && !dismissed, dismiss };
}

export function PromoBanner({ onSignUp, dismiss }: { onSignUp: () => void; dismiss: () => void }) {
  return (
    <div className="promo-banner" role="region" aria-label="Announcement">
      <span>
        <Icon name="Sparkles" size={15} />
        <span className="promo-long">
          Create a free account to keep everything you make, on every device
        </span>
        <span className="promo-short">Keep your work on every device</span>
      </span>
      <button className="promo-cta" onClick={onSignUp}>
        Sign up free
      </button>
      <button className="promo-close" aria-label="Dismiss announcement" onClick={dismiss}>
        <Icon name="X" size={15} />
      </button>
    </div>
  );
}

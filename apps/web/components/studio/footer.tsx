import type { RouteTarget } from '../../lib/types';

/** Link columns, each entry pointing at a page that exists in the studio. */
const columns: { title: string; links: [string, RouteTarget][] }[] = [
  {
    title: 'Create',
    links: [
      ['Image studio', 'image'],
      ['Video studio', 'video'],
      ['Audio studio', 'audio'],
      ['Cinema studio', 'cinema'],
      ['Marketing studio', 'marketing'],
    ],
  },
  {
    title: 'Explore',
    links: [
      ['Explore', 'explore'],
      ['Apps & effects', 'apps'],
      ['Canvas', 'canvas'],
      ['Creative assistant', 'supercomputer'],
    ],
  },
  {
    title: 'Library',
    links: [
      ['Projects', 'projects'],
      ['My assets', 'assets'],
      ['Community', 'community'],
    ],
  },
  {
    title: 'Support',
    links: [
      ['Academy', 'academy'],
      ['Plans', 'pricing'],
      ['Settings', 'settings'],
    ],
  },
];

/** Site footer: brand, link columns and an oversized wordmark. */
export function SiteFooter({ go }: { go: (target: RouteTarget) => void }) {
  return (
    <footer className="site-footer">
      <div className="site-footer-top">
        <div className="site-footer-brand">
          <span className="brand">xfield.</span>
          <p>Made for the things you haven&apos;t imagined yet.</p>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h3>{column.title}</h3>
            {column.links.map(([label, target]) => (
              <button key={label} onClick={() => go(target)}>
                {label}
              </button>
            ))}
          </nav>
        ))}
      </div>
      <div className="site-footer-bottom">
        <span>© 2026 Xfield</span>
        <button onClick={() => go('home')}>Home</button>
      </div>
      <div className="site-footer-mark" aria-hidden="true">
        xfield
      </div>
    </footer>
  );
}

import { Icon, Button, Modal, Empty, Gallery } from './components/ui';
import { Studio } from './features/studio';
import { AssetLibrary } from './features/assets';
import { ProjectLibrary } from './features/projects';
import { Canvas } from './features/canvas';
import { Marketing } from './features/marketing';
import { Apps, Community, Academy } from './features/discovery';
import { Pricing, Settings, KeyDialog } from './features/account';
import { Assistant } from './features/assistant';
import React, { useEffect, useState } from 'react';
import { api, patch } from './lib/api';
import { media, tools } from './lib/data';
const routeNames = {
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
};
export default function App() {
  const [route, setRoute] = useState(location.pathname.split('/')[1] || 'explore'),
    [session, setSession] = useState({ name: 'Creator', connected: false }),
    [assets, setAssets] = useState([]),
    [jobs, setJobs] = useState([]),
    [projects, setProjects] = useState([]),
    [folders, setFolders] = useState([]),
    [error, setError] = useState(''),
    [toast, setToast] = useState(''),
    [search, setSearch] = useState(''),
    [detail, setDetail] = useState(null),
    [dialog, setDialog] = useState(null),
    [seed, setSeed] = useState(null),
    [menu, setMenu] = useState(false),
    [loading, setLoading] = useState(true),
    [sidebar, setSidebar] = useState(false);
  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };
  const refresh = async () => {
    try {
      const s = await api('/session');
      const [a, j, p, f] = await Promise.all([
        api('/assets'),
        api('/jobs'),
        api('/projects'),
        api('/folders'),
      ]);
      setSession(s);
      setAssets(a);
      setJobs(j);
      setProjects(p);
      setFolders(f);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    refresh();
    const h = () => setRoute(location.pathname.split('/')[1] || 'explore');
    window.addEventListener('popstate', h);
    return () => window.removeEventListener('popstate', h);
  }, []);
  useEffect(() => {
    if (!jobs.some((j) => j.status === 'processing')) return;
    const t = setInterval(refresh, 3500);
    return () => clearInterval(t);
  }, [jobs]);
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') {
        setDetail(null);
        setDialog(null);
        setMenu(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  const go = (r, data = null) => {
    history.pushState(
      {},
      '',
      r === 'explore'
        ? '/'
        : '/' + r + (data?.project?.id ? '?project=' + encodeURIComponent(data.project.id) : ''),
    );
    setRoute(r);
    setSearch('');
    setSeed(data);
    setMenu(false);
    setSidebar(false);
    window.scrollTo(0, 0);
  };
  const mutate = async (fn, msg) => {
    try {
      await fn();
      await refresh();
      if (msg) notify(msg);
    } catch (e) {
      notify(e.message);
    }
  };
  const saveSample = async (m) => {
    try {
      const res = await fetch(m.image);
      const blob = await res.blob();
      const form = new FormData();
      form.append('file', new File([blob], m.name + '.jpg', { type: 'image/jpeg' }));
      await api('/upload', { method: 'POST', body: form });
      await refresh();
      notify('Saved to your assets');
    } catch (e) {
      notify(e.message);
    }
  };
  const busy = jobs.filter((j) => j.status === 'processing').length;
  const filteredMedia = media.filter((m) =>
    `${m.name} ${m.category} ${m.prompt}`.toLowerCase().includes(search.toLowerCase()),
  );
  const bodyProps = {
    go,
    notify,
    assets,
    jobs,
    projects,
    folders,
    refresh,
    session,
    seed,
    setDetail,
    setDialog,
    mutate,
    search,
  };
  return (
    <div className="app">
      <header className="topbar">
        <button
          className="mobile-menu"
          aria-label="Open navigation"
          onClick={() => setSidebar(!sidebar)}
        >
          <Icon name="Menu" />
        </button>
        <button className="brand" onClick={() => go('explore')}>
          <span className="brand-icon">×</span>
          <span>
            xfield<span className="brand-dot">.</span>
          </span>
        </button>
        <nav aria-label="Main navigation">
          {['explore', 'image', 'video', 'audio', 'cinema', 'marketing', 'apps'].map((r) => (
            <button key={r} onClick={() => go(r)} className={route === r ? 'active' : ''}>
              {r === 'cinema'
                ? 'Cinema studio'
                : r === 'marketing'
                  ? 'Marketing studio'
                  : r === 'apps'
                    ? 'Apps'
                    : routeNames[r].replace(' studio', '')}
              {r === 'marketing' && <span className="tiny-label">NEW</span>}
            </button>
          ))}
        </nav>
        <div className="top-actions">
          <div className="searchbox">
            <Icon name="Search" size={15} />
            <input
              id="global-search"
              aria-label="Search creations"
              placeholder="Search anything"
              value={search}
              onChange={(e) => {
                if (!['explore', 'community', 'apps', 'assets'].includes(route)) go('explore');
                setSearch(e.target.value);
              }}
            />
            <kbd>⌘ K</kbd>
          </div>
          <Button icon="Gem" onClick={() => go('pricing')}>
            Upgrade
          </Button>
          <button className="avatar" aria-label="Account menu" onClick={() => setMenu(!menu)}>
            {session.name.slice(0, 1).toUpperCase()}
          </button>
        </div>
        {menu && (
          <div className="account-menu">
            <b>{session.name}</b>
            <small>Guest workspace · saved on this browser</small>
            <Button icon="User" onClick={() => go('settings')}>
              Your profile
            </Button>
            <Button icon="KeyRound" onClick={() => setDialog('key')}>
              {session.connected ? 'Manage API key' : 'Connect API key'}
            </Button>
            <Button icon="Gem" onClick={() => go('pricing')}>
              View plans
            </Button>
            <a href="/signin-with-chatgpt?return_to=/settings" target="_top">
              Sign in with ChatGPT ↗
            </a>
          </div>
        )}
      </header>
      <aside className={`rail ${sidebar ? 'open' : ''}`}>
        <div className="rail-group">
          <small>WORKSPACE</small>
          {[
            ['explore', 'Compass', 'Explore'],
            ['projects', 'FolderOpen', 'Projects'],
            ['assets', 'Layers', 'My assets'],
            ['canvas', 'Workflow', 'Canvas'],
          ].map(([r, i, n]) => (
            <button key={r} className={route === r ? 'active' : ''} onClick={() => go(r)}>
              <Icon name={i} />
              <span>{n}</span>
              {r === 'assets' && assets.length > 0 && <em>{assets.length}</em>}
            </button>
          ))}
        </div>
        <div className="rail-group">
          <small>CREATE</small>
          {[
            ['image', 'Image', 'Image'],
            ['video', 'Video', 'Video'],
            ['audio', 'AudioLines', 'Audio'],
            ['cinema', 'Clapperboard', 'Cinema studio'],
            ['marketing', 'Megaphone', 'Marketing studio'],
            ['supercomputer', 'Sparkles', 'Creative assistant'],
          ].map(([r, i, n]) => (
            <button key={r} className={route === r ? 'active' : ''} onClick={() => go(r)}>
              <Icon name={i} />
              <span>{n}</span>
            </button>
          ))}
        </div>
        <div className="rail-group">
          <small>DISCOVER</small>
          {[
            ['apps', 'Grid2X2', 'Apps & effects'],
            ['community', 'Users', 'Community'],
            ['academy', 'GraduationCap', 'Academy'],
          ].map(([r, i, n]) => (
            <button key={r} className={route === r ? 'active' : ''} onClick={() => go(r)}>
              <Icon name={i} />
              <span>{n}</span>
            </button>
          ))}
        </div>
        <div className="rail-bottom">
          <div className="mode-card">
            <span className="live-dot" />
            <b>Preview workspace</b>
            <p>Explore freely. Connect your key for real AI generation.</p>
            <button onClick={() => setDialog('key')}>
              {session.connected ? 'API key saved' : 'Connect API key'}
              <Icon name="ArrowUpRight" size={14} />
            </button>
          </div>
          <button onClick={() => go('settings')}>
            <Icon name="Settings" />
            Settings
          </button>
          <span className="rail-copy">Independent product rebuild</span>
        </div>
      </aside>
      <main
        aria-busy={loading}
        className={`main ${['image', 'video', 'audio', 'cinema'].includes(route) ? 'studio-main' : ''}`}
      >
        {error && (
          <div className="error-banner">
            <Icon name="AlertCircle" />
            {error}
            <button onClick={refresh}>Retry</button>
          </div>
        )}
        {route === 'explore' && (
          <>
            <div className="page-heading">
              <div>
                <span className="eyebrow">YOUR NEXT GREAT IDEA STARTS HERE</span>
                <h1>
                  What will you create today<span>?</span>
                </h1>
                <p>One workspace. Endless possibilities.</p>
              </div>
              <Button icon="Plus" primary onClick={() => go('image')}>
                Create something
              </Button>
            </div>
            <section className="hero-grid">
              <button
                className="hero hero-large"
                onClick={() => go('video', { prompt: media[0].prompt, preset: 'Orbit' })}
              >
                <img src={media[0].image} alt="Earth seen from space" />
                <div className="hero-shade" />
                <span className="pill">THE POSSIBILITIES ARE INFINITE</span>
                <div className="hero-copy">
                  <span className="eyebrow">VIDEO STUDIO</span>
                  <h2>
                    Dream it.
                    <br />
                    Direct it.
                  </h2>
                  <p>Take your imagination beyond the frame.</p>
                  <span className="hero-cta">
                    Start creating <Icon name="ArrowUpRight" />
                  </span>
                </div>
                <span className="hero-index">01 / 03</span>
              </button>
              <div className="hero-side">
                <button className="hero" onClick={() => go('image', { prompt: media[2].prompt })}>
                  <img src={media[2].image} alt="Editorial fashion portrait" />
                  <div className="hero-shade" />
                  <span className="pill">IMAGE STUDIO</span>
                  <div className="hero-copy">
                    <h2>
                      Make it
                      <br />
                      unforgettable.
                    </h2>
                    <span className="hero-cta">
                      Explore image models <Icon name="ArrowUpRight" />
                    </span>
                  </div>
                </button>
                <button className="hero hero-green" onClick={() => go('marketing')}>
                  <span className="pill dark">FROM IDEA TO CAMPAIGN</span>
                  <div className="orbital">
                    <span>✳</span>
                  </div>
                  <div className="hero-copy">
                    <h2>
                      Your next
                      <br />
                      big thing.
                    </h2>
                    <span className="hero-cta">
                      Meet Marketing studio <Icon name="ArrowUpRight" />
                    </span>
                  </div>
                </button>
              </div>
            </section>
            <section>
              <div className="section-heading">
                <div>
                  <h2>Everything you need to create</h2>
                  <p>Find your tool. Follow your imagination.</p>
                </div>
                <Button onClick={() => go('apps')}>
                  All tools <Icon name="ArrowRight" size={15} />
                </Button>
              </div>
              <div className="tool-grid">
                {tools.map(([r, n, d, i, tag]) => (
                  <button className="tool-card" key={r} onClick={() => go(r)}>
                    <div>
                      <Icon name={i} size={23} />
                      {tag && <span className="badge">{tag}</span>}
                    </div>
                    <b>{n}</b>
                    <p>{d}</p>
                    <Icon name="ArrowUpRight" className="tool-arrow" size={17} />
                  </button>
                ))}
              </div>
            </section>
            <section>
              <div className="section-heading">
                <div>
                  <span className="eyebrow lime">MADE OF IMAGINATION</span>
                  <h2>A little inspiration goes a long way.</h2>
                  <p>Explore the possibilities. Make them your own.</p>
                </div>
                <Button onClick={() => go('community')}>
                  Explore community <Icon name="ArrowUpRight" size={15} />
                </Button>
              </div>
              <Gallery items={filteredMedia} setDetail={setDetail} />
            </section>
            <div className="bottom-banner">
              <Icon name="Workflow" size={36} />
              <div>
                <h2>Big ideas need room to grow.</h2>
                <p>Keep references, notes and generations together on Canvas.</p>
              </div>
              <Button onClick={() => go('canvas')} primary>
                Open Canvas <Icon name="ArrowUpRight" size={16} />
              </Button>
            </div>
          </>
        )}
        {['image', 'video', 'audio', 'cinema'].includes(route) && (
          <Studio
            key={route}
            kind={route === 'cinema' ? 'video' : route}
            cinema={route === 'cinema'}
            {...bodyProps}
          />
        )}
        {route === 'assets' && <AssetLibrary {...bodyProps} />}
        {route === 'projects' && <ProjectLibrary {...bodyProps} />}
        {route === 'canvas' &&
          (!loading ? (
            <Canvas
              key={
                seed?.project?.id || new URLSearchParams(location.search).get('project') || 'new'
              }
              {...bodyProps}
              seed={
                seed?.project
                  ? seed
                  : {
                      project: projects.find(
                        (p) => p.id === new URLSearchParams(location.search).get('project'),
                      ),
                    }
              }
            />
          ) : (
            <p>Loading project…</p>
          ))}
        {route === 'marketing' && <Marketing {...bodyProps} />}
        {route === 'apps' && <Apps {...bodyProps} />}
        {route === 'community' && <Community {...bodyProps} />}
        {route === 'pricing' && <Pricing {...bodyProps} />}
        {route === 'settings' && <Settings {...bodyProps} />}
        {route === 'academy' && <Academy {...bodyProps} />}
        {route === 'supercomputer' && <Assistant {...bodyProps} />}
        {!routeNames[route] && (
          <Empty
            icon="Compass"
            title="Let's find your way"
            text="This page doesn't exist."
            action="Back to Explore"
            onClick={() => go('explore')}
          />
        )}
        {route === 'explore' && (
          <footer>
            <span className="brand">xfield.</span>
            <p>Made for the things you haven't imagined yet.</p>
            <button onClick={() => go('academy')}>Help & guides</button>
            <span>© 2026 Xfield · Independent rebuild</span>
          </footer>
        )}
      </main>
      {busy > 0 && (
        <button className="job-indicator" onClick={() => go('video')}>
          <span className="spinner" />
          {busy} generation{busy > 1 ? 's' : ''} in progress
          <Icon name="ChevronRight" size={16} />
        </button>
      )}
      {toast && (
        <div className="toast" role="status">
          <Icon name="CheckCircle2" />
          {toast}
        </div>
      )}
      {detail && (
        <Modal title={detail.name} close={() => setDetail(null)} wide>
          <div className="detail-grid">
            <div className="detail-media">
              {detail.kind === 'audio' ? (
                <audio controls src={detail.url} />
              ) : detail.kind === 'video' && detail.model !== 'Concept preview' ? (
                <video controls src={detail.url} />
              ) : (
                <img src={detail.image || detail.url} alt={detail.name} />
              )}
            </div>
            <div className="detail-info">
              <span className="eyebrow">
                {detail.creator
                  ? 'INSPIRATION SAMPLE'
                  : detail.model === 'Concept preview'
                    ? 'CONCEPT PREVIEW'
                    : 'YOUR CREATION'}
              </span>
              <h2>{detail.name}</h2>
              <p>
                {detail.creator
                  ? `Curated by ${detail.creator}`
                  : new Date(detail.created).toLocaleDateString()}
              </p>
              <label>Prompt</label>
              <div className="prompt-display">{detail.prompt || 'Uploaded reference asset'}</div>
              <Button
                icon="Copy"
                onClick={() =>
                  navigator.clipboard
                    .writeText(detail.prompt || '')
                    .then(() => notify('Prompt copied'))
                }
              >
                Copy prompt
              </Button>
              <Button
                primary
                icon="Sparkles"
                onClick={() => {
                  setDetail(null);
                  go(detail.kind === 'video' ? 'video' : 'image', {
                    prompt: detail.prompt,
                    reference: detail.id,
                  });
                }}
              >
                Use as inspiration
              </Button>
              {detail.creator ? (
                <Button icon="Bookmark" onClick={() => saveSample(detail)}>
                  Save to assets
                </Button>
              ) : (
                <>
                  <a
                    className="btn"
                    href={detail.url}
                    download={detail.name}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Icon name="Download" size={16} />
                    Download
                  </a>
                  <Button
                    icon="Heart"
                    onClick={() =>
                      mutate(
                        () => patch('/assets/' + detail.id, { favorite: !detail.favorite }),
                        'Favorite updated',
                      )
                    }
                  >
                    {detail.favorite ? 'Remove favorite' : 'Favorite'}
                  </Button>
                  <Button
                    icon="Globe"
                    onClick={() =>
                      mutate(
                        () => patch('/assets/' + detail.id, { published: !detail.published }),
                        detail.published ? 'Made private' : 'Published to community',
                      )
                    }
                  >
                    {detail.published ? 'Make private' : 'Publish to community'}
                  </Button>
                </>
              )}
              {detail.model === 'Concept preview' && (
                <small>
                  This is a procedural SVG concept, not AI-generated media or an exported video.
                </small>
              )}
            </div>
          </div>
        </Modal>
      )}
      {dialog === 'key' && (
        <KeyDialog
          session={session}
          close={() => setDialog(null)}
          refresh={refresh}
          notify={notify}
        />
      )}
    </div>
  );
}

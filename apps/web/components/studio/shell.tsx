'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthDialog, KeyDialog } from '../../features/account';
import { Onboarding } from '../../features/onboarding';
import { api, post } from '../../lib/api';
import type { SectionName } from '../../lib/sections';
import {
  messageOf,
  type Asset,
  type Detail,
  type DialogName,
  type Folder,
  type Job,
  type Project,
  type Seed,
  type StudioApi,
  type Workspace,
} from '../../lib/types';
import { ErrorBoundary } from '../ErrorBoundary';
import { Button, Icon } from '../ui';
import { AssetDetail } from './asset-detail';
import { MainNav, PromoBanner, usePromoBanner } from './nav';
import { StudioContext } from './context';

const POLL_INTERVAL_MS = 3500;
const TOAST_MS = 4000;
const STUDIO_ROUTES = ['image', 'video', 'audio', 'cinema'];
const SEARCHABLE_ROUTES = ['explore', 'community', 'apps', 'assets'];

type RailItem = [SectionName, string, string];
const RAIL_GROUPS: [string, RailItem[]][] = [
  [
    'WORKSPACE',
    [
      ['explore', 'Compass', 'Explore'],
      ['projects', 'FolderOpen', 'Projects'],
      ['assets', 'Layers', 'My assets'],
      ['canvas', 'Workflow', 'Canvas'],
    ],
  ],
  [
    'CREATE',
    [
      ['image', 'Image', 'Image'],
      ['video', 'Video', 'Video'],
      ['audio', 'AudioLines', 'Audio'],
      ['cinema', 'Clapperboard', 'Cinema studio'],
      ['marketing', 'Megaphone', 'Marketing studio'],
      ['supercomputer', 'Sparkles', 'Creative assistant'],
    ],
  ],
  [
    'DISCOVER',
    [
      ['apps', 'Grid2X2', 'Apps & effects'],
      ['community', 'Users', 'Community'],
      ['academy', 'GraduationCap', 'Academy'],
    ],
  ],
];

const GUEST: Workspace = { name: 'Creator', connected: false, email: null, onboarding: false };

export function StudioShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const route = usePathname().split('/')[1] || 'explore';
  const [session, setSession] = useState<Workspace>(GUEST);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [dialog, setDialog] = useState<DialogName | null>(null);
  const [seed, setSeed] = useState<Seed | null>(null);
  const [menu, setMenu] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [loading, setLoading] = useState(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const notify = useCallback((message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), TOAST_MS);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const current = await api<Workspace>('/session');
      const [nextAssets, nextJobs, nextProjects, nextFolders] = await Promise.all([
        api<Asset[]>('/assets'),
        api<Job[]>('/jobs'),
        api<Project[]>('/projects'),
        api<Folder[]>('/folders'),
      ]);
      setSession(current);
      setAssets(nextAssets);
      setJobs(nextJobs);
      setProjects(nextProjects);
      setFolders(nextFolders);
      setError('');
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // A prompt handed over from the landing page arrives in the query string.
    const query = new URLSearchParams(window.location.search);
    const prompt = query.get('prompt') ?? undefined;
    const model = query.get('model') ?? undefined;
    if (prompt || model) setSeed({ prompt, model });
    // Sign-in links and the OAuth callback report back through the query string.
    const auth = query.get('auth');
    const authError = query.get('auth_error');
    if (auth === 'signin' || auth === 'signup') setDialog(auth);
    if (auth === 'signed-in') notify('You are signed in');
    if (authError) notify(authError);
    if (auth || authError) {
      query.delete('auth');
      query.delete('auth_error');
      const rest = query.toString();
      window.history.replaceState(null, '', window.location.pathname + (rest ? '?' + rest : ''));
    }
    void refresh();
  }, [refresh, notify]);

  // Poll only while something is rendering.
  useEffect(() => {
    if (!jobs.some((job) => job.status === 'processing')) return;
    const timer = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [jobs, refresh]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDetail(null);
        setDialog(null);
        setMenu(false);
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        document.getElementById('global-search')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = useCallback<StudioApi['go']>(
    (target, data = null) => {
      const query = data?.project?.id ? `?project=${encodeURIComponent(data.project.id)}` : '';
      setSeed(data);
      setSearch('');
      setMenu(false);
      setSidebar(false);
      router.push(target === 'home' ? '/' : `/${target}${query}`);
    },
    [router],
  );

  const mutate = useCallback<StudioApi['mutate']>(
    async (action, message) => {
      try {
        await action();
        await refresh();
        if (message) notify(message);
      } catch (failure) {
        notify(messageOf(failure));
      }
    },
    [refresh, notify],
  );

  const signOut = () => {
    setMenu(false);
    void mutate(() => post('/auth/signout', {}), 'Signed out');
  };

  const studio = useMemo<StudioApi>(
    () => ({
      go,
      notify,
      refresh,
      mutate,
      assets,
      jobs,
      projects,
      folders,
      session,
      seed,
      search,
      loading,
      setDetail,
      setDialog,
    }),
    [go, notify, refresh, mutate, assets, jobs, projects, folders, session, seed, search, loading],
  );

  const banner = usePromoBanner(!loading && !session.email);
  const busy = jobs.filter((job) => job.status === 'processing').length;
  const railButton = ([target, icon, label]: RailItem) => (
    <button key={target} className={route === target ? 'active' : ''} onClick={() => go(target)}>
      <Icon name={icon} />
      <span>{label}</span>
      {target === 'assets' && assets.length > 0 && <em>{assets.length}</em>}
    </button>
  );

  return (
    <StudioContext.Provider value={studio}>
      <div className={`app ${banner.shown ? 'with-banner' : ''}`}>
        {banner.shown && (
          <PromoBanner onSignUp={() => setDialog('signup')} dismiss={banner.dismiss} />
        )}
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
          <MainNav active={route} go={go} />
          <div className="top-actions">
            {session.email ? (
              <>
                <div className="searchbox">
                  <Icon name="Search" size={15} />
                  <input
                    id="global-search"
                    aria-label="Search creations"
                    placeholder="Search"
                    value={search}
                    onChange={(event) => {
                      if (!SEARCHABLE_ROUTES.includes(route)) router.push('/explore');
                      setSearch(event.target.value);
                    }}
                  />
                  <kbd>⌘ K</kbd>
                </div>
                <Button icon="Rocket" className="upgrade-pill" onClick={() => go('pricing')}>
                  Upgrade
                </Button>
                <Button icon="FolderOpen" className="assets-pill" onClick={() => go('assets')}>
                  Assets
                </Button>
                <button
                  className="avatar"
                  aria-label="Account menu"
                  aria-expanded={menu}
                  onClick={() => setMenu(!menu)}
                >
                  {session.name.slice(0, 1).toUpperCase()}
                </button>
              </>
            ) : (
              <>
                <Button icon="Gem" className="pricing-pill" onClick={() => go('pricing')}>
                  Pricing
                </Button>
                <Button className="auth-login" onClick={() => setDialog('signin')}>
                  Login
                </Button>
                <Button primary className="auth-signup" onClick={() => setDialog('signup')}>
                  Sign up
                </Button>
              </>
            )}
          </div>
          {menu && session.email && (
            <div className="account-menu" role="menu">
              <div className="account-head">
                <span className="avatar">{session.name.slice(0, 1).toUpperCase()}</span>
                <span>
                  <b>{session.name}</b>
                  <small>{session.email}</small>
                </span>
              </div>
              <hr />
              <button role="menuitem" onClick={() => go('settings')}>
                <Icon name="User" size={16} /> View profile
              </button>
              <button role="menuitem" onClick={() => setDialog('key')}>
                <Icon name="KeyRound" size={16} />
                {session.connected ? 'Manage API key' : 'Connect API key'}
              </button>
              <button role="menuitem" onClick={() => go('pricing')}>
                <Icon name="Gem" size={16} /> Plans
              </button>
              <button role="menuitem" onClick={() => go('community')}>
                <Icon name="Users" size={16} /> Join community
              </button>
              <hr />
              <button role="menuitem" onClick={signOut}>
                <Icon name="LogOut" size={16} /> Sign out
              </button>
            </div>
          )}
        </header>
        <aside className={`rail ${sidebar ? 'open' : ''}`}>
          {RAIL_GROUPS.map(([title, items]) => (
            <div className="rail-group" key={title}>
              <small>{title}</small>
              {items.map(railButton)}
            </div>
          ))}
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
          className={`main ${STUDIO_ROUTES.includes(route) ? 'studio-main' : ''}`}
        >
          {error && (
            <div className="error-banner">
              <Icon name="AlertCircle" />
              {error}
              <button onClick={() => void refresh()}>Retry</button>
            </div>
          )}
          <ErrorBoundary key={route}>{children}</ErrorBoundary>
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
        {detail && <AssetDetail detail={detail} />}
        {session.onboarding && (
          <Onboarding
            done={async () => {
              await refresh();
              notify('Welcome to Xfield. Your studio is ready.');
              go('explore');
            }}
          />
        )}
        {dialog === 'key' && (
          <KeyDialog
            session={session}
            close={() => setDialog(null)}
            refresh={refresh}
            notify={notify}
          />
        )}
        {(dialog === 'signin' || dialog === 'signup') && (
          <AuthDialog
            initial={dialog}
            close={() => setDialog(null)}
            refresh={refresh}
            notify={notify}
          />
        )}
      </div>
    </StudioContext.Provider>
  );
}

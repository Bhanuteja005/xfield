import { useState, type FormEvent } from 'react';
export { AuthDialog } from './auth-dialog';
import { Button, Heading, Icon, Modal } from '../../components/ui';
import { api, patch, post } from '../../lib/api';
import { messageOf, type StudioApi, type Workspace } from '../../lib/types';

interface Plan {
  name: string;
  monthly: number;
  yearly: number;
  summary: string;
  features: string[];
}

const PLANS: Plan[] = [
  {
    name: 'Explorer',
    monthly: 0,
    yearly: 0,
    summary: 'For finding your next creative direction.',
    features: [
      'Concept previews',
      'Project canvas',
      'Uploads and asset library',
      'Community publishing',
    ],
  },
  {
    name: 'Creator',
    monthly: 30,
    yearly: 24,
    summary: 'For a steady stream of big ideas.',
    features: [
      'Everything in Explorer',
      'Image and video studio',
      'Provider key connection',
      'Full prompt and job history',
    ],
  },
  {
    name: 'Studio',
    monthly: 80,
    yearly: 64,
    summary: 'For building a world of your own.',
    features: [
      'Everything in Creator',
      'Cinema planning tools',
      'Campaign brief builder',
      'Organized project libraries',
    ],
  },
];
const FEATURED_PLAN = 'Creator';

export function Pricing({ setDialog }: Pick<StudioApi, 'setDialog'>) {
  const [annual, setAnnual] = useState(true);
  return (
    <>
      <Heading
        eyebrow="ROOM FOR EVERY IDEA"
        title="Create at your own pace."
        text="The preview workspace is free. Real AI generations use your Higgsfield API credits."
      />
      <div className="billing-toggle">
        <button className={annual ? '' : 'selected'} onClick={() => setAnnual(false)}>
          Monthly
        </button>
        <button className={annual ? 'selected' : ''} onClick={() => setAnnual(true)}>
          Yearly <span>Save 20%</span>
        </button>
      </div>
      <div className="pricing-grid">
        {PLANS.map((plan) => {
          const featured = plan.name === FEATURED_PLAN;
          const free = plan.monthly === 0;
          return (
            <div className={`price-card ${featured ? 'featured' : ''}`} key={plan.name}>
              {featured && <span className="badge">MOST POPULAR</span>}
              <h2>{plan.name}</h2>
              <p>{plan.summary}</p>
              <div className="price">
                ${annual ? plan.yearly : plan.monthly}
                <span>/ month</span>
              </div>
              <small>
                {free
                  ? 'Always free'
                  : `Illustrative plan · billed ${annual ? 'yearly' : 'monthly'}`}
              </small>
              <Button primary={featured} onClick={() => setDialog('key')}>
                {free ? 'Start creating' : 'Connect your provider'}
                <Icon name="ArrowUpRight" size={16} />
              </Button>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Icon name="Check" size={16} />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="pricing-disclosure">
        <Icon name="Info" />
        <p>
          This rebuild does not sell subscriptions or collect payment. Paid plan prices are
          illustrative UI; every implemented workspace feature is available. Provider generation is
          billed separately by Higgsfield.
        </p>
      </div>
    </>
  );
}

type SettingsProps = Pick<StudioApi, 'session' | 'refresh' | 'notify' | 'setDialog' | 'mutate'>;

export function Settings({ session, refresh, notify, setDialog, mutate }: SettingsProps) {
  const [name, setName] = useState(session.name);
  const [saving, setSaving] = useState(false);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await patch('/profile', { name });
      await refresh();
      notify('Profile updated');
    } catch (failure) {
      notify(messageOf(failure));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Heading
        eyebrow="MAKE YOURSELF AT HOME"
        title="Your workspace"
        text="A few details that make this space yours."
      />
      <div className="settings-page">
        <section>
          <h2>Profile</h2>
          <form onSubmit={saveProfile}>
            <label>
              Display name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={60}
              />
            </label>
            <Button primary type="submit" disabled={saving}>
              Save profile
            </Button>
          </form>
        </section>
        <section>
          <h2>Generation connection</h2>
          <div className="connection-row">
            <span className="connection-logo">
              <Icon name="Sparkles" size={26} />
            </span>
            <div>
              <b>Higgsfield API</b>
              <p>
                {session.connected
                  ? 'API key saved · access is verified on generation'
                  : 'Connect your own key for live image and video generation.'}
              </p>
            </div>
            <Button onClick={() => setDialog('key')}>
              {session.connected ? 'Manage API key' : 'Connect API key'}
            </Button>
          </div>
        </section>
        <section>
          <h2>Account</h2>
          {session.email ? (
            <>
              <p>
                Signed in as <b>{session.email}</b>. Your workspace follows you to any device you
                sign in on.
              </p>
              <Button
                icon="LogOut"
                onClick={() => void mutate(() => post('/auth/signout', {}), 'Signed out')}
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <p>
                You are using a guest workspace tied to this browser. Create an account to keep
                everything you have made and reach it from other devices.
              </p>
              <Button primary icon="User" onClick={() => setDialog('signup')}>
                Create account or sign in
              </Button>
            </>
          )}
        </section>
      </div>
    </>
  );
}

interface DialogProps extends Pick<StudioApi, 'refresh' | 'notify'> {
  close: () => void;
}

interface KeyDialogProps extends DialogProps {
  session: Workspace;
}

export function KeyDialog({ session, close, refresh, notify }: KeyDialogProps) {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await post('/key', { key });
      await refresh();
      notify('API key saved. Live generation is now available.');
      close();
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    await api('/key', { method: 'DELETE' });
    await refresh();
    close();
  };

  return (
    <Modal title={session.connected ? 'Manage API key' : 'Connect API key'} close={close}>
      <p>
        Paste the API key copied from{' '}
        <a href="https://open.higgsfield.ai/api-keys" target="_blank" rel="noreferrer">
          open.higgsfield.ai
        </a>
        . Paste it as-is.
      </p>
      <form onSubmit={save}>
        <label htmlFor="provider-key">Higgsfield API key</label>
        <input
          id="provider-key"
          type="password"
          autoComplete="off"
          value={key}
          onChange={(event) => setKey(event.target.value)}
          placeholder="Paste your complete key"
          required
        />
        <small>
          Your key stays in an HTTP-only session cookie. Saving it does not verify access.
          Generation uses your provider credits.
        </small>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          {session.connected && <Button onClick={() => void remove()}>Remove API key</Button>}
          <Button primary type="submit" disabled={busy}>
            {busy ? 'Saving…' : session.connected ? 'Replace API key' : 'Connect API key'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

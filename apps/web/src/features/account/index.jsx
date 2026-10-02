import { useState } from 'react';
import { api, post, patch } from '../../lib/api';

import { Icon, Button, Modal, Heading } from '../../components/ui';
export function Pricing({ setDialog }) {
  const [annual, setAnnual] = useState(true);
  return (
    <>
      <Heading
        eyebrow="ROOM FOR EVERY IDEA"
        title="Create at your own pace."
        text="The preview workspace is free. Real AI generations use your Higgsfield API credits."
      />
      <div className="billing-toggle">
        <button className={!annual ? 'selected' : ''} onClick={() => setAnnual(false)}>
          Monthly
        </button>
        <button className={annual ? 'selected' : ''} onClick={() => setAnnual(true)}>
          Yearly <span>Save 20%</span>
        </button>
      </div>
      <div className="pricing-grid">
        {[
          [
            'Explorer',
            '0',
            'For finding your next creative direction.',
            [
              'Concept previews',
              'Project canvas',
              'Uploads and asset library',
              'Community publishing',
            ],
          ],
          [
            'Creator',
            annual ? '24' : '30',
            'For a steady stream of big ideas.',
            [
              'Everything in Explorer',
              'Image and video studio',
              'Provider key connection',
              'Full prompt and job history',
            ],
          ],
          [
            'Studio',
            annual ? '64' : '80',
            'For building a world of your own.',
            [
              'Everything in Creator',
              'Cinema planning tools',
              'Campaign brief builder',
              'Organized project libraries',
            ],
          ],
        ].map(([n, p, d, features], i) => (
          <div className={`price-card ${i === 1 ? 'featured' : ''}`} key={n}>
            {i === 1 && <span className="badge">MOST POPULAR</span>}
            <h2>{n}</h2>
            <p>{d}</p>
            <div className="price">
              ${p}
              <span>/ month</span>
            </div>
            <small>
              {i === 0
                ? 'Always free'
                : annual
                  ? 'Illustrative plan · billed yearly'
                  : 'Illustrative plan · billed monthly'}
            </small>
            <Button primary={i === 1} onClick={() => setDialog('key')}>
              {i === 0 ? 'Start creating' : 'Connect your provider'}
              <Icon name="ArrowUpRight" size={16} />
            </Button>
            <ul>
              {features.map((f) => (
                <li key={f}>
                  <Icon name="Check" size={16} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
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

export function Settings({ session, refresh, notify, setDialog }) {
  const [name, setName] = useState(session.name),
    [saving, setSaving] = useState(false);
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
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              try {
                await patch('/profile', { name });
                await refresh();
                notify('Profile updated');
              } catch (e) {
                notify(e.message);
              } finally {
                setSaving(false);
              }
            }}
          >
            <label>
              Display name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={60}
              />
            </label>
            <p>
              Your guest workspace is tied to an HTTP-only browser cookie. Keep this browser's
              cookies to retain access to your saved work.
            </p>
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
          <h2>Sign in</h2>
          <p>
            Public visitors can explore and create a guest workspace without signing in. ChatGPT
            sign-in is available through hosting; guest workspace ownership remains tied to this
            browser.
          </p>
          <a className="btn" href="/signin-with-chatgpt?return_to=/settings" target="_top">
            Sign in with ChatGPT <Icon name="ArrowUpRight" size={16} />
          </a>
        </section>
      </div>
    </>
  );
}

export function KeyDialog({ session, close, refresh, notify }) {
  const [key, setKey] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <Modal title={session.connected ? 'Manage API key' : 'Connect API key'} close={close}>
      <p>
        Paste the API key copied from{' '}
        <a href="https://open.higgsfield.ai/api-keys" target="_blank" rel="noreferrer">
          open.higgsfield.ai
        </a>
        . Paste it as-is.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await post('/key', { key });
            await refresh();
            notify('API key saved. Live generation is now available.');
            close();
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label htmlFor="provider-key">Higgsfield API key</label>
        <input
          id="provider-key"
          type="password"
          autoComplete="off"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Paste your complete key"
          required
        />
        <small>
          Your key stays in an HTTP-only session cookie. Saving it does not verify access.
          Generation uses your provider credits.
        </small>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          {session.connected && (
            <Button
              onClick={async () => {
                await api('/key', { method: 'DELETE' });
                await refresh();
                close();
              }}
            >
              Remove API key
            </Button>
          )}
          <Button primary type="submit" disabled={busy}>
            {busy ? 'Saving…' : session.connected ? 'Replace API key' : 'Connect API key'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

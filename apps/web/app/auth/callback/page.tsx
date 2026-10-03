'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { post } from '../../../lib/api';
import { messageOf } from '../../../lib/types';

type State =
  | { kind: 'working' }
  | { kind: 'reset'; accessToken: string }
  | { kind: 'failed'; message: string };

/**
 * Email links arrive with their access token in the URL fragment, which never
 * reaches the server, so this page reads it and hands it to the API.
 */
export default function AuthCallback() {
  const [state, setState] = useState<State>({ kind: 'working' });
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    window.history.replaceState(null, '', window.location.pathname);
    const accessToken = fragment.get('access_token');
    const failure = fragment.get('error_description');
    if (failure || !accessToken) {
      setState({
        kind: 'failed',
        message: failure ?? 'This link is invalid or has already been used.',
      });
      return;
    }
    if (fragment.get('type') === 'recovery') {
      setState({ kind: 'reset', accessToken });
      return;
    }
    post('/auth/link', { accessToken }).then(
      () => window.location.replace('/explore?auth=signed-in'),
      (reason: unknown) => setState({ kind: 'failed', message: messageOf(reason) }),
    );
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (state.kind !== 'reset') return;
    setBusy(true);
    setError('');
    try {
      await post('/auth/reset', { accessToken: state.accessToken, password });
      window.location.replace('/explore?auth=signed-in');
    } catch (failure) {
      setError(messageOf(failure));
      setBusy(false);
    }
  };

  return (
    <main className="auth-callback">
      <div className="modal">
        {state.kind === 'working' && <h2>Signing you in…</h2>}
        {state.kind === 'failed' && (
          <>
            <h2>That link did not work</h2>
            <p>{state.message}</p>
            <a className="btn primary" href="/explore?auth=signin">
              Back to log in
            </a>
          </>
        )}
        {state.kind === 'reset' && (
          <form onSubmit={save}>
            <h2>Choose a new password</h2>
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={200}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
            />
            <small>At least 8 characters.</small>
            {error && <p className="form-error">{error}</p>}
            <button className="btn primary" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save and log in'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

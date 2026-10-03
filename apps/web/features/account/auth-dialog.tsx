'use client';
import { useEffect, useState, type FormEvent } from 'react';
import type { AuthProviders, SignUpResult } from '@xfield/shared';
import { Button, Icon, Modal } from '../../components/ui';
import { ApiError, api, post } from '../../lib/api';
import { messageOf, type StudioApi } from '../../lib/types';

export type AuthMode = 'signin' | 'signup';
type Step = 'welcome' | 'email' | 'verify' | 'forgot' | 'sent';

const RESEND_SECONDS = 30;
const NO_PROVIDERS: AuthProviders = { verification: false, recovery: false, google: false };

interface AuthDialogProps extends Pick<StudioApi, 'refresh' | 'notify'> {
  initial: AuthMode;
  close: () => void;
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

export function AuthDialog({ initial, close, refresh, notify }: AuthDialogProps) {
  const [providers, setProviders] = useState<AuthProviders>(NO_PROVIDERS);
  const [step, setStep] = useState<Step>('welcome');
  const [mode, setMode] = useState<AuthMode>(initial);
  const [agreed, setAgreed] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api<AuthProviders>('/auth/providers').then(setProviders, () => setProviders(NO_PROVIDERS));
  }, []);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setBusy(false);
    }
  };

  const finish = async (message: string) => {
    await refresh();
    notify(message);
    close();
  };

  const goTo = (next: Step) => {
    setError('');
    setStep(next);
  };

  const submitEmail = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      if (mode === 'signin') {
        try {
          await post('/auth/signin', { email, password });
        } catch (failure) {
          // An account that was never verified continues at the code step.
          if (failure instanceof ApiError && failure.status === 403) {
            goTo('verify');
            return;
          }
          throw failure;
        }
        await finish('Welcome back');
        return;
      }
      const result = await post<SignUpResult>('/auth/signup', {
        email,
        password,
        acceptTerms: agreed,
      });
      if (result.pending) {
        setWait(RESEND_SECONDS);
        goTo('verify');
      } else await finish('Account created. Your work is saved to it.');
    });
  };

  const submitCode = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await post('/auth/verify', { email, code });
      await finish('Email verified. Your work is saved to your account.');
    });
  };

  const resend = () =>
    void run(async () => {
      await post('/auth/resend', { email });
      setWait(RESEND_SECONDS);
      notify('A new code is on its way');
    });

  const sendReset = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await post('/auth/recover', { email });
      goTo('sent');
    });
  };

  const terms = (
    <label className="auth-terms">
      <input
        type="checkbox"
        checked={agreed}
        onChange={(event) => setAgreed(event.target.checked)}
      />
      <span>I agree to the Terms of Service and Privacy Policy, and confirm I am 18 or older.</span>
    </label>
  );

  const titles: Record<Step, string> = {
    welcome: 'Welcome to Xfield',
    email: mode === 'signin' ? 'Log in' : 'Create your account',
    verify: 'Verify your email',
    forgot: 'Reset your password',
    sent: 'Check your inbox',
  };

  return (
    <Modal title={titles[step]} close={close}>
      <div className="auth-dialog">
        {step === 'welcome' && (
          <>
            <p className="auth-lead">
              Create images, video and audio. Anything you made as a guest moves into your account.
            </p>
            {providers.google && (
              <a
                className={`auth-provider ${agreed ? '' : 'disabled'}`}
                href={agreed ? '/api/auth/oauth/google' : undefined}
                aria-disabled={!agreed}
                onClick={(event) => {
                  if (!agreed) {
                    event.preventDefault();
                    setError('Tick the box below to continue.');
                  }
                }}
              >
                <GoogleMark /> Continue with Google
              </a>
            )}
            <button
              type="button"
              className="auth-provider"
              onClick={() => {
                if (!agreed && mode === 'signup') {
                  setError('Tick the box below to continue.');
                  return;
                }
                goTo('email');
              }}
            >
              <Icon name="Mail" /> Continue with Email
            </button>
            {terms}
            {error && <p className="form-error">{error}</p>}
            <p className="auth-switch">
              {mode === 'signup' ? 'Already have an account?' : 'New to Xfield?'}{' '}
              <button
                type="button"
                onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
              >
                {mode === 'signup' ? 'Log in' : 'Sign up'}
              </button>
            </p>
          </>
        )}

        {step === 'email' && (
          <form onSubmit={submitEmail}>
            <div className="auth-tabs" role="tablist">
              {(['signin', 'signup'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={mode === tab}
                  className={mode === tab ? 'active' : ''}
                  onClick={() => {
                    setMode(tab);
                    setError('');
                  }}
                >
                  {tab === 'signin' ? 'Log in' : 'Sign up'}
                </button>
              ))}
            </div>
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              maxLength={254}
              autoFocus
            />
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              maxLength={200}
            />
            {mode === 'signup' ? (
              <>
                <small>At least 8 characters.</small>
                {terms}
              </>
            ) : (
              providers.recovery && (
                <button type="button" className="auth-link" onClick={() => goTo('forgot')}>
                  Forgot password?
                </button>
              )
            )}
            {error && <p className="form-error">{error}</p>}
            <div className="modal-actions">
              <Button onClick={() => goTo('welcome')}>Back</Button>
              <Button primary type="submit" disabled={busy || (mode === 'signup' && !agreed)}>
                {busy ? 'One moment…' : mode === 'signin' ? 'Log in' : 'Create account'}
              </Button>
            </div>
          </form>
        )}

        {step === 'verify' && (
          <form onSubmit={submitCode}>
            <p>
              We sent a verification code to <b>{email}</b>. Enter it below, or open the link in
              that email.
            </p>
            <label htmlFor="auth-code">Verification code</label>
            <input
              id="auth-code"
              className="auth-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6,10}"
              maxLength={10}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
              required
              autoFocus
            />
            {error && <p className="form-error">{error}</p>}
            <div className="modal-actions">
              <Button disabled={busy || wait > 0} onClick={resend}>
                {wait > 0 ? `Resend in ${wait}` : 'Resend code'}
              </Button>
              <Button primary type="submit" disabled={busy || code.length < 6}>
                {busy ? 'Verifying…' : 'Verify'}
              </Button>
            </div>
          </form>
        )}

        {step === 'forgot' && (
          <form onSubmit={sendReset}>
            <p>Enter your account email and we will send you a link to set a new password.</p>
            <label htmlFor="auth-reset-email">Email</label>
            <input
              id="auth-reset-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              maxLength={254}
              autoFocus
            />
            {error && <p className="form-error">{error}</p>}
            <div className="modal-actions">
              <Button onClick={() => goTo('email')}>Back</Button>
              <Button primary type="submit" disabled={busy}>
                {busy ? 'Sending…' : 'Send reset link'}
              </Button>
            </div>
          </form>
        )}

        {step === 'sent' && (
          <>
            <p>
              If an account exists for <b>{email}</b>, a reset link is on its way. Open it on this
              device to choose a new password.
            </p>
            <div className="modal-actions">
              <Button primary onClick={close}>
                Done
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

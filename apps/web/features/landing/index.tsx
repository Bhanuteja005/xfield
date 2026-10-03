'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { MainNav, PromoBanner, usePromoBanner } from '../../components/studio/nav';
import { Icon } from '../../components/ui';
import { media, tools } from '../../lib/data';
import type { RouteTarget, Seed } from '../../lib/types';

const KINDS = ['image', 'video'] as const;
type Kind = (typeof KINDS)[number];

const samplePrompts = [
  'A lighthouse keeper watching a storm roll in, 35mm film',
  'Slow orbit around a perfume bottle on wet black stone',
  'Paper-cut city at dawn, soft pastel light',
];

/** Icon, title and description of each step. */
const steps: [string, string, string][] = [
  [
    'Pencil',
    'Describe it',
    'Start from a sentence, a reference image or a ready-made direction. No blank-page panic.',
  ],
  [
    'WandSparkles',
    'Direct it',
    'Pick the model, frame, length and camera move. Every choice stays with the result so you can reuse it.',
  ],
  [
    'FolderOpen',
    'Keep it',
    'Results land in your library. Sort them into folders, pin them to a canvas or publish the good ones.',
  ],
];

/** Name, price and description of each plan. */
const plans: [string, string, string][] = [
  ['Explorer', 'Free', 'Concept previews, canvas and library. No card, no account.'],
  ['Creator', 'Your key', 'Connect a provider key and generate real images and video at cost.'],
  ['Studio', 'Teams', 'Shared projects and review. On the roadmap, not for sale yet.'],
];

const faqs: [string, string][] = [
  [
    'Do I need an account?',
    'No. A private guest workspace is created the first time you open the studio and stays with this browser.',
  ],
  [
    'Is the output really AI-generated?',
    'Only in live mode. Preview mode draws a labelled placeholder so you can try the whole workflow for free. Live mode sends your prompt to the provider using your own API key.',
  ],
  [
    'Where is my API key stored?',
    'In an HTTP-only cookie that page scripts cannot read. It is sent to our server only so the server can call the provider for you, and it is never written to the database.',
  ],
  [
    'Who can see what I make?',
    'Only you. Uploads and results are private to your workspace until you choose to publish one, and you can take it back at any time.',
  ],
];

export function Landing() {
  const router = useRouter();
  // A prompt travels to the studio in the query string, where the shell picks it up.
  const go = (target: RouteTarget, data?: Pick<Seed, 'prompt' | 'model'> | null) => {
    if (target === 'home') return router.push('/');
    const query = new URLSearchParams();
    if (data?.prompt) query.set('prompt', data.prompt);
    if (data?.model) query.set('model', data.model);
    const rest = query.toString();
    router.push(`/${target}${rest ? `?${rest}` : ''}`);
  };
  const banner = usePromoBanner(true);
  const [prompt, setPrompt] = useState('');
  const [kind, setKind] = useState<Kind>('image');
  const start = (event: FormEvent) => {
    event.preventDefault();
    go(kind, prompt.trim() ? { prompt: prompt.trim() } : null);
  };
  return (
    <div className={`landing ${banner.shown ? 'with-banner' : ''}`}>
      {banner.shown && (
        <PromoBanner
          onSignUp={() => router.push('/explore?auth=signup')}
          dismiss={banner.dismiss}
        />
      )}
      <header className="landing-nav">
        <button className="brand" onClick={() => go('home')}>
          <span className="brand-icon">×</span>
          <span>
            xfield<span className="brand-dot">.</span>
          </span>
        </button>
        <MainNav active="" go={go} />
        <div className="landing-auth">
          <a className="landing-pricing" href="/pricing">
            <Icon name="Gem" size={15} /> Pricing
          </a>
          <a href="/explore?auth=signin">Login</a>
          <a className="landing-cta small" href="/explore?auth=signup">
            Sign up
          </a>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-wall" aria-hidden="true">
          {media.slice(0, 8).map((item) => (
            <img key={item.id} src={item.image} alt="" loading="lazy" />
          ))}
        </div>
        <div className="landing-hero-copy">
          <span className="landing-tag">
            <span className="live-dot" /> Free to try · no sign-up
          </span>
          <h1>
            From a sentence
            <br />
            to a <em>finished shot</em>.
          </h1>
          <p>
            One workspace for images, video, campaigns and the messy thinking in between. Sketch
            ideas for free, then switch on real generation when you are ready.
          </p>
          <form className="landing-prompt" onSubmit={start}>
            <div className="landing-kind" role="group" aria-label="Output type">
              {KINDS.map((option) => (
                <button
                  type="button"
                  key={option}
                  aria-pressed={kind === option}
                  className={kind === option ? 'selected' : ''}
                  onClick={() => setKind(option)}
                >
                  <Icon name={option === 'image' ? 'Image' : 'Video'} size={15} />
                  {option === 'image' ? 'Image' : 'Video'}
                </button>
              ))}
            </div>
            <input
              aria-label="Describe what you want to create"
              placeholder="Describe what you want to create…"
              value={prompt}
              maxLength={2000}
              onChange={(event) => setPrompt(event.target.value)}
            />
            <button className="landing-cta" type="submit">
              Create <Icon name="Sparkles" size={16} />
            </button>
          </form>
          <div className="landing-samples">
            <span>Try</span>
            {samplePrompts.map((sample) => (
              <button key={sample} onClick={() => setPrompt(sample)}>
                {sample}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section" id="studios">
        <span className="eyebrow lime">ONE WORKSPACE</span>
        <h2>Every tool, one door.</h2>
        <p className="landing-lead">
          Stop exporting between five apps. Each studio shares the same library, history and canvas.
        </p>
        <div className="tool-grid">
          {tools.map(([route, name, description, icon, tag]) => (
            <button className="tool-card" key={route} onClick={() => go(route)}>
              <div>
                <Icon name={icon} size={23} />
                {tag && <span className="badge">{tag}</span>}
              </div>
              <b>{name}</b>
              <p>{description}</p>
              <Icon name="ArrowUpRight" className="tool-arrow" size={17} />
            </button>
          ))}
        </div>
      </section>

      <section className="landing-section" id="how">
        <span className="eyebrow lime">HOW IT WORKS</span>
        <h2>Three steps. No manual.</h2>
        <ol className="landing-steps">
          {steps.map(([icon, title, text], index) => (
            <li key={title}>
              <span className="landing-step-index">0{index + 1}</span>
              <Icon name={icon} size={22} />
              <b>{title}</b>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-section landing-showcase">
        <div>
          <span className="eyebrow lime">START FROM SOMETHING</span>
          <h2>Borrow a direction, make it yours.</h2>
          <p className="landing-lead">
            Open any sample to see the prompt behind it, then reuse it in one click.
          </p>
          <button className="landing-cta" onClick={() => go('explore')}>
            Browse inspiration <Icon name="ArrowRight" size={16} />
          </button>
        </div>
        <div className="landing-showcase-grid">
          {media.slice(2, 8).map((item) => (
            <button
              key={item.id}
              onClick={() => go('image', { prompt: item.prompt })}
              aria-label={`Use the prompt for ${item.name}`}
            >
              <img src={item.image} alt={item.name} loading="lazy" />
              <span>{item.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="landing-section landing-honest">
        <Icon name="CheckCircle2" size={30} />
        <div>
          <h2>Clear about what is real.</h2>
          <p>
            Preview mode is free and produces a labelled placeholder, never passed off as AI output.
            Live mode uses your own provider key for real image and video generation. Payments, team
            seats and cross-device accounts are not built yet, and the app says so.
          </p>
        </div>
      </section>

      <section className="landing-section" id="plans">
        <span className="eyebrow lime">PLANS</span>
        <h2>Pay for output, not for looking around.</h2>
        <div className="landing-plans">
          {plans.map(([name, price, text]) => (
            <article key={name}>
              <small>{name}</small>
              <b>{price}</b>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <button className="landing-link" onClick={() => go('pricing')}>
          Compare plans <Icon name="ArrowRight" size={15} />
        </button>
      </section>

      <section className="landing-section" id="faq">
        <span className="eyebrow lime">QUESTIONS</span>
        <h2>Before you start.</h2>
        <div className="landing-faq">
          {faqs.map(([question, answer]) => (
            <details key={question}>
              <summary>
                {question}
                <Icon name="Plus" size={17} />
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="landing-final">
        <h2>Your first idea is thirty seconds away.</h2>
        <button className="landing-cta" onClick={() => go('image')}>
          Start creating <Icon name="ArrowUpRight" size={16} />
        </button>
      </section>

      <footer className="landing-footer">
        <span className="brand">xfield.</span>
        <button onClick={() => go('academy')}>Help & guides</button>
        <button onClick={() => go('community')}>Community</button>
        <button onClick={() => go('pricing')}>Plans</button>
        <span>© 2026 Xfield · Independent product rebuild, not affiliated with Higgsfield</span>
      </footer>
    </div>
  );
}

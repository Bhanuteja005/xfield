'use client';
import { useState } from 'react';
import {
  AtSign,
  Brush,
  Briefcase,
  Camera,
  ChevronLeft,
  Clapperboard,
  DollarSign,
  Ellipsis,
  Film,
  Frown,
  Gauge,
  Image as ImageIcon,
  Maximize2,
  Megaphone,
  MessageSquare,
  MessagesSquare,
  Mic,
  Music,
  Newspaper,
  PanelsTopLeft,
  Play,
  Search,
  Shuffle,
  Sparkles,
  ThumbsUp,
  TrendingUp,
  UserRound,
  Users,
  Video,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { post } from '../../lib/api';
import { media } from '../../lib/data';
import { messageOf } from '../../lib/types';

interface Option {
  value: string;
  label: string;
  text?: string;
  icon?: LucideIcon;
  /** Number of filled dots on the experience cards. */
  level?: number;
}

interface Step {
  id: string;
  title: string;
  subtitle: string;
  layout: 'pair' | 'grid2' | 'grid3' | 'list' | 'cards';
  multi?: boolean;
  /** Shows a sample result beside the question on wide screens. */
  showcase?: boolean;
  options: Option[];
}

const STEPS: Step[] = [
  {
    id: 'use',
    title: 'How do you plan to use Xfield?',
    subtitle: 'We will tailor features and AI tools to your goals',
    layout: 'pair',
    options: [
      {
        value: 'personal',
        label: 'For personal use',
        text: 'For individuals who want to build and experiment with their own projects',
        icon: Sparkles,
      },
      {
        value: 'team',
        label: 'With my team',
        text: 'For organizations that want to collaborate and create at scale',
        icon: Users,
      },
    ],
  },
  {
    id: 'experience',
    title: 'How experienced are you with AI?',
    subtitle: 'We will adapt the interface to match your experience',
    layout: 'grid2',
    options: [
      {
        value: 'beginner',
        label: 'Beginner',
        text: 'Simple interface with ready-made templates',
        level: 1,
      },
      {
        value: 'intermediate',
        label: 'Intermediate',
        text: 'Fast workflows for trend-ready content',
        level: 2,
      },
      {
        value: 'advanced',
        label: 'Advanced',
        text: 'Consistent, brand-safe assets for client work',
        level: 3,
      },
      {
        value: 'expert',
        label: 'Expert',
        text: 'Full creative control with director tools',
        level: 4,
      },
    ],
  },
  {
    id: 'create',
    title: 'What do you want to create?',
    subtitle: 'Choose as many options as you want',
    layout: 'grid3',
    multi: true,
    options: [
      { value: 'video', label: 'Video generation', icon: Video },
      { value: 'image', label: 'Image generation', icon: ImageIcon },
      { value: 'upscale', label: 'Upscale', icon: Maximize2 },
      { value: 'cinematic', label: 'Cinematic visuals', icon: Clapperboard },
      { value: 'storyboard', label: 'Storyboarding', icon: PanelsTopLeft },
      { value: 'film', label: 'Filmmaking & VFX', icon: Film },
      { value: 'ads', label: 'Commercial & ad videos', icon: Megaphone },
      { value: 'social', label: 'Social media content', icon: TrendingUp },
      { value: 'editing', label: 'Image editing & inpaint', icon: Brush },
      { value: 'lipsync', label: 'Lipsync & talking avatars', icon: Mic },
      { value: 'avatars', label: 'Realistic AI avatars', icon: UserRound },
    ],
  },
  {
    id: 'source',
    title: 'How did you hear about us?',
    subtitle: 'This helps us improve our product',
    layout: 'list',
    showcase: true,
    options: [
      { value: 'instagram', label: 'Instagram', icon: Camera },
      { value: 'x', label: 'Twitter / X', icon: AtSign },
      { value: 'tiktok', label: 'TikTok', icon: Music },
      { value: 'youtube', label: 'YouTube', icon: Play },
      { value: 'google', label: 'Google Search', icon: Search },
      { value: 'linkedin', label: 'LinkedIn', icon: Briefcase },
      { value: 'chatgpt', label: 'ChatGPT', icon: MessageSquare },
      { value: 'reddit', label: 'Reddit', icon: MessagesSquare },
      { value: 'facebook', label: 'Facebook', icon: ThumbsUp },
      { value: 'news', label: 'News / articles', icon: Newspaper },
      { value: 'friend', label: 'Word of mouth', icon: Users },
      { value: 'other', label: 'Other', icon: Ellipsis },
    ],
  },
  {
    id: 'frustration',
    title: 'Last question. What frustrates you most about AI content generation?',
    subtitle: 'We will focus on delivering what matters most to you',
    layout: 'cards',
    showcase: true,
    options: [
      { value: 'cost', label: 'High cost of top models', icon: DollarSign },
      { value: 'limits', label: 'Limited generations', icon: Gauge },
      { value: 'quality', label: 'Not production-ready outputs', icon: Wrench },
      { value: 'inconsistent', label: 'Inconsistent results', icon: Shuffle },
      { value: 'confusing', label: 'AI is confusing to me', icon: Frown },
      { value: 'other', label: 'Other', icon: Ellipsis },
    ],
  },
];

const SHOWCASE = (media[2] ?? media[0]) as (typeof media)[number];

interface OnboardingProps {
  /** Called after the answers are saved. */
  done: () => Promise<void>;
}

export function Onboarding({ done }: OnboardingProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const step = STEPS[index] as Step;
  const picked = answers[step.id];
  const selected = (value: string) =>
    Array.isArray(picked) ? picked.includes(value) : picked === value;

  const submit = async (final: Record<string, string | string[]>) => {
    setSaving(true);
    setError('');
    try {
      await post('/onboarding', { answers: final });
      await done();
    } catch (failure) {
      setError(messageOf(failure));
      setSaving(false);
    }
  };

  const advance = (next: Record<string, string | string[]>) => {
    if (index === STEPS.length - 1) void submit(next);
    else setIndex(index + 1);
  };

  const choose = (value: string) => {
    if (saving) return;
    if (step.multi) {
      // Functional update, so taps in quick succession all count.
      setAnswers((previous) => {
        const existing = previous[step.id];
        const current = Array.isArray(existing) ? existing : [];
        const next = current.includes(value)
          ? current.filter((entry) => entry !== value)
          : [...current, value];
        return { ...previous, [step.id]: next };
      });
      return;
    }
    const next = { ...answers, [step.id]: value };
    setAnswers(next);
    advance(next);
  };

  const canContinue = Array.isArray(picked) && picked.length > 0;

  return (
    <div className="onboarding" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="onboarding-progress" aria-hidden="true">
        <span style={{ width: `${((index + 1) / STEPS.length) * 100}%` }} />
      </div>
      <div className="onboarding-top">
        {index > 0 ? (
          <button onClick={() => setIndex(index - 1)} disabled={saving}>
            <ChevronLeft size={16} /> Back
          </button>
        ) : (
          <span />
        )}
        <span className="onboarding-count">
          {index + 1} of {STEPS.length}
        </span>
      </div>
      <div className={`onboarding-body ${step.showcase ? 'split' : ''}`}>
        <div className="onboarding-question">
          <h1 id="onboarding-title">{step.title}</h1>
          <p>{step.subtitle}</p>
          <div className={`onboarding-options ${step.layout}`} role="group" aria-label={step.title}>
            {step.options.map(({ value, label, text, icon: Glyph, level }) => (
              <button
                key={value}
                type="button"
                className={`onboarding-option ${selected(value) ? 'selected' : ''}`}
                aria-pressed={selected(value)}
                onClick={() => choose(value)}
              >
                <span
                  className={`onboarding-check ${step.multi ? 'square' : ''}`}
                  aria-hidden="true"
                />
                {Glyph && (
                  <span className="onboarding-icon">
                    <Glyph size={step.layout === 'pair' ? 22 : 18} />
                  </span>
                )}
                {level && (
                  <span className="onboarding-dots" aria-hidden="true">
                    {[1, 2, 3, 4].map((dot) => (
                      <i key={dot} className={dot <= level ? 'on' : ''} />
                    ))}
                  </span>
                )}
                <span className="onboarding-label">
                  <b>{label}</b>
                  {text && <em>{text}</em>}
                </span>
              </button>
            ))}
          </div>
          {step.multi && (
            <button
              className="onboarding-continue"
              disabled={!canContinue || saving}
              onClick={() => advance(answers)}
            >
              Continue
            </button>
          )}
          {saving && <p className="onboarding-status">Saving your answers…</p>}
          {error && (
            <p className="form-error" role="alert">
              {error}{' '}
              <button className="auth-link" onClick={() => void submit(answers)}>
                Try again
              </button>
            </p>
          )}
        </div>
        {step.showcase && (
          <figure className="onboarding-showcase" aria-hidden="true">
            <img src={SHOWCASE.image} alt="" />
            <figcaption>
              <p>{SHOWCASE.prompt}</p>
              <span>
                <i>Soul 2</i>
                <i>9:16</i>
                <i>High quality</i>
              </span>
            </figcaption>
          </figure>
        )}
      </div>
    </div>
  );
}

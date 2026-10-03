import { useEffect, useState } from 'react';
import { Button, Empty, Gallery, Heading, Icon } from '../../components/ui';
import { api } from '../../lib/api';
import { media } from '../../lib/data';
import type { SectionName } from '../../lib/sections';
import { messageOf, type CommunityItem, type MediaSample, type StudioApi } from '../../lib/types';

const APP_CATEGORIES = [
  'All',
  'Professional',
  'Enhance & style',
  'Ads & products',
  'Fashion',
  'Video',
  'Audio',
];

/** Name, category, description, route and the index of the sample that illustrates it. */
const APPS: [string, string, string, SectionName, number][] = [
  ['Angles', 'Professional', 'Explore a different perspective.', 'image', 0],
  ['Mixed media', 'Enhance & style', 'Give your ideas a new texture.', 'video', 3],
  ['Product shots', 'Ads & products', 'Put your product in the spotlight.', 'marketing', 10],
  ['Fashion factory', 'Fashion', 'Create your next editorial.', 'image', 8],
  ['Motion control', 'Video', 'Direct how your story moves.', 'video', 5],
  ['Image upscale', 'Professional', 'Explore finer visual details.', 'image', 7],
  ['Voiceover', 'Audio', 'Find the words. Find the voice.', 'audio', 2],
  ['Moodboard', 'Professional', 'Collect a world of inspiration.', 'canvas', 1],
  ['Vibe motion', 'Video', 'Bring an idea into motion.', 'video', 4],
  ['Portrait studio', 'Fashion', 'A new look for every story.', 'image', 2],
  ['Campaign builder', 'Ads & products', 'One product, three creative routes.', 'marketing', 10],
  ['Cinematic frames', 'Video', 'Compose your next scene.', 'cinema', 6],
];

const PREVIEW_ONLY_APPS = ['Angles', 'Image upscale', 'Fashion factory', 'Motion control'];

export function Apps({ go, search }: Pick<StudioApi, 'go' | 'search'>) {
  const [category, setCategory] = useState('All');
  const query = search.toLowerCase();
  const visible = APPS.filter(
    ([name, appCategory]) =>
      (category === 'All' || appCategory === category) && name.toLowerCase().includes(query),
  );
  return (
    <>
      <Heading
        eyebrow="MORE WAYS TO MAKE IT YOURS"
        title="A tool for every kind of idea."
        text="Explore creative workflows, from a quick visual to your next campaign."
      />
      <div className="chips category-chips">
        {APP_CATEGORIES.map((option) => (
          <button
            key={option}
            className={category === option ? 'selected' : ''}
            onClick={() => setCategory(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="apps-grid">
        {visible.map(([name, appCategory, description, route, sampleIndex]) => {
          const sample = media[sampleIndex];
          return (
            <article className="app-card" key={name}>
              <img src={sample?.image} alt={name + ' inspiration'} />
              <span className="badge">{appCategory}</span>
              <h3>{name}</h3>
              <p>{description}</p>
              <Button
                onClick={() =>
                  go(route, {
                    prompt: sample?.prompt,
                    preset: name === 'Mixed media' ? 'Mixed media' : 'General',
                  })
                }
              >
                Try workflow <Icon name="ArrowUpRight" size={15} />
              </Button>
              <small>
                {PREVIEW_ONLY_APPS.includes(name)
                  ? 'Creative direction preview; specialized AI processing is not connected.'
                  : 'Open this workflow in your studio.'}
              </small>
            </article>
          );
        })}
      </div>
      {!visible.length && (
        <Empty icon="Search" title="No tools found" text="Try another search or category." />
      )}
    </>
  );
}

const COMMUNITY_LABEL = 'Community';
const COMMUNITY_CATEGORIES = [
  'All',
  COMMUNITY_LABEL,
  'Cinematic',
  'Fashion',
  'Products',
  'Landscape',
  'Art',
];

type CommunityEntry = CommunityItem | MediaSample;

// Published workspace assets carry no category, so they get a filter of their own.
const matchesCategory = (entry: CommunityEntry, category: string) =>
  category === 'All' ||
  ('category' in entry ? entry.category === category : category === COMMUNITY_LABEL);

export function Community({
  setDetail,
  search,
  notify,
}: Pick<StudioApi, 'setDetail' | 'search' | 'notify'>) {
  const [category, setCategory] = useState('All');
  const [published, setPublished] = useState<CommunityItem[]>([]);
  useEffect(() => {
    let active = true;
    api<CommunityItem[]>('/community')
      .then((items) => active && setPublished(items))
      .catch((error: unknown) => active && notify(messageOf(error)));
    return () => {
      active = false;
    };
  }, [notify]);
  const query = search.toLowerCase();
  const entries = [...published, ...media].filter(
    (entry) =>
      matchesCategory(entry, category) &&
      `${entry.name} ${entry.prompt}`.toLowerCase().includes(query),
  );
  return (
    <>
      <Heading
        eyebrow="CREATE. SHARE. INSPIRE."
        title="Made by curious minds."
        text="A world of ideas, and a little inspiration for your next one."
      />
      <div className="library-toolbar">
        <div className="chips">
          {COMMUNITY_CATEGORIES.map((option) => (
            <button
              key={option}
              onClick={() => setCategory(option)}
              className={category === option ? 'selected' : ''}
            >
              {option}
            </button>
          ))}
        </div>
        <span>Curated inspiration + community creations</span>
      </div>
      <Gallery items={entries} setDetail={setDetail} />
      {!entries.length && (
        <Empty icon="Search" title="No creations found" text="Try another search or filter." />
      )}
      <p className="gallery-note">
        Curated photographs illustrate creative directions. They are not presented as AI-generated
        results.
      </p>
    </>
  );
}

/** Title, advice, route to try it in and the index of the sample that illustrates it. */
const GUIDES: [string, string, SectionName, number][] = [
  [
    'Write a prompt that paints a picture',
    'Start with your subject, describe the environment, then add lighting, mood and camera direction. Specific details give a model a clearer creative brief.',
    'image',
    0,
  ],
  [
    'Think like a director',
    'Choose one camera motion per shot. Establish the subject and the starting frame, then describe the change you want to see over time.',
    'cinema',
    6,
  ],
  [
    'Build a campaign with a point of view',
    'Define your audience and one goal. Choose a visual direction, then create a hero shot, a lifestyle frame and a detail shot that tell the same story.',
    'marketing',
    10,
  ],
  [
    'Keep your ideas connected',
    'Use Canvas for reference images and notes. Save a project before leaving, and keep every prompt close to the visual it inspired.',
    'canvas',
    1,
  ],
];

export function Academy({ go }: Pick<StudioApi, 'go'>) {
  return (
    <>
      <Heading
        eyebrow="KEEP YOUR CURIOSITY CLOSE"
        title="A little guidance. A lot of possibility."
        text="Learn the essentials and make your next creation a little better."
      />
      <div className="academy-grid">
        {GUIDES.map(([title, advice, route, sampleIndex]) => (
          <article key={title}>
            <img src={media[sampleIndex]?.image} alt="Creative guide inspiration" />
            <h2>{title}</h2>
            <p>{advice}</p>
            <Button onClick={() => go(route)}>
              Try it in the studio <Icon name="ArrowRight" size={16} />
            </Button>
          </article>
        ))}
      </div>
    </>
  );
}

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { media } from '../../lib/data';
import { Icon, Button, Empty, Gallery, Heading } from '../../components/ui';
export function Apps({ go, search }) {
  const [category, setCategory] = useState('All');
  const apps = [
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
  const visible = apps.filter(
    (a) =>
      (category === 'All' || a[1] === category) &&
      a[0].toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <Heading
        eyebrow="MORE WAYS TO MAKE IT YOURS"
        title="A tool for every kind of idea."
        text="Explore creative workflows, from a quick visual to your next campaign."
      />
      <div className="chips category-chips">
        {[
          'All',
          'Professional',
          'Enhance & style',
          'Ads & products',
          'Fashion',
          'Video',
          'Audio',
        ].map((c) => (
          <button
            key={c}
            className={category === c ? 'selected' : ''}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="apps-grid">
        {visible.map(([n, c, d, r, i]) => (
          <article className="app-card" key={n}>
            <img src={media[i].image} alt={n + ' inspiration'} />
            <span className="badge">{c}</span>
            <h3>{n}</h3>
            <p>{d}</p>
            <Button
              onClick={() =>
                go(r, {
                  prompt: media[i].prompt,
                  preset: n === 'Mixed media' ? 'Mixed media' : 'General',
                })
              }
            >
              Try workflow <Icon name="ArrowUpRight" size={15} />
            </Button>
            <small>
              {['Angles', 'Image upscale', 'Fashion factory', 'Motion control'].includes(n)
                ? 'Creative direction preview; specialized AI processing is not connected.'
                : 'Open this workflow in your studio.'}
            </small>
          </article>
        ))}
      </div>
      {!visible.length && (
        <Empty icon="Search" title="No tools found" text="Try another search or category." />
      )}
    </>
  );
}

export function Community({ setDetail, search, notify }) {
  const [category, setCategory] = useState('All'),
    [published, setPublished] = useState([]);
  useEffect(() => {
    api('/community')
      .then(setPublished)
      .catch((e) => notify(e.message));
  }, []);
  const entries = [...published, ...media].filter(
    (m) =>
      (category === 'All' || m.category === category || m.kind === category.toLowerCase()) &&
      `${m.name} ${m.prompt}`.toLowerCase().includes(search.toLowerCase()),
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
          {['All', 'Cinematic', 'Fashion', 'Products', 'Landscape', 'Art'].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={category === c ? 'selected' : ''}
            >
              {c}
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

export function Academy({ go }) {
  return (
    <>
      <Heading
        eyebrow="KEEP YOUR CURIOSITY CLOSE"
        title="A little guidance. A lot of possibility."
        text="Learn the essentials and make your next creation a little better."
      />
      <div className="academy-grid">
        {[
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
        ].map(([h, p, r, i]) => (
          <article key={h}>
            <img src={media[i].image} alt="Creative guide inspiration" />
            <h2>{h}</h2>
            <p>{p}</p>
            <Button onClick={() => go(r)}>
              Try it in the studio <Icon name="ArrowRight" size={16} />
            </Button>
          </article>
        ))}
      </div>
    </>
  );
}

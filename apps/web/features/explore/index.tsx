import { Button, Gallery, Icon } from '../../components/ui';
import { media, tools } from '../../lib/data';
import type { StudioApi } from '../../lib/types';

export function Explore({ go, search, setDetail }: Pick<StudioApi, 'go' | 'search' | 'setDetail'>) {
  const videoHero = media[0];
  const imageHero = media[2];
  const query = search.toLowerCase();
  const matches = media.filter((item) =>
    `${item.name} ${item.category} ${item.prompt}`.toLowerCase().includes(query),
  );
  return (
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
          onClick={() => go('video', { prompt: videoHero?.prompt, preset: 'Orbit' })}
        >
          <img src={videoHero?.image} alt="Earth seen from space" />
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
          <button className="hero" onClick={() => go('image', { prompt: imageHero?.prompt })}>
            <img src={imageHero?.image} alt="Editorial fashion portrait" />
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
        <Gallery items={matches} setDetail={setDetail} />
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
      <footer>
        <span className="brand">xfield.</span>
        <p>Made for the things you haven&apos;t imagined yet.</p>
        <button onClick={() => go('home')}>About Xfield</button>
        <button onClick={() => go('academy')}>Help & guides</button>
        <span>© 2026 Xfield · Independent rebuild</span>
      </footer>
    </>
  );
}

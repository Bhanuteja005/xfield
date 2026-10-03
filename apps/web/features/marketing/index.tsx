import { useState } from 'react';
import { Button, Heading, Icon } from '../../components/ui';
import { media } from '../../lib/data';
import { downloadText } from '../../lib/download';
import type { StudioApi } from '../../lib/types';

const STEPS = ['Your brand', 'Creative direction', 'Campaign brief'];

/** Style name and the index of the sample that illustrates it. */
const STYLES: [string, number][] = [
  ['Editorial', 2],
  ['Minimal', 10],
  ['Bold & vibrant', 3],
  ['Lifestyle', 4],
];

/** Idea title and the art direction appended to its prompt. */
const IDEAS: [string, string][] = [
  ['Hero product shot', 'Show the product as the hero.'],
  ['An everyday moment', 'Natural lifestyle context.'],
  ['A detail worth noticing', 'Macro product details.'],
];

const INSPIRATION_SAMPLE = 10;

export function Marketing({ go, notify }: Pick<StudioApi, 'go' | 'notify'>) {
  const [step, setStep] = useState(1);
  const [brand, setBrand] = useState('');
  const [product, setProduct] = useState('');
  const [audience, setAudience] = useState('');
  const [goal, setGoal] = useState('Product launch');
  const [style, setStyle] = useState('Editorial');
  const [format, setFormat] = useState('9:16');
  return (
    <>
      <Heading
        eyebrow="MAKE YOUR NEXT BIG THING"
        title="Marketing studio"
        text="From a product to a campaign, with a little creative direction."
      />
      <div className="marketing-layout">
        <div className="campaign-panel">
          <div className="steps">
            {STEPS.map((label, index) => (
              <button
                className={step === index + 1 ? 'selected' : ''}
                key={label}
                onClick={() => {
                  // Later steps build prompts from the brief, so it must be filled in first.
                  if (index > 0 && (!brand || !product))
                    notify('Add your brand and product first.');
                  else setStep(index + 1);
                }}
              >
                <span>{index + 1}</span>
                {label}
              </button>
            ))}
          </div>
          {step === 1 && (
            <>
              <h2>Tell us what you're making.</h2>
              <label>
                Brand name
                <input
                  value={brand}
                  onChange={(event) => setBrand(event.target.value)}
                  placeholder="e.g. Form Studio"
                />
              </label>
              <label>
                Product or service
                <textarea
                  value={product}
                  onChange={(event) => setProduct(event.target.value)}
                  placeholder="Describe the product and what makes it special…"
                />
              </label>
              <label>
                Who's it for?
                <input
                  value={audience}
                  onChange={(event) => setAudience(event.target.value)}
                  placeholder="e.g. Design-conscious professionals"
                />
              </label>
              <label>
                Campaign goal
                <select value={goal} onChange={(event) => setGoal(event.target.value)}>
                  <option>Product launch</option>
                  <option>Brand awareness</option>
                  <option>Social engagement</option>
                  <option>Conversions</option>
                </select>
              </label>
              <Button
                primary
                onClick={() => {
                  if (!brand || !product) notify('Add your brand and product first.');
                  else setStep(2);
                }}
              >
                Choose direction <Icon name="ArrowRight" size={16} />
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <h2>Set the mood.</h2>
              <div className="style-grid">
                {STYLES.map(([name, sampleIndex]) => (
                  <button
                    className={style === name ? 'selected' : ''}
                    key={name}
                    onClick={() => setStyle(name)}
                  >
                    <img src={media[sampleIndex]?.image} alt={name} />
                    <b>{name}</b>
                  </button>
                ))}
              </div>
              <label>
                Format
                <select value={format} onChange={(event) => setFormat(event.target.value)}>
                  <option>9:16</option>
                  <option>1:1</option>
                  <option>16:9</option>
                </select>
              </label>
              <Button primary onClick={() => setStep(3)}>
                Build my brief <Icon name="ArrowRight" size={16} />
              </Button>
            </>
          )}
          {step === 3 && (
            <>
              <span className="badge">YOUR CAMPAIGN BRIEF</span>
              <h2>
                {brand || 'Your brand'} / {goal}
              </h2>
              <p className="brief-copy">
                {product || 'Describe your product to complete this brief.'}
              </p>
              <div className="brief-facts">
                <label>
                  Audience<b>{audience || 'Everyone with a great eye'}</b>
                </label>
                <label>
                  Direction<b>{style}</b>
                </label>
                <label>
                  Deliverable<b>{format} social campaign</b>
                </label>
              </div>
              <h3>Three ideas to start with</h3>
              {IDEAS.map(([title, direction], index) => (
                <button
                  className="brief-idea"
                  key={title}
                  onClick={() =>
                    go('image', {
                      prompt: `${title} for ${brand}. ${product}. ${style} campaign photography for ${audience}. Format ${format}. ${direction}`,
                    })
                  }
                >
                  <span>0{index + 1}</span>
                  <b>{title}</b>
                  <Icon name="ArrowUpRight" />
                </button>
              ))}
              <Button
                icon="Download"
                onClick={() =>
                  downloadText(
                    `${brand} campaign brief.txt`,
                    `${brand}\n${goal}\n${product}\nAudience: ${audience}\nStyle: ${style}\nFormat: ${format}`,
                  )
                }
              >
                Download brief
              </Button>
            </>
          )}
        </div>
        <div className="campaign-inspiration">
          <img src={media[INSPIRATION_SAMPLE]?.image} alt="Product campaign inspiration" />
          <span className="pill">YOUR PRODUCT, A NEW PERSPECTIVE</span>
          <div>
            <h2>
              Small details.
              <br />
              Big impact.
            </h2>
            <p>Build a campaign with a consistent point of view.</p>
          </div>
        </div>
      </div>
    </>
  );
}

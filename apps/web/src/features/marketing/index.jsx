import { useState } from 'react';

import { media } from '../../lib/data';
import { Icon, Button, Heading } from '../../components/ui';
import { downloadText } from '../../lib/download';
export function Marketing({ go, notify }) {
  const [step, setStep] = useState(1),
    [brand, setBrand] = useState(''),
    [product, setProduct] = useState(''),
    [audience, setAudience] = useState(''),
    [goal, setGoal] = useState('Product launch'),
    [style, setStyle] = useState('Editorial'),
    [format, setFormat] = useState('9:16');
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
            {['Your brand', 'Creative direction', 'Campaign brief'].map((t, i) => (
              <button
                className={step === i + 1 ? 'selected' : ''}
                key={t}
                onClick={() => setStep(i + 1)}
              >
                <span>{i + 1}</span>
                {t}
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
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Form Studio"
                />
              </label>
              <label>
                Product or service
                <textarea
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  placeholder="Describe the product and what makes it special…"
                />
              </label>
              <label>
                Who's it for?
                <input
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="e.g. Design-conscious professionals"
                />
              </label>
              <label>
                Campaign goal
                <select value={goal} onChange={(e) => setGoal(e.target.value)}>
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
                {['Editorial', 'Minimal', 'Bold & vibrant', 'Lifestyle'].map((s, i) => (
                  <button
                    className={style === s ? 'selected' : ''}
                    key={s}
                    onClick={() => setStyle(s)}
                  >
                    <img src={media[[2, 10, 3, 4][i]].image} alt={s} />
                    <b>{s}</b>
                  </button>
                ))}
              </div>
              <label>
                Format
                <select value={format} onChange={(e) => setFormat(e.target.value)}>
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
              {['Hero product shot', 'An everyday moment', 'A detail worth noticing'].map(
                (t, i) => (
                  <button
                    className="brief-idea"
                    key={t}
                    onClick={() =>
                      go('image', {
                        prompt: `${t} for ${brand}. ${product}. ${style} campaign photography for ${audience}. Format ${format}. ${i === 0 ? 'Show the product as the hero.' : i === 1 ? 'Natural lifestyle context.' : 'Macro product details.'}`,
                      })
                    }
                  >
                    <span>0{i + 1}</span>
                    <b>{t}</b>
                    <Icon name="ArrowUpRight" />
                  </button>
                ),
              )}
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
          <img src={media[10].image} alt="Product campaign inspiration" />
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

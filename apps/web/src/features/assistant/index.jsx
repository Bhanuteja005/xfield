import { useState } from 'react';

import { Icon, Button } from '../../components/ui';
export function Assistant({ go }) {
  const [brief, setBrief] = useState(''),
    [result, setResult] = useState(null);
  return (
    <div className="assistant-page">
      <span className="assistant-mark">
        <Icon name="Sparkles" size={30} />
      </span>
      <span className="eyebrow">A LITTLE CREATIVE MOMENTUM</span>
      <h1>What are we making today?</h1>
      <p>Turn a rough idea into a structured creative brief.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (brief.trim())
            setResult({
              subject: brief,
              direction: 'Cinematic natural light, restrained colors, a strong central subject.',
              shot: 'Start wide to establish the world, move closer to reveal the details, finish on the hero.',
            });
        }}
      >
        <textarea
          aria-label="Creative brief"
          placeholder="A launch campaign for a new coffee brand…"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          required
          maxLength={2000}
        />
        <div>
          <small>Structured planning assistant · template based</small>
          <Button primary type="submit" icon="ArrowUp">
            Build a brief
          </Button>
        </div>
      </form>
      <div className="chips">
        {[
          'A cinematic travel story',
          'A product launch campaign',
          'An editorial fashion shoot',
        ].map((p) => (
          <button key={p} onClick={() => setBrief(p)}>
            {p}
            <Icon name="ArrowUpRight" size={13} />
          </button>
        ))}
      </div>
      {result && (
        <div className="assistant-result">
          <span className="badge">YOUR CREATIVE STARTING POINT</span>
          <h2>{result.subject}</h2>
          <label>Visual direction</label>
          <p>{result.direction}</p>
          <label>Shot sequence</label>
          <p>{result.shot}</p>
          <div className="inline-actions">
            <Button
              onClick={() =>
                go('video', {
                  prompt: result.subject + '. ' + result.direction + ' ' + result.shot,
                })
              }
              primary
            >
              Open video studio
            </Button>
            <Button onClick={() => go('marketing')}>Build a campaign</Button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { api, post } from '../../lib/api';
import { media, presets, imageModels, videoModels } from '../../lib/data';
import { Icon, Button, Modal, Empty } from '../../components/ui';
export function Studio({
  kind,
  cinema,
  seed,
  assets,
  jobs,
  refresh,
  notify,
  session,
  setDialog,
  setDetail,
}) {
  const [prompt, setPrompt] = useState(seed?.prompt || ''),
    [model, setModel] = useState(
      kind === 'image' ? 'Soul 2' : kind === 'audio' ? 'Voice preview' : 'Seedance 2.0',
    ),
    [preset, setPreset] = useState(seed?.preset || 'General'),
    [ratio, setRatio] = useState(kind === 'image' ? '1:1' : '16:9'),
    [duration, setDuration] = useState(5),
    [resolution, setResolution] = useState('720p'),
    [mode, setMode] = useState('preview'),
    [audio, setAudio] = useState(true),
    [reference, setReference] = useState(seed?.reference || ''),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState('presets'),
    [picker, setPicker] = useState(false),
    [cam, setCam] = useState('ARRI Alexa'),
    [lens, setLens] = useState('35mm'),
    [voice, setVoice] = useState('Natural'),
    [err, setErr] = useState('');
  const submit = async () => {
    setBusy(true);
    setErr('');
    try {
      if (kind === 'audio') {
        if (!prompt.trim()) throw new Error('Write something for your voiceover.');
        if (!window.speechSynthesis)
          throw new Error('Voice preview is unavailable in this browser.');
        const utterance = new SpeechSynthesisUtterance(prompt);
        utterance.rate = voice === 'Calm' ? 0.85 : 1;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
        notify('Playing a browser voice preview. Audio export requires a provider.');
        return;
      }
      if (mode === 'live' && !session.connected) {
        setDialog('key');
        return;
      }
      if (mode === 'live' && model !== (kind === 'image' ? 'Soul 2' : 'Seedance 2.0'))
        throw new Error(
          'This model is available for concept previews. Live integration currently supports Soul 2 and Seedance 2.0.',
        );
      await post('/jobs', {
        prompt: prompt.trim(),
        kind,
        model,
        preset,
        ratio,
        duration: Number(duration),
        resolution,
        mode,
        audio,
        reference,
        token: crypto.randomUUID(),
        camera: cam,
        lens,
      });
      setTab('history');
      await refresh();
      notify(mode === 'preview' ? 'Your concept preview is rendering' : 'Generation submitted');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  const upload = async (file) => {
    if (!file) return;
    try {
      const form = new FormData();
      form.append('file', file);
      const a = await api('/upload', { method: 'POST', body: form });
      setReference(a.id);
      await refresh();
      notify('Reference uploaded');
    } catch (e) {
      setErr(e.message);
    }
  };
  const selectedRef = assets.find((a) => a.id === reference);
  const ownJobs = jobs.filter((j) => j.kind === kind);
  return (
    <div className="studio-layout">
      <div className="generation-panel">
        <div className="panel-heading">
          <Icon name={kind === 'image' ? 'Image' : kind === 'audio' ? 'AudioLines' : 'Video'} />
          <b>{cinema ? 'Cinema studio' : `Create ${kind}`}</b>
          <span className="badge">BETA</span>
        </div>
        <div className="preset-preview">
          <img
            src={media[presets.indexOf(preset) % media.length]?.image || media[0].image}
            alt="Selected creative preset"
          />
          <div>
            <small>CREATIVE DIRECTION</small>
            <b>{preset}</b>
          </div>
          <button onClick={() => setTab('presets')}>
            Change <Icon name="ChevronDown" size={12} />
          </button>
        </div>
        {kind !== 'audio' && (
          <>
            <label className="field-label">
              Reference <span>Optional</span>
            </label>
            <div
              className="upload-box"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                upload(e.dataTransfer.files[0]);
              }}
            >
              {selectedRef ? (
                <>
                  <img src={selectedRef.url} alt="Uploaded reference" />
                  <button
                    className="remove-ref"
                    aria-label="Remove reference"
                    onClick={() => setReference('')}
                  >
                    <Icon name="X" size={15} />
                  </button>
                </>
              ) : (
                <>
                  <Icon name="Upload" size={24} />
                  <b>Drop your media here</b>
                  <small>PNG, JPG, WebP · up to 20 MB</small>
                </>
              )}
              <label className="file-cover">
                <input
                  aria-label="Upload reference"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => upload(e.target.files[0])}
                />
              </label>
            </div>
            <button className="text-link" onClick={() => setPicker(true)}>
              <Icon name="Layers" size={14} />
              Choose from assets
            </button>
          </>
        )}
        <label className="field-label" htmlFor="create-prompt">
          {kind === 'audio' ? 'Voiceover script' : 'Prompt'}
          <span>{prompt.length}/2000</span>
        </label>
        <textarea
          id="create-prompt"
          placeholder={
            kind === 'audio'
              ? 'Write what you want to say…'
              : 'Describe your vision. Be as imaginative as you like…'
          }
          maxLength={2000}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button
          className="enhance"
          onClick={() => {
            if (prompt.trim())
              setPrompt(
                (
                  prompt +
                  ', cinematic composition, natural lighting, intricate detail, intentional color palette'
                ).slice(0, 2000),
              );
            else setPrompt(media[0].prompt);
          }}
        >
          <Icon name="WandSparkles" size={14} /> Enhance prompt
        </button>
        {kind === 'audio' ? (
          <>
            <label className="field-label">Voice direction</label>
            <select value={voice} onChange={(e) => setVoice(e.target.value)}>
              <option>Natural</option>
              <option>Calm</option>
              <option>Energetic</option>
            </select>
            <small>
              Uses your browser's voice for a quick listen. It is not a cloned or AI provider voice.
            </small>
          </>
        ) : (
          <>
            <label className="field-label" htmlFor="model-select">
              Model
            </label>
            <select id="model-select" value={model} onChange={(e) => setModel(e.target.value)}>
              {(kind === 'image' ? imageModels : videoModels).map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <div className="setting-grid">
              <label>
                Aspect ratio
                <select
                  aria-label="Aspect ratio"
                  value={ratio}
                  onChange={(e) => setRatio(e.target.value)}
                >
                  {['16:9', '9:16', '1:1', '4:3', '3:4'].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label>
                {kind === 'video' ? 'Duration' : 'Resolution'}
                {kind === 'video' ? (
                  <select
                    aria-label="Duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  >
                    {[5, 8, 10].map((n) => (
                      <option value={n} key={n}>
                        {n} seconds
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    aria-label="Resolution"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                  >
                    <option>720p</option>
                    <option>1080p</option>
                  </select>
                )}
              </label>
            </div>
            {kind === 'video' && (
              <div className="setting-grid">
                <label>
                  Resolution
                  <select
                    aria-label="Video resolution"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                  >
                    <option>720p</option>
                    <option>1080p</option>
                  </select>
                </label>
                <label className="toggle-label">
                  Generate audio
                  <input
                    type="checkbox"
                    checked={audio}
                    onChange={(e) => setAudio(e.target.checked)}
                  />
                </label>
              </div>
            )}
            {cinema && (
              <div className="setting-grid">
                <label>
                  Camera
                  <select value={cam} onChange={(e) => setCam(e.target.value)}>
                    <option>ARRI Alexa</option>
                    <option>RED V-Raptor</option>
                    <option>Sony Venice</option>
                  </select>
                </label>
                <label>
                  Lens
                  <select value={lens} onChange={(e) => setLens(e.target.value)}>
                    <option>35mm</option>
                    <option>50mm</option>
                    <option>85mm</option>
                    <option>24mm</option>
                  </select>
                </label>
              </div>
            )}
            <div className="mode-switch">
              <button
                className={mode === 'preview' ? 'selected' : ''}
                onClick={() => setMode('preview')}
              >
                Concept preview
              </button>
              <button className={mode === 'live' ? 'selected' : ''} onClick={() => setMode('live')}>
                Live AI <Icon name="Zap" size={12} />
              </button>
            </div>
            <p className="mode-hint">
              {mode === 'preview'
                ? 'Free procedural concept render. No AI credits used.'
                : 'Uses your API credits. Soul 2 and Seedance 2.0 are connected.'}
            </p>
          </>
        )}
        {err && (
          <p className="form-error" role="alert">
            {err}
          </p>
        )}
        <Button
          primary
          icon={busy ? 'LoaderCircle' : 'Sparkles'}
          onClick={submit}
          disabled={busy || !prompt.trim()}
        >
          {busy
            ? 'Submitting…'
            : kind === 'audio'
              ? 'Listen to preview'
              : mode === 'preview'
                ? 'Create concept preview'
                : 'Generate with AI'}
          <Icon name="ArrowRight" size={16} />
        </Button>
        {kind === 'audio' && (
          <Button onClick={() => speechSynthesis.cancel()}>Stop playback</Button>
        )}
      </div>
      <div className="studio-content">
        <div className="studio-tabs">
          {['presets', 'history', 'how it works'].map((t) => (
            <button className={tab === t ? 'active' : ''} key={t} onClick={() => setTab(t)}>
              <Icon
                name={t === 'presets' ? 'Grid2X2' : t === 'history' ? 'History' : 'CircleHelp'}
                size={15}
              />
              {t === 'presets'
                ? 'All presets'
                : t === 'history'
                  ? `History (${ownJobs.length})`
                  : 'How it works'}
            </button>
          ))}
          <span className="studio-status">
            <span className="live-dot" />
            {mode === 'preview' ? 'Preview mode' : 'Live AI'}
          </span>
        </div>
        {tab === 'presets' && (
          <>
            <div className="studio-intro">
              <span className="eyebrow">
                {cinema
                  ? 'TAKE THE DIRECTOR’S CHAIR'
                  : kind === 'audio'
                    ? 'WORDS THAT MOVE PEOPLE'
                    : 'YOUR IMAGINATION, IN MOTION'}
              </span>
              <h1>
                {cinema
                  ? 'Every frame tells your story.'
                  : kind === 'image'
                    ? 'Make something only you could imagine.'
                    : kind === 'audio'
                      ? 'Find your story’s voice.'
                      : 'Big ideas. One little prompt.'}
              </h1>
              <p>Choose a creative direction or start with your own vision.</p>
            </div>
            <div className="preset-grid">
              {presets.map((p, i) => (
                <button
                  key={p}
                  className={`preset-card ${preset === p ? 'selected' : ''}`}
                  onClick={() => {
                    setPreset(p);
                    if (!prompt) setPrompt(media[i % media.length].prompt);
                  }}
                >
                  <img alt={p + ' inspiration'} src={media[i % media.length].image} />
                  <div>
                    <b>{p}</b>
                    {preset === p ? (
                      <Icon name="CheckCircle2" size={18} />
                    ) : (
                      <Icon name="ArrowUpRight" size={17} />
                    )}
                  </div>
                  <span className="preset-type">{i < 8 ? 'CAMERA MOTION' : 'STYLE'}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {tab === 'how it works' && (
          <div className="how-to">
            <span className="eyebrow">THREE STEPS, INFINITE POSSIBILITIES</span>
            <h1>From idea to your next creation.</h1>
            {[
              [
                '01',
                'Describe the scene',
                'Write a prompt or choose a preset. Add a reference to keep your visual direction close.',
              ],
              [
                '02',
                'Choose how to create',
                'Concept preview creates a procedural design. Connect an API key and select Live AI for actual model output.',
              ],
              [
                '03',
                'Make it yours',
                'Your results are saved to My assets. Download them, organize them in folders or publish them to the community.',
              ],
            ].map(([n, h, p]) => (
              <div key={n}>
                <em>{n}</em>
                <section>
                  <h2>{h}</h2>
                  <p>{p}</p>
                </section>
              </div>
            ))}
          </div>
        )}
        {tab === 'history' &&
          (ownJobs.length ? (
            <div className="job-list">
              {ownJobs.map((j) => (
                <div className="job-card" key={j.id}>
                  {j.asset ? (
                    <button onClick={() => setDetail(assets.find((a) => a.id === j.asset))}>
                      <img src={`/api/media/${j.asset}`} alt={j.prompt} />
                    </button>
                  ) : (
                    <div className="job-placeholder">
                      {j.status === 'processing' ? (
                        <span className="spinner" />
                      ) : (
                        <Icon name="AlertCircle" size={30} />
                      )}
                      <span>{j.status}</span>
                    </div>
                  )}
                  <div>
                    <span className={`status ${j.status}`}>{j.status}</span>
                    <h3>{j.prompt}</h3>
                    <p>
                      {j.model} · {JSON.parse(j.settings).ratio} ·{' '}
                      {new Date(j.created).toLocaleTimeString()}
                    </p>
                    {j.error && <p className="form-error">{j.error}</p>}
                    {j.pollError && (
                      <p className="form-error">Status temporarily unavailable: {j.pollError}</p>
                    )}
                    {j.asset && (
                      <Button onClick={() => setDetail(assets.find((a) => a.id === j.asset))}>
                        Open result <Icon name="ArrowUpRight" size={15} />
                      </Button>
                    )}
                    {j.status === 'processing' && (
                      <Button
                        onClick={async () => {
                          try {
                            await post('/jobs/' + j.id + '/cancel', {});
                            await refresh();
                          } catch (e) {
                            notify(e.message);
                          }
                        }}
                      >
                        Cancel generation
                      </Button>
                    )}
                    <button
                      className="text-link"
                      onClick={() => {
                        setPrompt(j.prompt);
                        setTab('presets');
                      }}
                    >
                      Reuse prompt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              icon="History"
              title="Your story starts here"
              text="Your creations and their prompts will appear here."
              action="Choose a preset"
              onClick={() => setTab('presets')}
            />
          ))}
      </div>
      {picker && (
        <Modal title="Choose a reference" close={() => setPicker(false)} wide>
          {assets.filter((a) => a.kind === 'image').length ? (
            <div className="asset-grid">
              {assets
                .filter((a) => a.kind === 'image')
                .map((a) => (
                  <button
                    key={a.id}
                    className="asset-card"
                    onClick={() => {
                      setReference(a.id);
                      setPicker(false);
                    }}
                  >
                    <img src={a.url} alt={a.name} />
                    <b>{a.name}</b>
                  </button>
                ))}
            </div>
          ) : (
            <Empty
              icon="Image"
              title="No image assets yet"
              text="Upload an image from the creation panel."
            />
          )}
        </Modal>
      )}
    </div>
  );
}

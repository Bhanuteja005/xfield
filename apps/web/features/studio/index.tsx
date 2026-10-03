import { useState } from 'react';
import { Button, Empty, Icon, Modal } from '../../components/ui';
import { api, post } from '../../lib/api';
import { LIVE_MODELS, imageModels, media, presets, videoModels } from '../../lib/data';
import { messageOf, type Asset, type Job, type StudioApi } from '../../lib/types';

type Kind = Job['kind'];
type Mode = 'preview' | 'live';

type Props = Pick<
  StudioApi,
  'seed' | 'assets' | 'jobs' | 'refresh' | 'notify' | 'session' | 'setDialog' | 'setDetail'
> & {
  kind: Kind;
  cinema: boolean;
};

const TABS = ['presets', 'history', 'how it works'] as const;
type Tab = (typeof TABS)[number];

const TAB_ICONS: Record<Tab, string> = {
  presets: 'Grid2X2',
  history: 'History',
  'how it works': 'CircleHelp',
};

const KIND_ICONS: Record<Kind, string> = { image: 'Image', audio: 'AudioLines', video: 'Video' };

const RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4'];
const DURATIONS = [5, 8, 10];
const PROMPT_LIMIT = 2000;
const ENHANCEMENT =
  ', cinematic composition, natural lighting, intricate detail, intentional color palette';

const STEPS = [
  {
    number: '01',
    title: 'Describe the scene',
    text: 'Write a prompt or choose a preset. Add a reference to keep your visual direction close.',
  },
  {
    number: '02',
    title: 'Choose how to create',
    text: 'Concept preview creates a procedural design. Connect an API key and select Live AI for actual model output.',
  },
  {
    number: '03',
    title: 'Make it yours',
    text: 'Your results are saved to My assets. Download them, organize them in folders or publish them to the community.',
  },
];

/** Presets borrow their artwork from the curated samples, cycling when there are more presets. */
const sampleFor = (presetIndex: number) => media[presetIndex % media.length];

const defaultModel = (kind: Kind) => (kind === 'audio' ? 'Voice preview' : LIVE_MODELS[kind]);

/** A model named in the link that opened the studio, when this studio offers it. */
const initialModel = (kind: Kind, requested?: string) => {
  const offered: readonly string[] =
    kind === 'image' ? imageModels : kind === 'video' ? videoModels : [];
  return requested && offered.includes(requested) ? requested : defaultModel(kind);
};

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
}: Props) {
  const [prompt, setPrompt] = useState(seed?.prompt || '');
  const [model, setModel] = useState(initialModel(kind, seed?.model));
  const [preset, setPreset] = useState(seed?.preset || 'General');
  const [ratio, setRatio] = useState(kind === 'image' ? '1:1' : '16:9');
  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] = useState('720p');
  const [mode, setMode] = useState<Mode>('preview');
  const [audio, setAudio] = useState(true);
  const [reference, setReference] = useState(seed?.reference || '');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>('presets');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [camera, setCamera] = useState('ARRI Alexa');
  const [lens, setLens] = useState('35mm');
  const [voice, setVoice] = useState('Natural');
  const [error, setError] = useState('');

  const selectedReference = assets.find((asset) => asset.id === reference);
  const imageAssets = assets.filter((asset) => asset.kind === 'image');
  const ownJobs = jobs.filter((job) => job.kind === kind);
  const openResult = (assetId: string) =>
    setDetail(assets.find((asset) => asset.id === assetId) ?? null);

  const speak = () => {
    if (!prompt.trim()) throw new Error('Write something for your voiceover.');
    if (!window.speechSynthesis) throw new Error('Voice preview is unavailable in this browser.');
    const utterance = new SpeechSynthesisUtterance(prompt);
    utterance.rate = voice === 'Calm' ? 0.85 : 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    notify('Playing a browser voice preview. Audio export requires a provider.');
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      if (kind === 'audio') {
        speak();
        return;
      }
      if (mode === 'live' && !session.connected) {
        setDialog('key');
        return;
      }
      if (mode === 'live' && model !== LIVE_MODELS[kind])
        throw new Error(
          'This model is available for concept previews. Live integration currently supports Soul 2 and Seedance 2.0.',
        );
      await post('/jobs', {
        prompt: prompt.trim(),
        kind,
        model,
        preset,
        ratio,
        duration,
        resolution,
        mode,
        audio,
        reference,
        token: crypto.randomUUID(),
        // Camera and lens are only chosen in Cinema studio.
        ...(cinema ? { camera, lens } : {}),
      });
      setTab('history');
      await refresh();
      notify(mode === 'preview' ? 'Your concept preview is rendering' : 'Generation submitted');
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setBusy(false);
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const form = new FormData();
      form.append('file', file);
      const uploaded = await api<Asset>('/upload', { method: 'POST', body: form });
      setReference(uploaded.id);
      await refresh();
      notify('Reference uploaded');
    } catch (failure) {
      setError(messageOf(failure));
    }
  };

  const cancelJob = async (jobId: string) => {
    try {
      await post(`/jobs/${jobId}/cancel`, {});
      await refresh();
    } catch (failure) {
      notify(messageOf(failure));
    }
  };

  const enhancePrompt = () => {
    // The enhancement is visual direction; it would be read aloud in a voiceover.
    if (kind === 'audio') return;
    if (prompt.trim()) setPrompt((prompt + ENHANCEMENT).slice(0, PROMPT_LIMIT));
    else setPrompt(media[0]?.prompt ?? '');
  };

  return (
    <div className="studio-layout">
      <div className="generation-panel">
        <div className="panel-heading">
          <Icon name={KIND_ICONS[kind]} />
          <b>{cinema ? 'Cinema studio' : `Create ${kind}`}</b>
          <span className="badge">BETA</span>
        </div>
        <div className="preset-preview">
          <img
            // A seeded preset may not be in the list; fall back to the first sample.
            src={(media[presets.indexOf(preset) % media.length] ?? media[0])?.image}
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
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void upload(event.dataTransfer.files[0]);
              }}
            >
              {selectedReference ? (
                <>
                  <img src={selectedReference.url} alt="Uploaded reference" />
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
                  <small>PNG, JPG, WebP · up to 4 MB</small>
                </>
              )}
              <label className="file-cover">
                <input
                  aria-label="Upload reference"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    void upload(event.target.files?.[0]);
                    // Reset so choosing the same file again still fires a change.
                    event.target.value = '';
                  }}
                />
              </label>
            </div>
            <button className="text-link" onClick={() => setPickerOpen(true)}>
              <Icon name="Layers" size={14} />
              Choose from assets
            </button>
          </>
        )}
        <label className="field-label" htmlFor="create-prompt">
          {kind === 'audio' ? 'Voiceover script' : 'Prompt'}
          <span>
            {prompt.length}/{PROMPT_LIMIT}
          </span>
        </label>
        <textarea
          id="create-prompt"
          placeholder={
            kind === 'audio'
              ? 'Write what you want to say…'
              : 'Describe your vision. Be as imaginative as you like…'
          }
          maxLength={PROMPT_LIMIT}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
        <button className="enhance" onClick={enhancePrompt}>
          <Icon name="WandSparkles" size={14} /> Enhance prompt
        </button>
        {kind === 'audio' ? (
          <>
            <label className="field-label">Voice direction</label>
            <select value={voice} onChange={(event) => setVoice(event.target.value)}>
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
            <select
              id="model-select"
              value={model}
              onChange={(event) => setModel(event.target.value)}
            >
              {(kind === 'image' ? imageModels : videoModels).map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <div className="setting-grid">
              <label>
                Aspect ratio
                <select
                  aria-label="Aspect ratio"
                  value={ratio}
                  onChange={(event) => setRatio(event.target.value)}
                >
                  {RATIOS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                {kind === 'video' ? 'Duration' : 'Resolution'}
                {kind === 'video' ? (
                  <select
                    aria-label="Duration"
                    value={duration}
                    onChange={(event) => setDuration(Number(event.target.value))}
                  >
                    {DURATIONS.map((seconds) => (
                      <option value={seconds} key={seconds}>
                        {seconds} seconds
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    aria-label="Resolution"
                    value={resolution}
                    onChange={(event) => setResolution(event.target.value)}
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
                    onChange={(event) => setResolution(event.target.value)}
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
                    onChange={(event) => setAudio(event.target.checked)}
                  />
                </label>
              </div>
            )}
            {cinema && (
              <div className="setting-grid">
                <label>
                  Camera
                  <select value={camera} onChange={(event) => setCamera(event.target.value)}>
                    <option>ARRI Alexa</option>
                    <option>RED V-Raptor</option>
                    <option>Sony Venice</option>
                  </select>
                </label>
                <label>
                  Lens
                  <select value={lens} onChange={(event) => setLens(event.target.value)}>
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
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button
          primary
          icon={busy ? 'LoaderCircle' : 'Sparkles'}
          onClick={() => void submit()}
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
          <Button onClick={() => window.speechSynthesis?.cancel()}>Stop playback</Button>
        )}
      </div>
      <div className="studio-content">
        <div className="studio-tabs">
          {TABS.map((name) => (
            <button
              className={tab === name ? 'active' : ''}
              key={name}
              onClick={() => setTab(name)}
            >
              <Icon name={TAB_ICONS[name]} size={15} />
              {name === 'presets'
                ? 'All presets'
                : name === 'history'
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
              {presets.map((name, index) => {
                const sample = sampleFor(index);
                return (
                  <button
                    key={name}
                    className={`preset-card ${preset === name ? 'selected' : ''}`}
                    onClick={() => {
                      setPreset(name);
                      if (!prompt && sample) setPrompt(sample.prompt);
                    }}
                  >
                    <img alt={name + ' inspiration'} src={sample?.image} />
                    <div>
                      <b>{name}</b>
                      {preset === name ? (
                        <Icon name="CheckCircle2" size={18} />
                      ) : (
                        <Icon name="ArrowUpRight" size={17} />
                      )}
                    </div>
                    <span className="preset-type">
                      {kind === 'image'
                        ? 'CREATIVE DIRECTION'
                        : index < 8
                          ? 'CAMERA MOTION'
                          : 'STYLE'}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
        {tab === 'how it works' && (
          <div className="how-to">
            <span className="eyebrow">THREE STEPS, INFINITE POSSIBILITIES</span>
            <h1>From idea to your next creation.</h1>
            {STEPS.map((step) => (
              <div key={step.number}>
                <em>{step.number}</em>
                <section>
                  <h2>{step.title}</h2>
                  <p>{step.text}</p>
                </section>
              </div>
            ))}
          </div>
        )}
        {tab === 'history' &&
          (ownJobs.length ? (
            <div className="job-list">
              {ownJobs.map((job) => {
                const assetId = job.asset;
                return (
                  <div className="job-card" key={job.id}>
                    {assetId ? (
                      <button onClick={() => openResult(assetId)}>
                        {job.kind === 'video' && job.model !== 'Concept preview' ? (
                          <video src={`/api/media/${assetId}`} muted />
                        ) : (
                          <img src={`/api/media/${assetId}`} alt={job.prompt} />
                        )}
                      </button>
                    ) : (
                      <div className="job-placeholder">
                        {job.status === 'processing' ? (
                          <span className="spinner" />
                        ) : (
                          <Icon name="AlertCircle" size={30} />
                        )}
                        <span>{job.status}</span>
                      </div>
                    )}
                    <div>
                      <span className={`status ${job.status}`}>{job.status}</span>
                      <h3>{job.prompt}</h3>
                      <p>
                        {job.model} · {job.settings.ratio} ·{' '}
                        {new Date(job.created).toLocaleTimeString()}
                      </p>
                      {job.error && <p className="form-error">{job.error}</p>}
                      {job.pollError && (
                        <p className="form-error">
                          Status temporarily unavailable: {job.pollError}
                        </p>
                      )}
                      {assetId && (
                        <Button onClick={() => openResult(assetId)}>
                          Open result <Icon name="ArrowUpRight" size={15} />
                        </Button>
                      )}
                      {job.status === 'processing' && (
                        <Button onClick={() => void cancelJob(job.id)}>Cancel generation</Button>
                      )}
                      <button
                        className="text-link"
                        onClick={() => {
                          setPrompt(job.prompt);
                          setTab('presets');
                        }}
                      >
                        Reuse prompt
                      </button>
                    </div>
                  </div>
                );
              })}
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
      {pickerOpen && (
        <Modal title="Choose a reference" close={() => setPickerOpen(false)} wide>
          {imageAssets.length ? (
            <div className="asset-grid">
              {imageAssets.map((asset) => (
                <button
                  key={asset.id}
                  className="asset-card"
                  onClick={() => {
                    setReference(asset.id);
                    setPickerOpen(false);
                  }}
                >
                  <img src={asset.url} alt={asset.name} />
                  <b>{asset.name}</b>
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

'use client';
import { api, patch } from '../../lib/api';
import { isOwned, isSample, messageOf, type Asset, type Detail } from '../../lib/types';
import { Button, Icon, Modal } from '../ui';
import { useStudio } from './context';

const PREVIEW_MODEL = 'Concept preview';

/** Detail view for a curated sample, a community item or one of the workspace's own assets. */
export function AssetDetail({ detail }: { detail: Detail }) {
  const { go, notify, mutate, refresh, setDetail } = useStudio();
  const sample = isSample(detail) ? detail : null;
  const owned = isOwned(detail) ? detail : null;
  const kind = isSample(detail) ? 'image' : detail.kind;
  const source = isSample(detail) ? detail.image : detail.url;
  const isPreview = !isSample(detail) && detail.model === PREVIEW_MODEL;

  const saveSample = async () => {
    try {
      const blob = await (await fetch(source)).blob();
      const form = new FormData();
      form.append('file', new File([blob], `${detail.name}.jpg`, { type: 'image/jpeg' }));
      await api('/upload', { method: 'POST', body: form });
      await refresh();
      notify('Saved to your assets');
    } catch (failure) {
      notify(messageOf(failure));
    }
  };
  // The dialog shows a snapshot, so reflect the change locally as well.
  const toggle = (asset: Asset, field: 'favorite' | 'published', message: string) =>
    mutate(async () => {
      await patch(`/assets/${asset.id}`, { [field]: !asset[field] });
      setDetail({ ...asset, [field]: !asset[field] });
    }, message);

  return (
    <Modal title={detail.name} close={() => setDetail(null)} wide>
      <div className="detail-grid">
        <div className="detail-media">
          {kind === 'audio' ? (
            <audio controls src={source} />
          ) : kind === 'video' && !isPreview ? (
            <video controls src={source} />
          ) : (
            <img src={source} alt={detail.name} />
          )}
        </div>
        <div className="detail-info">
          <span className="eyebrow">
            {sample
              ? 'INSPIRATION SAMPLE'
              : !owned
                ? 'COMMUNITY CREATION'
                : isPreview
                  ? 'CONCEPT PREVIEW'
                  : 'YOUR CREATION'}
          </span>
          <h2>{detail.name}</h2>
          <p>
            {isSample(detail)
              ? `Curated by ${detail.creator}`
              : new Date(detail.created).toLocaleDateString()}
          </p>
          <label>Prompt</label>
          <div className="prompt-display">{detail.prompt || 'Uploaded reference asset'}</div>
          <Button
            icon="Copy"
            onClick={() =>
              void navigator.clipboard.writeText(detail.prompt).then(() => notify('Prompt copied'))
            }
          >
            Copy prompt
          </Button>
          <Button
            primary
            icon="Sparkles"
            onClick={() => {
              setDetail(null);
              // Only the viewer's own asset can be attached as a reference.
              go(kind === 'video' ? 'video' : 'image', {
                prompt: detail.prompt,
                reference: owned?.id,
              });
            }}
          >
            Use as inspiration
          </Button>
          {sample && (
            <Button icon="Bookmark" onClick={saveSample}>
              Save to assets
            </Button>
          )}
          {!sample && (
            <a
              className="btn"
              href={source}
              download={detail.name}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="Download" size={16} />
              Download
            </a>
          )}
          {owned && (
            <>
              <Button icon="Heart" onClick={() => toggle(owned, 'favorite', 'Favorite updated')}>
                {owned.favorite ? 'Remove favorite' : 'Favorite'}
              </Button>
              <Button
                icon="Globe"
                onClick={() =>
                  toggle(
                    owned,
                    'published',
                    owned.published ? 'Made private' : 'Published to community',
                  )
                }
              >
                {owned.published ? 'Make private' : 'Publish to community'}
              </Button>
            </>
          )}
          {isPreview && (
            <small>
              This is a procedural SVG concept, not AI-generated media or an exported video.
            </small>
          )}
        </div>
      </div>
    </Modal>
  );
}

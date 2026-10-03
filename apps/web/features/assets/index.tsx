import { useRef, useState, type FormEvent } from 'react';
import { fitForUpload } from '../../lib/shrink-image';
import { Button, Empty, Heading, Icon, Modal } from '../../components/ui';
import { api, patch, post } from '../../lib/api';
import { messageOf, type Asset, type Folder, type StudioApi } from '../../lib/types';

const FILTERS = ['All', 'Image', 'Video', 'Audio', 'Favorites'] as const;
type Filter = (typeof FILTERS)[number];
const PREVIEW_MODEL = 'Concept preview';
const ACCEPTED_TYPES = 'image/png,image/jpeg,image/webp,video/mp4,video/webm,audio/mpeg,audio/wav';

type Props = Pick<
  StudioApi,
  'assets' | 'folders' | 'refresh' | 'notify' | 'setDetail' | 'mutate' | 'search'
>;

/** `null` closed, `'new'` creating, otherwise the folder being renamed. */
type FolderDialog = null | 'new' | Folder;

const matchesFilter = (asset: Asset, filter: Filter) =>
  filter === 'All' ||
  (filter === 'Favorites' ? asset.favorite : asset.kind === filter.toLowerCase());

export function AssetLibrary({
  assets,
  folders,
  refresh,
  notify,
  setDetail,
  mutate,
  search,
}: Props) {
  const [filter, setFilter] = useState<Filter>('All');
  const [folder, setFolder] = useState('');
  const [folderDialog, setFolderDialog] = useState<FolderDialog>(null);
  const [folderName, setFolderName] = useState('');
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [toDelete, setToDelete] = useState<Asset[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileInput = useRef<HTMLInputElement>(null);

  const query = search.toLowerCase();
  const visible = assets.filter(
    (asset) =>
      (!folder || asset.folder === folder) &&
      matchesFilter(asset, filter) &&
      asset.name.toLowerCase().includes(query),
  );
  // Selection is kept by id; ignore ids that have since been deleted or filtered out.
  const chosen = visible.filter((asset) => selected.has(asset.id));
  const chosenIds = chosen.map((asset) => asset.id);
  const clearSelection = () => setSelected(new Set());

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', await fitForUpload(file));
      await api('/upload', { method: 'POST', body: form });
      await refresh();
      notify('Asset uploaded');
    } catch (failure) {
      notify(messageOf(failure));
    } finally {
      setUploading(false);
    }
  };

  const toggleSelected = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const bulk = async (body: Record<string, unknown>, message: string) => {
    await mutate(() => post('/assets/bulk', { ...body, ids: chosenIds }), message);
    clearSelection();
  };

  const saveFolder = async (event: FormEvent) => {
    event.preventDefault();
    await mutate(
      () =>
        folderDialog && folderDialog !== 'new'
          ? patch(`/folders/${folderDialog.id}`, { name: folderName })
          : post('/folders', { name: folderName }),
      'Folder saved',
    );
    setFolderDialog(null);
  };

  const saveAsset = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    await mutate(
      () => patch(`/assets/${editing.id}`, { name, folder: destination }),
      'Asset updated',
    );
    setEditing(null);
  };

  const confirmDelete = async () => {
    const ids = toDelete.map((asset) => asset.id);
    await mutate(
      () => post('/assets/bulk', { action: 'delete', ids }),
      ids.length === 1 ? 'Asset deleted' : `${ids.length} assets deleted`,
    );
    setToDelete([]);
    clearSelection();
  };

  const confirmFolderDelete = async () => {
    if (!folderToDelete) return;
    const id = folderToDelete.id;
    await mutate(() => api(`/folders/${id}`, { method: 'DELETE' }), 'Folder deleted');
    if (folder === id) setFolder('');
    setFolderToDelete(null);
  };

  return (
    <>
      <Heading
        eyebrow="YOUR CREATIVE LIBRARY"
        title="My assets"
        text="Every idea, reference and creation. All together."
      >
        <div className="inline-actions">
          <Button
            icon="FolderPlus"
            onClick={() => {
              setFolderName('');
              setFolderDialog('new');
            }}
          >
            New folder
          </Button>
          <label className="btn primary">
            <Icon name="Upload" size={16} />
            {uploading ? 'Uploading…' : 'Upload media'}
            <input
              hidden
              ref={fileInput}
              type="file"
              aria-label="Upload media"
              accept={ACCEPTED_TYPES}
              onChange={(event) => void upload(event.target.files?.[0])}
            />
          </label>
        </div>
      </Heading>
      <div className="library-toolbar">
        <div className="chips">
          {FILTERS.map((option) => (
            <button
              className={filter === option ? 'selected' : ''}
              key={option}
              onClick={() => setFilter(option)}
            >
              {option}
            </button>
          ))}
        </div>
        <span>{visible.length} assets</span>
      </div>
      {chosen.length > 0 && (
        <div className="selection-bar" role="toolbar" aria-label="Selected assets">
          <b>{chosen.length} selected</b>
          <Button
            icon="Heart"
            onClick={() => void bulk({ action: 'favorite', favorite: true }, 'Added to favorites')}
          >
            Favorite
          </Button>
          <select
            aria-label="Move selected to folder"
            value=""
            onChange={(event) =>
              void bulk({ action: 'move', folder: event.target.value }, 'Assets moved')
            }
          >
            <option value="" disabled>
              Move to…
            </option>
            <option value="">No folder</option>
            {folders.map((entry) => (
              <option value={entry.id} key={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
          <Button icon="Trash2" onClick={() => setToDelete(chosen)}>
            Delete
          </Button>
          <Button onClick={clearSelection}>Clear</Button>
        </div>
      )}
      {folders.length > 0 && (
        <div className="folder-row">
          <button className={folder ? '' : 'selected'} onClick={() => setFolder('')}>
            <Icon name="FolderOpen" />
            All assets
          </button>
          {folders.map((entry) => (
            <div key={entry.id}>
              <button
                className={folder === entry.id ? 'selected' : ''}
                onClick={() => setFolder(entry.id)}
              >
                <Icon name="Folder" />
                {entry.name}
              </button>
              <button
                aria-label={`Rename ${entry.name}`}
                onClick={() => {
                  setFolderName(entry.name);
                  setFolderDialog(entry);
                }}
              >
                <Icon name="Pencil" size={13} />
              </button>
              <button aria-label={`Delete ${entry.name}`} onClick={() => setFolderToDelete(entry)}>
                <Icon name="Trash2" size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
      {visible.length ? (
        <div className="asset-grid">
          {visible.map((asset) => {
            const isPreview = asset.model === PREVIEW_MODEL;
            return (
              <article
                key={asset.id}
                className={`asset-card ${selected.has(asset.id) ? 'selected' : ''}`}
              >
                <input
                  type="checkbox"
                  className="asset-select"
                  aria-label={`Select ${asset.name}`}
                  checked={selected.has(asset.id)}
                  onChange={() => toggleSelected(asset.id)}
                />
                <button className="asset-thumb" onClick={() => setDetail(asset)}>
                  {asset.kind === 'audio' ? (
                    <Icon name="AudioLines" size={40} />
                  ) : asset.kind === 'video' && !isPreview ? (
                    <video src={asset.url} />
                  ) : (
                    <img src={asset.url} alt={asset.name} />
                  )}
                  <span className="badge">{isPreview ? 'PREVIEW' : asset.kind.toUpperCase()}</span>
                </button>
                <div className="asset-meta">
                  <b>{asset.name}</b>
                  <div>
                    <small>{new Date(asset.created).toLocaleDateString()}</small>
                    <button
                      aria-label={`Favorite ${asset.name}`}
                      className={asset.favorite ? 'lime' : ''}
                      onClick={() =>
                        void mutate(() =>
                          patch(`/assets/${asset.id}`, { favorite: !asset.favorite }),
                        )
                      }
                    >
                      <Icon name="Heart" size={16} />
                    </button>
                    <button
                      aria-label={`Edit ${asset.name}`}
                      onClick={() => {
                        setEditing(asset);
                        setName(asset.name);
                        setDestination(asset.folder);
                      }}
                    >
                      <Icon name="Ellipsis" size={18} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <Empty
          icon="Layers"
          title={filter === 'All' ? 'Make room for your first idea' : 'Nothing here yet'}
          text="Upload a reference or create something in the studio."
          action="Upload media"
          onClick={() => fileInput.current?.click()}
        />
      )}
      {folderDialog && (
        <Modal
          title={folderDialog === 'new' ? 'New folder' : 'Rename folder'}
          close={() => setFolderDialog(null)}
        >
          <form onSubmit={saveFolder}>
            <label>
              Folder name
              <input
                autoFocus
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
                maxLength={80}
                required
              />
            </label>
            <Button primary type="submit">
              Save folder
            </Button>
          </form>
        </Modal>
      )}
      {folderToDelete && (
        <Modal title="Delete this folder?" close={() => setFolderToDelete(null)}>
          <p>
            “{folderToDelete.name}” will be removed. The assets inside it are kept and moved back to
            All assets.
          </p>
          <div className="modal-actions">
            <Button onClick={() => setFolderToDelete(null)}>Keep folder</Button>
            <Button onClick={() => void confirmFolderDelete()}>Delete folder</Button>
          </div>
        </Modal>
      )}
      {editing && (
        <Modal title="Edit asset" close={() => setEditing(null)}>
          <form onSubmit={saveAsset}>
            <label>
              Name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={120}
              />
            </label>
            <label>
              Folder
              <select value={destination} onChange={(event) => setDestination(event.target.value)}>
                <option value="">No folder</option>
                {folders.map((entry) => (
                  <option value={entry.id} key={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="modal-actions">
              <Button
                onClick={() => {
                  setToDelete([editing]);
                  setEditing(null);
                }}
              >
                Delete asset
              </Button>
              <Button primary type="submit">
                Save changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {toDelete.length > 0 && (
        <Modal
          title={toDelete.length === 1 ? 'Delete this asset?' : `Delete ${toDelete.length} assets?`}
          close={() => setToDelete([])}
        >
          <p>
            {toDelete.length === 1
              ? `Remove “${toDelete[0]?.name}” from your library?`
              : `Remove ${toDelete.length} assets from your library?`}{' '}
            This action cannot be undone.
          </p>
          <div className="modal-actions">
            <Button onClick={() => setToDelete([])}>Keep</Button>
            <Button onClick={() => void confirmDelete()}>Delete</Button>
          </div>
        </Modal>
      )}
    </>
  );
}

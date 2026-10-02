import { useState } from 'react';
import { api, post, patch } from '../../lib/api';

import { Icon, Button, Modal, Empty, Heading } from '../../components/ui';
export function AssetLibrary({ assets, folders, refresh, notify, setDetail, mutate, search }) {
  const [filter, setFilter] = useState('All'),
    [folder, setFolder] = useState(''),
    [newFolder, setNewFolder] = useState(false),
    [folderName, setFolderName] = useState(''),
    [uploading, setUploading] = useState(false),
    [edit, setEdit] = useState(null),
    [name, setName] = useState(''),
    [move, setMove] = useState(''),
    [confirm, setConfirm] = useState(null);
  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      await api('/upload', { method: 'POST', body: form });
      await refresh();
      notify('Asset uploaded');
    } catch (e) {
      notify(e.message);
    } finally {
      setUploading(false);
    }
  };
  const visible = assets.filter(
    (a) =>
      (!folder || a.folder === folder) &&
      (filter === 'All' ||
        (filter === 'Favorites' && a.favorite) ||
        a.kind === filter.toLowerCase()) &&
      a.name.toLowerCase().includes(search.toLowerCase()),
  );
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
              setNewFolder(true);
            }}
          >
            New folder
          </Button>
          <label className="btn primary">
            <Icon name="Upload" size={16} />
            {uploading ? 'Uploading…' : 'Upload media'}
            <input
              hidden
              type="file"
              aria-label="Upload media"
              accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,audio/mpeg,audio/wav"
              onChange={(e) => upload(e.target.files[0])}
            />
          </label>
        </div>
      </Heading>
      <div className="library-toolbar">
        <div className="chips">
          {['All', 'Image', 'Video', 'Audio', 'Favorites'].map((f) => (
            <button className={filter === f ? 'selected' : ''} key={f} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
        <span>{visible.length} assets</span>
      </div>
      {folders.length > 0 && (
        <div className="folder-row">
          <button className={!folder ? 'selected' : ''} onClick={() => setFolder('')}>
            <Icon name="FolderOpen" />
            All assets
          </button>
          {folders.map((f) => (
            <div key={f.id}>
              <button className={folder === f.id ? 'selected' : ''} onClick={() => setFolder(f.id)}>
                <Icon name="Folder" />
                {f.name}
              </button>
              <button
                aria-label={'Rename ' + f.name}
                onClick={() => {
                  setNewFolder(f.id);
                  setFolderName(f.name);
                }}
              >
                <Icon name="Pencil" size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
      {visible.length ? (
        <div className="asset-grid">
          {visible.map((a) => (
            <article key={a.id} className="asset-card">
              <button className="asset-thumb" onClick={() => setDetail(a)}>
                {a.kind === 'audio' ? (
                  <Icon name="AudioLines" size={40} />
                ) : a.kind === 'video' && a.model !== 'Concept preview' ? (
                  <video src={a.url} />
                ) : (
                  <img src={a.url} alt={a.name} />
                )}
                <span className="badge">
                  {a.model === 'Concept preview' ? 'PREVIEW' : a.kind.toUpperCase()}
                </span>
              </button>
              <div className="asset-meta">
                <b>{a.name}</b>
                <div>
                  <small>{new Date(a.created).toLocaleDateString()}</small>
                  <button
                    aria-label={'Favorite ' + a.name}
                    className={a.favorite ? 'lime' : ''}
                    onClick={() =>
                      mutate(() => patch('/assets/' + a.id, { favorite: !a.favorite }))
                    }
                  >
                    <Icon name="Heart" size={16} />
                  </button>
                  <button
                    aria-label={'Edit ' + a.name}
                    onClick={() => {
                      setEdit(a);
                      setName(a.name);
                      setMove(a.folder);
                    }}
                  >
                    <Icon name="Ellipsis" size={18} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          icon="Layers"
          title={filter === 'All' ? 'Make room for your first idea' : 'Nothing here yet'}
          text="Upload a reference or create something in the studio."
          action="Upload media"
          onClick={() => document.querySelector('input[aria-label="Upload media"]').click()}
        />
      )}
      {newFolder && (
        <Modal
          title={typeof newFolder === 'string' ? 'Rename folder' : 'New folder'}
          close={() => setNewFolder(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await mutate(
                () =>
                  typeof newFolder === 'string'
                    ? patch('/folders/' + newFolder, { name: folderName })
                    : post('/folders', { name: folderName }),
                'Folder saved',
              );
              setNewFolder(false);
            }}
          >
            <label>
              Folder name
              <input
                autoFocus
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
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
      {edit && (
        <Modal title="Edit asset" close={() => setEdit(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await mutate(
                () => patch('/assets/' + edit.id, { name, folder: move }),
                'Asset updated',
              );
              setEdit(null);
            }}
          >
            <label>
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
              />
            </label>
            <label>
              Folder
              <select value={move} onChange={(e) => setMove(e.target.value)}>
                <option value="">No folder</option>
                {folders.map((f) => (
                  <option value={f.id} key={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="modal-actions">
              <Button
                onClick={() => {
                  setConfirm(edit);
                  setEdit(null);
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
      {confirm && (
        <Modal title="Delete this asset?" close={() => setConfirm(null)}>
          <p>Remove “{confirm.name}” from your library? This action cannot be undone.</p>
          <div className="modal-actions">
            <Button onClick={() => setConfirm(null)}>Keep asset</Button>
            <Button
              onClick={async () => {
                await mutate(
                  () => api('/assets/' + confirm.id, { method: 'DELETE' }),
                  'Asset deleted',
                );
                setConfirm(null);
              }}
            >
              Delete asset
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

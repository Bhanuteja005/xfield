import { useState, useRef } from 'react';
import { post, patch } from '../../lib/api';
import { media } from '../../lib/data';
import { Icon, Button, Modal } from '../../components/ui';
export function Canvas({ seed, assets, refresh, notify, go }) {
  const project = seed?.project;
  const [name, setName] = useState(project?.name || 'Untitled project'),
    [nodes, setNodes] = useState(
      project?.data?.nodes || [
        {
          id: 'welcome',
          type: 'note',
          text: 'A space for your next big idea.\nAdd notes, references and visual inspiration.',
          x: 50,
          y: 70,
          color: '#e6e9ae',
        },
        {
          id: 'image1',
          type: 'image',
          image: media[1].image,
          text: 'Visual direction',
          x: 355,
          y: 130,
        },
      ],
    ),
    [selected, setSelected] = useState(null),
    [savedId, setSavedId] = useState(project?.id),
    [saving, setSaving] = useState(false),
    [picker, setPicker] = useState(false),
    [zoom, setZoom] = useState(1),
    [dirty, setDirty] = useState(false);
  const drag = useRef(null);
  const update = (id, data) => {
    setDirty(true);
    setNodes((n) => n.map((x) => (x.id === id ? { ...x, ...data } : x)));
  };
  const add = (type, image) => {
    setDirty(true);
    const id = crypto.randomUUID();
    setNodes((n) => [
      ...n,
      {
        id,
        type,
        text: type === 'note' ? 'Write your idea…' : 'Describe what to create…',
        image,
        x: 60 + Math.random() * 400,
        y: 90 + Math.random() * 240,
        color: '#e6e9ae',
      },
    ]);
    setSelected(id);
  };
  const save = async () => {
    setSaving(true);
    try {
      if (savedId) await patch('/projects/' + savedId, { name, data: { nodes } });
      else {
        const p = await post('/projects', { name, data: { nodes } });
        setSavedId(p.id);
      }
      setDirty(false);
      await refresh();
      notify('Project saved');
    } catch (e) {
      notify(e.message);
    } finally {
      setSaving(false);
    }
  };
  const active = nodes.find((n) => n.id === selected);
  return (
    <div className="canvas-wrap">
      <div className="canvas-header">
        <button onClick={() => go('projects')} aria-label="Back to projects">
          <Icon name="ArrowLeft" />
        </button>
        <input
          aria-label="Project name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setDirty(true);
          }}
        />
        <span>{dirty ? 'Unsaved changes' : savedId ? 'Saved' : 'New project'}</span>
        <Button icon="Save" primary onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save project'}
        </Button>
      </div>
      <div
        className="canvas-board"
        onPointerMove={(e) => {
          if (drag.current) {
            const d = drag.current;
            update(d.id, {
              x: Math.max(0, d.x + (e.clientX - d.clientX) / zoom),
              y: Math.max(0, d.y + (e.clientY - d.clientY) / zoom),
            });
          }
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <div className="canvas-nodes" style={{ transform: `scale(${zoom})` }}>
          {nodes.map((n) => (
            <article
              key={n.id}
              className={`canvas-node ${n.type} ${selected === n.id ? 'selected' : ''}`}
              style={{ left: n.x, top: n.y, background: n.type === 'note' ? n.color : undefined }}
              onClick={() => setSelected(n.id)}
            >
              <div
                className="node-handle"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  drag.current = {
                    id: n.id,
                    x: n.x,
                    y: n.y,
                    clientX: e.clientX,
                    clientY: e.clientY,
                  };
                  setSelected(n.id);
                }}
              >
                <Icon name="GripHorizontal" size={14} />
                {n.type === 'image' ? 'Reference' : n.type === 'note' ? 'Note' : 'Generation'}
              </div>
              {n.image && <img src={n.image} alt={n.text} />}
              <textarea
                aria-label={n.type + ' content'}
                value={n.text}
                onChange={(e) => update(n.id, { text: e.target.value })}
              />
              {n.type === 'generation' && (
                <Button primary onClick={() => go('image', { prompt: n.text })}>
                  Open in studio <Icon name="ArrowUpRight" size={14} />
                </Button>
              )}
            </article>
          ))}
        </div>
      </div>
      <div className="canvas-toolbar">
        <button title="Add note" aria-label="Add note" onClick={() => add('note')}>
          <Icon name="StickyNote" />
        </button>
        <button title="Add reference" aria-label="Add reference" onClick={() => setPicker(true)}>
          <Icon name="ImagePlus" />
        </button>
        <button
          title="Add generation"
          aria-label="Add generation"
          onClick={() => add('generation')}
        >
          <Icon name="Sparkles" />
        </button>
        <span />
        <button aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}>
          <Icon name="Minus" />
        </button>
        <small>{Math.round(zoom * 100)}%</small>
        <button aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}>
          <Icon name="Plus" />
        </button>
        {active && (
          <>
            <span />
            <button
              aria-label="Delete selected element"
              onClick={() => {
                setNodes((n) => n.filter((x) => x.id !== selected));
                setSelected(null);
                setDirty(true);
              }}
            >
              <Icon name="Trash2" />
            </button>
          </>
        )}
      </div>
      {active && (
        <div className="canvas-inspector">
          <small>ELEMENT DETAILS</small>
          <h3>{active.type}</h3>
          {active.type === 'note' && (
            <label>
              Note color
              <input
                aria-label="Note color"
                type="color"
                value={active.color}
                onChange={(e) => update(active.id, { color: e.target.value })}
              />
            </label>
          )}
          <label>
            Position X
            <input
              type="number"
              value={Math.round(active.x)}
              onChange={(e) => update(active.id, { x: Number(e.target.value) })}
            />
          </label>
          <label>
            Position Y
            <input
              type="number"
              value={Math.round(active.y)}
              onChange={(e) => update(active.id, { y: Number(e.target.value) })}
            />
          </label>
          <small>Drag the top handle to move an element.</small>
        </div>
      )}
      {picker && (
        <Modal title="Add a reference" close={() => setPicker(false)} wide>
          <div className="asset-grid">
            {[...assets.filter((a) => a.kind === 'image'), ...media].map((a) => (
              <button
                className="asset-card"
                key={a.id}
                onClick={() => {
                  add('image', a.url || a.image);
                  setPicker(false);
                }}
              >
                <img src={a.url || a.image} alt={a.name} />
                <b>{a.name}</b>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

import { useRef, useState, type PointerEvent } from 'react';
import { Button, Icon, Modal } from '../../components/ui';
import { patch, post } from '../../lib/api';
import { media } from '../../lib/data';
import { isSample, messageOf, type CanvasNode, type StudioApi } from '../../lib/types';

type Props = Pick<StudioApi, 'seed' | 'assets' | 'refresh' | 'notify' | 'go'>;

/** Where a node and the pointer were when a drag started. */
interface DragOrigin {
  id: string;
  x: number;
  y: number;
  clientX: number;
  clientY: number;
}

const NOTE_COLOR = '#e6e9ae';
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.5;
const ZOOM_STEP = 0.1;

const NODE_LABELS: Record<CanvasNode['type'], string> = {
  image: 'Reference',
  note: 'Note',
  generation: 'Generation',
};

const starterNodes = (): CanvasNode[] => [
  {
    id: 'welcome',
    type: 'note',
    text: 'A space for your next big idea.\nAdd notes, references and visual inspiration.',
    x: 50,
    y: 70,
    color: NOTE_COLOR,
  },
  {
    id: 'image1',
    type: 'image',
    image: media[1]?.image,
    text: 'Visual direction',
    x: 355,
    y: 130,
  },
];

export function Canvas({ seed, assets, refresh, notify, go }: Props) {
  const project = seed?.project;
  const [name, setName] = useState(project?.name || 'Untitled project');
  const [nodes, setNodes] = useState<CanvasNode[]>(() => project?.data?.nodes || starterNodes());
  const [selected, setSelected] = useState<string | null>(null);
  const [savedId, setSavedId] = useState(project?.id);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [dirty, setDirty] = useState(false);
  const drag = useRef<DragOrigin | null>(null);

  const update = (id: string, changes: Partial<CanvasNode>) => {
    setDirty(true);
    setNodes((current) => current.map((node) => (node.id === id ? { ...node, ...changes } : node)));
  };

  const add = (type: CanvasNode['type'], image?: string) => {
    setDirty(true);
    const id = crypto.randomUUID();
    setNodes((current) => [
      ...current,
      {
        id,
        type,
        text: type === 'note' ? 'Write your idea…' : 'Describe what to create…',
        image,
        x: 60 + Math.random() * 400,
        y: 90 + Math.random() * 240,
        color: NOTE_COLOR,
      },
    ]);
    setSelected(id);
  };

  const removeSelected = () => {
    setNodes((current) => current.filter((node) => node.id !== selected));
    setSelected(null);
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (savedId) await patch(`/projects/${savedId}`, { name, data: { nodes } });
      else {
        const created = await post<{ id: string }>('/projects', { name, data: { nodes } });
        setSavedId(created.id);
        // Put the id in the address so a reload reopens this project, not a blank canvas.
        window.history.replaceState(null, '', `?project=${encodeURIComponent(created.id)}`);
      }
      setDirty(false);
      await refresh();
      notify('Project saved');
    } catch (error) {
      notify(messageOf(error));
    } finally {
      setSaving(false);
    }
  };

  const startDrag = (event: PointerEvent<HTMLDivElement>, node: CanvasNode) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      id: node.id,
      x: node.x,
      y: node.y,
      clientX: event.clientX,
      clientY: event.clientY,
    };
    setSelected(node.id);
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const origin = drag.current;
    if (!origin) return;
    update(origin.id, {
      x: Math.max(0, origin.x + (event.clientX - origin.clientX) / zoom),
      y: Math.max(0, origin.y + (event.clientY - origin.clientY) / zoom),
    });
  };

  const endDrag = () => {
    drag.current = null;
  };

  const active = nodes.find((node) => node.id === selected);
  const references = [...assets.filter((asset) => asset.kind === 'image'), ...media];

  return (
    <div className="canvas-wrap">
      <div className="canvas-header">
        <button onClick={() => go('projects')} aria-label="Back to projects">
          <Icon name="ArrowLeft" />
        </button>
        <input
          aria-label="Project name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setDirty(true);
          }}
        />
        <span>{dirty ? 'Unsaved changes' : savedId ? 'Saved' : 'New project'}</span>
        <Button icon="Save" primary onClick={() => void save()} disabled={saving}>
          {saving ? 'Saving…' : 'Save project'}
        </Button>
      </div>
      <div
        className="canvas-board"
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="canvas-nodes" style={{ transform: `scale(${zoom})` }}>
          {nodes.map((node) => (
            <article
              key={node.id}
              className={`canvas-node ${node.type} ${selected === node.id ? 'selected' : ''}`}
              style={{
                left: node.x,
                top: node.y,
                background: node.type === 'note' ? node.color : undefined,
              }}
              onClick={() => setSelected(node.id)}
            >
              <div className="node-handle" onPointerDown={(event) => startDrag(event, node)}>
                <Icon name="GripHorizontal" size={14} />
                {NODE_LABELS[node.type]}
              </div>
              {node.image && <img src={node.image} alt={node.text} />}
              <textarea
                aria-label={`${node.type} content`}
                value={node.text}
                onChange={(event) => update(node.id, { text: event.target.value })}
              />
              {node.type === 'generation' && (
                <Button primary onClick={() => go('image', { prompt: node.text })}>
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
        <button
          aria-label="Zoom out"
          onClick={() => setZoom((current) => Math.max(MIN_ZOOM, current - ZOOM_STEP))}
        >
          <Icon name="Minus" />
        </button>
        <small>{Math.round(zoom * 100)}%</small>
        <button
          aria-label="Zoom in"
          onClick={() => setZoom((current) => Math.min(MAX_ZOOM, current + ZOOM_STEP))}
        >
          <Icon name="Plus" />
        </button>
        {active && (
          <>
            <span />
            <button aria-label="Delete selected element" onClick={removeSelected}>
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
                onChange={(event) => update(active.id, { color: event.target.value })}
              />
            </label>
          )}
          <label>
            Position X
            <input
              type="number"
              value={Math.round(active.x)}
              onChange={(event) => update(active.id, { x: Number(event.target.value) })}
            />
          </label>
          <label>
            Position Y
            <input
              type="number"
              value={Math.round(active.y)}
              onChange={(event) => update(active.id, { y: Number(event.target.value) })}
            />
          </label>
          <small>Drag the top handle to move an element.</small>
        </div>
      )}
      {picker && (
        <Modal title="Add a reference" close={() => setPicker(false)} wide>
          <div className="asset-grid">
            {references.map((reference) => {
              const source = isSample(reference) ? reference.image : reference.url || undefined;
              return (
                <button
                  className="asset-card"
                  key={reference.id}
                  onClick={() => {
                    add('image', source);
                    setPicker(false);
                  }}
                >
                  <img src={source} alt={reference.name} />
                  <b>{reference.name}</b>
                </button>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}

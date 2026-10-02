import { useState } from 'react';
import { post } from '../../lib/api';

import { Icon, Button, Modal, Empty, Heading } from '../../components/ui';
export function ProjectLibrary({ projects, go, refresh, notify }) {
  const [name, setName] = useState(''),
    [create, setCreate] = useState(false);
  return (
    <>
      <Heading
        eyebrow="IDEAS IN PROGRESS"
        title="Your projects"
        text="A home for every world you're building."
      >
        <Button icon="Plus" primary onClick={() => setCreate(true)}>
          New project
        </Button>
      </Heading>
      {projects.length ? (
        <div className="project-grid">
          {projects.map((p) => (
            <button
              className="project-card"
              key={p.id}
              onClick={() => go('canvas', { project: p })}
            >
              <div>
                {p.data?.nodes?.find((n) => n.image) ? (
                  <img src={p.data.nodes.find((n) => n.image).image} alt={p.name} />
                ) : (
                  <Icon name="Workflow" size={45} />
                )}
                <span className="pill">CANVAS</span>
              </div>
              <b>{p.name}</b>
              <small>
                {p.data?.nodes?.length || 0} elements · {new Date(p.created).toLocaleDateString()}
              </small>
            </button>
          ))}
        </div>
      ) : (
        <Empty
          icon="FolderOpen"
          title="A blank slate. A big possibility."
          text="Give your next creative project a place to come together."
          action="Create your first project"
          onClick={() => setCreate(true)}
        />
      )}
      {create && (
        <Modal title="Create a project" close={() => setCreate(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const result = await post('/projects', { name, data: { nodes: [] } });
                await refresh();
                setCreate(false);
                go('canvas', { project: { id: result.id, name, data: { nodes: [] } } });
              } catch (e) {
                notify(e.message);
              }
            }}
          >
            <label>
              Project name
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My next big idea"
                required
                maxLength={80}
              />
            </label>
            <Button primary type="submit">
              Create project
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}

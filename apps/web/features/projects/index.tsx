import { useState, type FormEvent } from 'react';
import { Button, Empty, Heading, Icon, Modal } from '../../components/ui';
import { post } from '../../lib/api';
import { messageOf, type StudioApi } from '../../lib/types';

type Props = Pick<StudioApi, 'projects' | 'go' | 'refresh' | 'notify'>;

export function ProjectLibrary({ projects, go, refresh, notify }: Props) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const createProject = async (event: FormEvent) => {
    event.preventDefault();
    // A second submit while the first is in flight would create a duplicate.
    if (submitting) return;
    setSubmitting(true);
    const title = name.trim();
    try {
      const result = await post<{ id: string }>('/projects', { name: title, data: { nodes: [] } });
      await refresh();
      setCreating(false);
      setName('');
      go('canvas', {
        project: { id: result.id, name: title, data: { nodes: [] }, created: Date.now() },
      });
    } catch (error) {
      notify(messageOf(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Heading
        eyebrow="IDEAS IN PROGRESS"
        title="Your projects"
        text="A home for every world you're building."
      >
        <Button icon="Plus" primary onClick={() => setCreating(true)}>
          New project
        </Button>
      </Heading>
      {projects.length ? (
        <div className="project-grid">
          {projects.map((project) => {
            const cover = project.data?.nodes?.find((node) => node.image)?.image;
            return (
              <button
                className="project-card"
                key={project.id}
                onClick={() => go('canvas', { project })}
              >
                <div>
                  {cover ? (
                    <img src={cover} alt={project.name} />
                  ) : (
                    <Icon name="Workflow" size={45} />
                  )}
                  <span className="pill">CANVAS</span>
                </div>
                <b>{project.name}</b>
                <small>
                  {project.data?.nodes?.length || 0} elements ·{' '}
                  {new Date(project.created).toLocaleDateString()}
                </small>
              </button>
            );
          })}
        </div>
      ) : (
        <Empty
          icon="FolderOpen"
          title="A blank slate. A big possibility."
          text="Give your next creative project a place to come together."
          action="Create your first project"
          onClick={() => setCreating(true)}
        />
      )}
      {creating && (
        <Modal title="Create a project" close={() => setCreating(false)}>
          <form onSubmit={(event) => void createProject(event)}>
            <label>
              Project name
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
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

import { useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  AudioLines,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  Compass,
  Copy,
  CircleHelp,
  Download,
  Ellipsis,
  Folder,
  FolderOpen,
  FolderPlus,
  Gem,
  Globe,
  GraduationCap,
  Grid2X2,
  GripHorizontal,
  Heart,
  History,
  Image,
  ImagePlus,
  Info,
  KeyRound,
  Layers,
  LoaderCircle,
  Megaphone,
  Menu,
  Minus,
  Pencil,
  Plus,
  Save,
  Search,
  Settings,
  Sparkles,
  StickyNote,
  Trash2,
  Upload,
  User,
  Users,
  Video,
  WandSparkles,
  Workflow,
  X,
  Zap,
  AlertCircle,
} from 'lucide-react';
const Icons = {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  AudioLines,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  Compass,
  Copy,
  CircleHelp,
  Download,
  Ellipsis,
  Folder,
  FolderOpen,
  FolderPlus,
  Gem,
  Globe,
  GraduationCap,
  Grid2X2,
  GripHorizontal,
  Heart,
  History,
  Image,
  ImagePlus,
  Info,
  KeyRound,
  Layers,
  LoaderCircle,
  Megaphone,
  Menu,
  Minus,
  Pencil,
  Plus,
  Save,
  Search,
  Settings,
  Sparkles,
  StickyNote,
  Trash2,
  Upload,
  User,
  Users,
  Video,
  WandSparkles,
  Workflow,
  X,
  Zap,
  AlertCircle,
};
export const Icon = ({ name, size = 18, ...p }) => {
  const C = Icons[name] || Icons.Sparkles;
  return <C size={size} strokeWidth={1.7} {...p} />;
};
export function Button({ children, icon, onClick, primary = false, className = '', ...p }) {
  return (
    <button
      type="button"
      className={`btn ${primary ? 'primary' : ''} ${className}`}
      onClick={onClick}
      {...p}
    >
      {icon && <Icon name={icon} size={16} />} {children}
    </button>
  );
}
export function Modal({ title, close, children, wide = false }) {
  const ref = useRef();
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.focus();
    const h = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        const focusables = ref.current.querySelectorAll(
          'button,a,input,select,textarea,[tabindex="0"]',
        );
        const first = focusables[0],
          last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    const element = ref.current;
    element?.addEventListener('keydown', h);
    return () => {
      element?.removeEventListener('keydown', h);
      previous?.focus();
    };
  }, [close]);
  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        className={`modal ${wide ? 'wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="Close dialog" onClick={close}>
            <Icon name="X" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ icon, title, text, action, onClick }) {
  return (
    <div className="empty">
      <div>
        <Icon name={icon} size={30} />
      </div>
      <h2>{title}</h2>
      <p>{text}</p>
      {action && (
        <Button primary onClick={onClick}>
          {action}
        </Button>
      )}
    </div>
  );
}

export function Gallery({ items, setDetail }) {
  return (
    <div className="gallery">
      {items.map((m, i) => (
        <button className={`media-card h${i % 3}`} key={m.id} onClick={() => setDetail(m)}>
          <img src={m.image || m.url} loading="lazy" alt={m.name} />
          <span className="media-category">{m.category || m.kind}</span>
          <div className="media-caption">
            <b>{m.name}</b>
            <small>
              {m.creator || m.model}
              <Icon name="ArrowUpRight" size={16} />
            </small>
          </div>
          <span className="play-icon">
            <Icon name="Sparkles" size={17} />
          </span>
        </button>
      ))}
    </div>
  );
}

export function Heading({ eyebrow, title, text, children }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
      {children}
    </div>
  );
}

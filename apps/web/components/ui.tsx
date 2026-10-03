'use client';
import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import {
  AlertCircle,
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
  CircleHelp,
  Clapperboard,
  Compass,
  Copy,
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
  LogOut,
  Mail,
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
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';

// Icons are looked up by name so data files can reference them as plain strings.
const Icons: Record<string, LucideIcon> = {
  AlertCircle,
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
  CircleHelp,
  Clapperboard,
  Compass,
  Copy,
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
  LogOut,
  Mail,
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
};

interface IconProps extends LucideProps {
  /** A name from the registry above. Unknown names fall back to a sparkle. */
  name: string;
}

export function Icon({ name, size = 18, ...props }: IconProps) {
  const Glyph = Icons[name] ?? Sparkles;
  return <Glyph size={size} strokeWidth={1.7} {...props} />;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: string;
  primary?: boolean;
}

export function Button({ children, icon, primary = false, className = '', ...props }: ButtonProps) {
  return (
    <button type="button" className={`btn ${primary ? 'primary' : ''} ${className}`} {...props}>
      {icon && <Icon name={icon} size={16} />} {children}
    </button>
  );
}

interface ModalProps {
  title: string;
  close: () => void;
  children: ReactNode;
  wide?: boolean;
}

const FOCUSABLE = 'button,a,input,select,textarea,[tabindex="0"]';

/** An accessible dialog: traps focus, closes on Escape and restores focus on close. */
export function Modal({ title, close, children, wide = false }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    const previous = document.activeElement;
    element?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key !== 'Tab' || !element) return;
      const focusables = element.querySelectorAll<HTMLElement>(FOCUSABLE);
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    element?.addEventListener('keydown', onKey);
    return () => {
      element?.removeEventListener('keydown', onKey);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [close]);
  return (
    <div
      className="modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
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

interface EmptyProps {
  icon: string;
  title: string;
  text: string;
  action?: string;
  onClick?: () => void;
}

export function Empty({ icon, title, text, action, onClick }: EmptyProps) {
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

/** One gallery tile: a curated sample, an asset or a published community item. */
export interface GalleryItem {
  id: string;
  name: string;
  image?: string;
  url?: string;
  category?: string;
  kind?: string;
  creator?: string;
  model?: string;
}

interface GalleryProps<Item extends GalleryItem> {
  items: Item[];
  setDetail: (item: Item) => void;
}

export function Gallery<Item extends GalleryItem>({ items, setDetail }: GalleryProps<Item>) {
  return (
    <div className="gallery">
      {items.map((item, index) => (
        <button
          className={`media-card h${index % 3}`}
          key={item.id}
          onClick={() => setDetail(item)}
        >
          <img src={item.image || item.url} loading="lazy" alt={item.name} />
          <span className="media-category">{item.category || item.kind}</span>
          <div className="media-caption">
            <b>{item.name}</b>
            <small>
              {item.creator || item.model}
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

interface HeadingProps {
  eyebrow?: string;
  title: string;
  text?: string;
  children?: ReactNode;
}

export function Heading({ eyebrow, title, text, children }: HeadingProps) {
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

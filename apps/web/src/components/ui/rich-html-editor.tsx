'use client';

import {
  Bold,
  Code,
  Code2,
  Eraser,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Maximize2,
  Minimize2,
  Minus,
  MousePointerClick,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  Unlink,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';

import { sanitizeBlogHtml } from '@/lib/blog-format';
import { cn } from '@/lib/utils';

const ALLOWED: Record<string, string[]> = {
  p: [],
  h2: [],
  h3: [],
  h4: [],
  strong: [],
  em: [],
  u: [],
  s: [],
  code: [],
  pre: [],
  blockquote: [],
  ul: [],
  ol: [],
  li: [],
  br: [],
  hr: [],
  a: ['href', 'data-kind'],
  img: ['src', 'alt'],
};
const RENAME: Record<string, string> = { b: 'strong', i: 'em', strike: 's', del: 's', h1: 'h2', h5: 'h4', h6: 'h4', div: 'p' };

/** Keeps only the tags the blog styles, drops styles/classes/scripts, and unwraps everything else. */
export function cleanHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const walk = (node: Node, out: Document): Node[] => {
    if (node.nodeType === Node.TEXT_NODE) return [out.createTextNode(node.textContent ?? '')];
    if (node.nodeType !== Node.ELEMENT_NODE) return [];
    const el = node as HTMLElement;
    const raw = el.tagName.toLowerCase();
    if (['script', 'style', 'iframe', 'object', 'embed', 'meta', 'link', 'head', 'title'].includes(raw)) return [];
    const tag = RENAME[raw] ?? raw;
    const children = [...el.childNodes].flatMap((c) => walk(c, out));
    if (!(tag in ALLOWED)) return children;
    const next = out.createElement(tag);
    for (const attr of ALLOWED[tag]) {
      const value = el.getAttribute(attr);
      if (!value) continue;
      if ((attr === 'href' || attr === 'src') && !/^(https?:|mailto:|tel:|\/|#)/i.test(value.trim())) continue;
      if (attr === 'data-kind' && value !== 'button') continue;
      next.setAttribute(attr, value.trim());
    }
    if (tag === 'a') next.setAttribute('rel', 'noopener');
    children.forEach((c) => next.appendChild(c));
    return [next];
  };
  const out = document.implementation.createHTMLDocument('');
  const container = out.createElement('div');
  [...doc.body.childNodes].flatMap((c) => walk(c, out)).forEach((n) => container.appendChild(n));
  return container.innerHTML
    .replace(/<p>(\s|<br>|&nbsp;)*<\/p>/g, '')
    .replace(/(<br>\s*)+<\/(p|li|h2|h3|h4|blockquote)>/g, '</$2>')
    .trim();
}

function exec(command: string, value?: string) {
  document.execCommand(command, false, value);
}

type Popover = { kind: 'link' | 'image' | 'button'; url: string; alt: string; text: string } | null;

const attrSafe = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function RichHtmlEditor({
  value,
  onChange,
  placeholder = 'Start writing…',
  minHeight = 320,
  bare = false,
  allowFullscreen = true,
  onUploadImage,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  /** Drop the outer border when the editor sits inside another framed box. */
  bare?: boolean;
  allowFullscreen?: boolean;
  /** Uploads a picture and returns its public link; enables upload, drag-and-drop and paste of images. */
  onUploadImage?: (file: File) => Promise<string>;
}) {
  const editor = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const lastEmitted = useRef<string | null>(null);
  const savedRange = useRef<Range | null>(null);
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [mode, setMode] = useState<'visual' | 'html'>('visual');
  const [source, setSource] = useState(value);
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [block, setBlock] = useState('p');
  const [popover, setPopover] = useState<Popover>(null);
  const [full, setFull] = useState(false);
  const [empty, setEmpty] = useState(!value.trim());
  const [stats, setStats] = useState({ words: 0, chars: 0 });

  const measure = useCallback(() => {
    const text = editor.current?.innerText ?? '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setStats({ words, chars: text.replace(/\s/g, '').length });
    setEmpty(!text.trim() && !editor.current?.querySelector('img,hr'));
  }, []);

  // Load outside changes (opening another post) without disturbing the caret while typing.
  useEffect(() => {
    if (value === lastEmitted.current) return;
    const html = value.trim() ? sanitizeBlogHtml(value) : '';
    if (editor.current) editor.current.innerHTML = html;
    setSource(value);
    lastEmitted.current = value;
    measure();
  }, [value, measure]);

  useEffect(() => {
    document.execCommand('defaultParagraphSeparator', false, 'p');
    document.execCommand('styleWithCSS', false, 'false');
    const onSelection = () => {
      const sel = window.getSelection();
      if (!editor.current || !sel?.anchorNode || !editor.current.contains(sel.anchorNode)) return;
      setActive({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikeThrough'),
        ul: document.queryCommandState('insertUnorderedList'),
        ol: document.queryCommandState('insertOrderedList'),
        link: Boolean(sel.anchorNode.parentElement?.closest('a')),
      });
      setBlock((document.queryCommandValue('formatBlock') || 'p').toLowerCase().replace(/[<>]/g, ''));
    };
    document.addEventListener('selectionchange', onSelection);
    return () => document.removeEventListener('selectionchange', onSelection);
  }, []);

  const emit = useCallback(() => {
    if (!editor.current) return;
    const html = cleanHtml(editor.current.innerHTML);
    lastEmitted.current = html;
    onChange(html);
    measure();
  }, [onChange, measure]);

  const run = (command: string, val?: string) => {
    editor.current?.focus();
    exec(command, val);
    emit();
  };

  const setBlockTag = (tag: string) => run('formatBlock', `<${tag}>`);

  const inlineCode = () => {
    editor.current?.focus();
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString();
    exec('insertHTML', `<code>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</code>`);
    emit();
  };

  const saveRange = () => {
    const sel = window.getSelection();
    savedRange.current = sel && sel.rangeCount && editor.current?.contains(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : null;
  };

  /** Puts the caret back where it was before a toolbar form took focus (or at the end). */
  const restoreRange = () => {
    editor.current?.focus();
    const sel = window.getSelection();
    if (!sel || !editor.current) return sel;
    sel.removeAllRanges();
    if (savedRange.current && editor.current.contains(savedRange.current.startContainer)) {
      sel.addRange(savedRange.current);
    } else {
      const end = document.createRange();
      end.selectNodeContents(editor.current);
      end.collapse(false);
      sel.addRange(end);
    }
    return sel;
  };

  const openPopover = (kind: 'link' | 'image' | 'button') => {
    saveRange();
    const sel = window.getSelection();
    const existing = kind === 'link' ? sel?.anchorNode?.parentElement?.closest('a')?.getAttribute('href') ?? '' : '';
    const text = kind === 'button' && sel && !sel.isCollapsed ? sel.toString().trim() : '';
    setPopover({ kind, url: existing, alt: '', text });
  };

  const insertImage = (url: string, alt: string) => {
    restoreRange();
    exec('insertHTML', `<img src="${attrSafe(url)}" alt="${attrSafe(alt)}" /><p><br></p>`);
    saveRange();
    emit();
  };

  const uploadFiles = async (files: File[]) => {
    if (!onUploadImage) return;
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (!images.length) return;
    setUploadError(null);
    setPopover(null);
    for (const file of images) {
      if (file.size > 5 * 1024 * 1024) {
        setUploadError(`${file.name} is over 5 MB. Use a smaller picture.`);
        continue;
      }
      setUploading((n) => n + 1);
      try {
        const url = await onUploadImage(file);
        insertImage(url, file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'The picture could not be uploaded.');
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const applyPopover = (e: FormEvent) => {
    e.preventDefault();
    if (!popover) return;
    const url = popover.url.trim();
    if (url && /^(https?:|mailto:|tel:|\/)/i.test(url)) {
      const sel = restoreRange();
      if (popover.kind === 'link') {
        if (sel && sel.isCollapsed) exec('insertHTML', `<a href="${attrSafe(url)}">${url.replace(/</g, '&lt;')}</a>`);
        else exec('createLink', url);
      } else if (popover.kind === 'button') {
        const label = (popover.text.trim() || 'Learn more').replace(/</g, '&lt;');
        exec('insertHTML', `<p><a href="${attrSafe(url)}" data-kind="button">${label}</a></p><p><br></p>`);
      } else {
        exec('insertHTML', `<img src="${attrSafe(url)}" alt="${attrSafe(popover.alt)}" /><p><br></p>`);
      }
      emit();
    }
    setPopover(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openPopover('link');
    }
  };

  const switchMode = () => {
    if (mode === 'visual') {
      setSource(editor.current ? cleanHtml(editor.current.innerHTML) : value);
      setMode('html');
      return;
    }
    const html = cleanHtml(sanitizeBlogHtml(source));
    if (editor.current) editor.current.innerHTML = html;
    lastEmitted.current = html;
    onChange(html);
    measure();
    setMode('visual');
  };

  const tools: Array<{ icon: LucideIcon; label: string; on?: boolean; act: () => void } | 'sep'> = [
    { icon: Pilcrow, label: 'Paragraph', on: block === 'p' || block === 'div', act: () => setBlockTag('p') },
    { icon: Heading2, label: 'Heading', on: block === 'h2', act: () => setBlockTag('h2') },
    { icon: Heading3, label: 'Subheading', on: block === 'h3', act: () => setBlockTag('h3') },
    { icon: Quote, label: 'Quote', on: block === 'blockquote', act: () => setBlockTag(block === 'blockquote' ? 'p' : 'blockquote') },
    'sep',
    { icon: Bold, label: 'Bold (Ctrl+B)', on: active.bold, act: () => run('bold') },
    { icon: Italic, label: 'Italic (Ctrl+I)', on: active.italic, act: () => run('italic') },
    { icon: Underline, label: 'Underline (Ctrl+U)', on: active.underline, act: () => run('underline') },
    { icon: Strikethrough, label: 'Strikethrough', on: active.strike, act: () => run('strikeThrough') },
    { icon: Code, label: 'Inline code', act: inlineCode },
    'sep',
    { icon: List, label: 'Bullet list', on: active.ul, act: () => run('insertUnorderedList') },
    { icon: ListOrdered, label: 'Numbered list', on: active.ol, act: () => run('insertOrderedList') },
    { icon: Minus, label: 'Divider line', act: () => run('insertHorizontalRule') },
    'sep',
    { icon: Link2, label: 'Link (Ctrl+K)', on: active.link, act: () => openPopover('link') },
    { icon: Unlink, label: 'Remove link', act: () => run('unlink') },
    { icon: ImageIcon, label: onUploadImage ? 'Image (upload or link)' : 'Image', act: () => openPopover('image') },
    { icon: MousePointerClick, label: 'Button link', act: () => openPopover('button') },
    'sep',
    { icon: Undo2, label: 'Undo (Ctrl+Z)', act: () => run('undo') },
    { icon: Redo2, label: 'Redo (Ctrl+Y)', act: () => run('redo') },
    { icon: Eraser, label: 'Clear formatting', act: () => {
        run('removeFormat');
        setBlockTag('p');
      } },
  ];

  return (
    <div
      className={cn(
        'overflow-hidden bg-surface-elevated',
        !bare && 'rounded-2xl border border-border focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15',
        full && 'fixed inset-2 z-[180] flex flex-col rounded-2xl border border-border shadow-2xl sm:inset-6',
      )}
    >
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-border bg-surface/90 px-1.5 py-1.5 backdrop-blur">
        {mode === 'visual'
          ? tools.map((t, i) =>
              t === 'sep' ? (
                <span key={`s${i}`} aria-hidden className="mx-1 h-5 w-px bg-border" />
              ) : (
                <button
                  key={t.label}
                  type="button"
                  title={t.label}
                  aria-label={t.label}
                  aria-pressed={t.on ?? undefined}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={t.act}
                  className={cn(
                    'inline-flex h-8 w-8 items-center justify-center rounded-lg transition',
                    t.on ? 'bg-brand text-white dark:text-[#071f14]' : 'text-muted hover:bg-background hover:text-foreground',
                  )}
                >
                  <t.icon className="h-4 w-4" />
                </button>
              ),
            )
          : (
            <span className="px-2 text-xs font-medium text-muted">Editing the HTML directly. Switch back to see it formatted.</span>
          )}
        <span className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            onClick={switchMode}
            title={mode === 'visual' ? 'Edit HTML' : 'Back to the visual editor'}
            className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition', mode === 'html' ? 'bg-brand text-white dark:text-[#071f14]' : 'text-muted hover:bg-background hover:text-foreground')}
          >
            <Code2 className="h-4 w-4" /> HTML
          </button>
          {allowFullscreen ? (
          <button
            type="button"
            onClick={() => setFull((f) => !f)}
            title={full ? 'Exit full screen' : 'Full screen'}
            aria-label={full ? 'Exit full screen' : 'Full screen'}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-background hover:text-foreground"
          >
            {full ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          ) : null}
        </span>
      </div>

      {popover ? (
        <form onSubmit={applyPopover} className="flex flex-wrap items-center gap-2 border-b border-border bg-brand-soft/40 px-3 py-2">
          {popover.kind === 'image' && onUploadImage ? (
            <>
              <button type="button" onClick={() => fileInput.current?.click()} className="btn-primary h-9 px-3 py-0 text-xs">
                <Upload className="h-3.5 w-3.5" /> Upload from device
              </button>
              <span className="text-[11px] text-muted">or paste a link:</span>
            </>
          ) : null}
          {popover.kind === 'button' ? (
            <input
              autoFocus
              value={popover.text}
              onChange={(e) => setPopover({ ...popover, text: e.target.value })}
              placeholder="Button text, e.g. See open jobs"
              maxLength={60}
              className="input-field h-9 min-w-[10rem] flex-1 py-1 text-sm"
            />
          ) : null}
          <input
            autoFocus={popover.kind !== 'button' && !(popover.kind === 'image' && onUploadImage)}
            value={popover.url}
            onChange={(e) => setPopover({ ...popover, url: e.target.value })}
            placeholder={popover.kind === 'image' ? 'https://…/picture.jpg' : 'https://… or /page'}
            className="input-field h-9 min-w-[12rem] flex-1 py-1 text-sm"
          />
          {popover.kind === 'image' ? (
            <input
              value={popover.alt}
              onChange={(e) => setPopover({ ...popover, alt: e.target.value })}
              placeholder="Describe the picture (for screen readers)"
              className="input-field h-9 min-w-[12rem] flex-1 py-1 text-sm"
            />
          ) : null}
          <button type="submit" className={cn('h-9 px-3 py-0 text-xs', popover.kind === 'image' && onUploadImage ? 'btn-secondary' : 'btn-primary')}>
            {popover.kind === 'link' ? 'Add link' : popover.kind === 'button' ? 'Add button' : 'Insert from link'}
          </button>
          <button type="button" onClick={() => setPopover(null)} className="px-2 text-xs text-muted hover:text-foreground">
            Cancel
          </button>
        </form>
      ) : null}
      {onUploadImage ? (
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          hidden
          onChange={(e) => {
            void uploadFiles([...(e.target.files ?? [])]);
            e.target.value = '';
          }}
        />
      ) : null}

      <div className={cn('relative', full && 'min-h-0 flex-1 overflow-y-auto')}>
        <div
          ref={editor}
          role="textbox"
          aria-multiline="true"
          aria-label="Content"
          contentEditable={mode === 'visual'}
          suppressContentEditableWarning
          onInput={emit}
          onBlur={emit}
          onKeyDown={onKeyDown}
          onPaste={(e) => {
            const pictures = [...e.clipboardData.files].filter((f) => f.type.startsWith('image/'));
            if (pictures.length && onUploadImage) {
              e.preventDefault();
              saveRange();
              void uploadFiles(pictures);
              return;
            }
            const html = e.clipboardData.getData('text/html');
            if (!html) return;
            e.preventDefault();
            exec('insertHTML', cleanHtml(html));
            emit();
          }}
          onDragOver={(e) => {
            if (onUploadImage && [...e.dataTransfer.items].some((i) => i.kind === 'file')) e.preventDefault();
          }}
          onDrop={(e) => {
            const pictures = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
            if (!pictures.length || !onUploadImage) return;
            e.preventDefault();
            const doc = document as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null };
            const at = doc.caretRangeFromPoint?.(e.clientX, e.clientY);
            if (at) savedRange.current = at;
            void uploadFiles(pictures);
          }}
          className={cn('prose-dealo prose-editor max-w-none px-4 py-4 outline-none sm:px-6', mode === 'html' && 'hidden', full && 'mx-auto max-w-3xl')}
          style={{ minHeight }}
        />
        {mode === 'visual' && empty ? <p className="pointer-events-none absolute left-4 top-4 text-muted sm:left-6">{placeholder}</p> : null}
        {mode === 'html' ? (
          <textarea
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              lastEmitted.current = e.target.value;
              onChange(e.target.value);
            }}
            spellCheck={false}
            className="block w-full resize-y bg-transparent px-4 py-4 font-mono text-xs leading-relaxed text-foreground outline-none"
            style={{ minHeight }}
          />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface/60 px-3 py-1.5 text-[11px] text-muted">
        <span className="flex items-center gap-2">
          {uploading ? (
            <span className="inline-flex items-center gap-1 font-semibold text-brand">
              <Loader2 className="h-3 w-3 animate-spin" /> Uploading {uploading > 1 ? `${uploading} pictures` : 'picture'}…
            </span>
          ) : uploadError ? (
            <span className="font-semibold text-danger">{uploadError}</span>
          ) : (
            <>
              {stats.words.toLocaleString()} words · {stats.chars.toLocaleString()} characters · about {Math.max(1, Math.round(stats.words / 220))} min read
            </>
          )}
        </span>
        <span className="hidden sm:inline">
          {onUploadImage ? 'Drag pictures in or paste them. ' : ''}Pasting from Word or Google Docs is tidied automatically.
        </span>
      </div>
    </div>
  );
}

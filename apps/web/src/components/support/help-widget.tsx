'use client';

import {
  type AssistantImage,
  type AssistantLink,
  type AssistantMessage,
  type AssistantReply,
  type AssistantWelcome,
} from '@dealo/shared';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowUp,
  ArrowUpRight,
  Bot,
  Briefcase,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  FileText,
  Headphones,
  ImagePlus,
  Loader2,
  Maximize2,
  Minimize2,
  Paperclip,
  RefreshCw,
  RotateCcw,
  Send,
  Square,
  SquarePen,
  ThumbsDown,
  ThumbsUp,
  UserRound,
  WifiOff,
  X,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';

import { AssistantMarkdown } from '@/components/assistant/markdown';
import { useLocale } from '@/components/i18n/locale-context';
import { useModal } from '@/components/modals/modal-context';
import { useToast } from '@/components/ui/toast';
import { useAuthSession } from '@/hooks/use-auth-session';
import { ApiError, apiFetch } from '@/lib/api';
import { OPEN_ASSISTANT_EVENT, streamAssistant } from '@/lib/assistant-client';
import { DARK_LOGO, LIGHT_LOGO } from '@/lib/brand';
import { WhatsAppIcon } from '@/components/whatsapp-icon';
import { prepareChatImage, type ChatImagePayload } from '@/lib/chat-image';
import { cn } from '@/lib/utils';
import { whatsappHref, whatsappMessageFor } from '@/lib/whatsapp';

type ChatItem = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  images?: AssistantImage[];
  imagePreviews?: string[];
  links?: AssistantLink[];
  suggestions?: string[];
  handoff?: boolean;
  source?: AssistantReply['source'];
  status?: 'streaming' | 'done' | 'error';
  rating?: 'up' | 'down';
};
type View = 'chat' | 'person' | 'sent';

const STORE_KEY = 'dealo-ai-chat-v2';
const NUDGE_KEY = 'dealo-ai-nudged';
const PERSON = 'Talk to a person';
const MAX_INPUT = 2000;

const CAPABILITIES: { icon: LucideIcon; title: string; body: string; prompt: string; gradient: string }[] = [
  {
    icon: FileText,
    title: 'Standout CV',
    body: 'Rewrite, tailor, download',
    prompt: 'Help me make my CV stand out for jobs in Nigeria',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    icon: Briefcase,
    title: 'Find a job',
    body: 'Nigerian & remote roles',
    prompt: 'Find jobs in Nigeria that match my skills, and how do I apply?',
    gradient: 'from-[#10b981] to-[#047857]',
  },
  {
    icon: Bot,
    title: 'Hire with AI',
    body: 'Agents, ATS, shortlists',
    prompt: 'How can Dealo help me hire faster? Compare Hiring Agents, the ATS and your recruiters.',
    gradient: 'from-[#059669] to-[#0f766e]',
  },
  {
    icon: Code2,
    title: 'Build on API',
    body: 'Keys, webhooks, code',
    prompt: 'Show me how to create a hire request with the Dealo API in JavaScript, with webhooks',
    gradient: 'from-[#0284c7] to-[#0369a1]',
  },
];

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function transcript(items: ChatItem[]): AssistantMessage[] {
  return items
    .filter((m) => m.status !== 'error' && (m.text.trim() || (m.images?.length ?? 0) > 0))
    .slice(-20)
    .map(({ role, text, images }) => ({
      role,
      text: (text || (images?.length ? 'Please look at the attached image.' : '')).slice(0, 6000),
      images: role === 'user' ? images?.slice(0, 2) : undefined,
    }));
}

/** Crisp Dealo logo + AI chip badge. */
function DealoAiMark({ compact = false }: { compact?: boolean }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === 'dark';
  return (
    <div className="inline-flex min-w-0 items-center gap-2">
      <Image
        src={isDark ? DARK_LOGO : LIGHT_LOGO}
        alt="Dealo"
        width={compact ? 84 : 100}
        height={compact ? 24 : 30}
        className={cn('w-auto object-contain object-left', compact ? 'h-5.5' : 'h-6.5')}
        priority
      />
      <span className="inline-flex items-center rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-black tracking-wider text-on-brand shadow-xs">
        AI
      </span>
    </div>
  );
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 639px)');
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return mobile;
}

/** Live Dealo AI orb — Cloudinary mesh, centered in the chat circle. */
const ASSISTANT_ORB_SRC =
  'https://res.cloudinary.com/dyaetoldv/image/upload/v1794849375/download__60_-removebg-preview_lg8gip.png';

function AssistantOrb({
  size = 40,
  active = false,
  className,
}: {
  size?: number;
  active?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const breathe = active ? 1.8 : 3.6;
  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      {/* Soft outer glow — “listening” aura */}
      {!reduce ? (
        <motion.span
          aria-hidden
          className="absolute -inset-[18%] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.45)_0%,rgba(168,85,247,0.2)_45%,transparent_70%)] blur-[2px]"
          animate={
            active
              ? { opacity: [0.35, 0.85, 0.35], scale: [0.92, 1.12, 0.92] }
              : { opacity: [0.28, 0.55, 0.28], scale: [0.96, 1.06, 0.96] }
          }
          transition={{ duration: breathe, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : null}

      {/* Black disc — matches the asset’s void background */}
      <span
        aria-hidden
        className="absolute inset-0 overflow-hidden rounded-full bg-black shadow-[0_10px_28px_-8px_rgba(0,0,0,0.65)] ring-1 ring-white/15"
      />

      {/* Wavelength mesh — centered, breathes + slight yaw like a live signal */}
      <motion.span
        className="absolute inset-[6%] overflow-hidden rounded-full"
        animate={
          reduce
            ? undefined
            : {
                scale: active ? [0.94, 1.06, 0.94] : [0.97, 1.03, 0.97],
                rotate: active ? [0, 4, -3, 0] : [0, 2.5, -1.5, 0],
              }
        }
        transition={{ duration: breathe, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Image
          src={ASSISTANT_ORB_SRC}
          alt=""
          fill
          sizes={`${Math.ceil(size)}px`}
          className="object-contain object-center"
          priority={size >= 48}
        />
        {/* Sweeping highlight — reads as a live energy wave across the mesh */}
        {!reduce ? (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgba(125,211,252,0.35)_50%,transparent_65%)]"
            animate={{ x: ['-120%', '120%'] }}
            transition={{ duration: active ? 2.2 : 4.2, repeat: Infinity, ease: 'easeInOut', repeatDelay: active ? 0.2 : 0.8 }}
          />
        ) : null}
      </motion.span>
    </span>
  );
}

const LIVE_KEYS = ['chat.live.a', 'chat.live.b', 'chat.live.c'] as const;

/** Types a phrase, holds, deletes, then cycles — beside the chat FAB. */
function FabLiveTypewriter({ phrases }: { phrases: string[] }) {
  const reduce = useReducedMotion();
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [shown, setShown] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const phrase = phrases[phraseIndex] ?? phrases[0] ?? '';

  useEffect(() => {
    if (reduce || !phrase) {
      setShown(phrase.length);
      return;
    }

    let timer: number | undefined;
    const typeMs = 42;
    const deleteMs = 28;
    const holdMs = 2200;
    const gapMs = 700;

    if (!deleting && shown < phrase.length) {
      timer = window.setTimeout(() => setShown((n) => n + 1), typeMs);
    } else if (!deleting && shown >= phrase.length) {
      timer = window.setTimeout(() => setDeleting(true), holdMs);
    } else if (deleting && shown > 0) {
      timer = window.setTimeout(() => setShown((n) => n - 1), deleteMs);
    } else if (deleting && shown === 0) {
      timer = window.setTimeout(() => {
        setDeleting(false);
        setPhraseIndex((i) => (i + 1) % phrases.length);
      }, gapMs);
    }

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [deleting, phrase, phrases.length, reduce, shown]);

  if (reduce) {
    return (
      <span className="pointer-events-none max-w-[11.5rem] truncate text-[12px] font-semibold text-foreground">
        {phrases[0]}
      </span>
    );
  }

  return (
    <span
      className="pointer-events-none inline-flex max-w-[12.5rem] items-center text-[12px] font-semibold leading-tight text-foreground"
      aria-live="polite"
    >
      <span className="truncate">{phrase.slice(0, shown)}</span>
      <span
        aria-hidden
        className="ml-0.5 inline-block h-[0.9em] w-[2px] shrink-0 translate-y-[0.05em] animate-pulse rounded-sm bg-brand"
      />
    </span>
  );
}

export function HelpWidget() {
  const { t, locale } = useLocale();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const mobile = useIsMobile();
  const { openModal } = useModal();
  const { user } = useAuthSession();
  const [open, setOpen] = useState(false);
  /** Form modals (hire, login, contact…) own the screen — especially on phones. */
  const yieldToModal = Boolean(openModal);
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<View>('chat');
  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [welcome, setWelcome] = useState<AssistantWelcome | null>(null);
  const [sentNote, setSentNote] = useState('');
  const [nudge, setNudge] = useState(false);
  const [pendingImages, setPendingImages] = useState<ChatImagePayload[]>([]);
  const [attaching, setAttaching] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stickRef = useRef(true);
  const pendingPrompt = useRef<string | null>(null);
  const toast = useToast();

  const whatsapp = whatsappHref(whatsappMessageFor(pathname, t('wa.prefill')));
  const onDashboard = pathname.startsWith('/dashboard');
  const big = expanded && !mobile;

  useEffect(() => {
    if (!yieldToModal) return;
    setOpen(false);
    setExpanded(false);
    setNudge(false);
  }, [yieldToModal]);

  // ------------------------------------------------------------------ persistence

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(STORE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ChatItem[];
        if (Array.isArray(parsed))
          setItems(parsed.map((m) => (m.status === 'streaming' ? { ...m, status: 'done' } : m)));
      }
    } catch {
      /* a broken saved chat just starts fresh */
    }
  }, []);

  useEffect(() => {
    if (items.some((m) => m.status === 'streaming')) return;
    const slim = items.slice(-40).map(({ images: _i, imagePreviews: _p, ...rest }) => rest);
    if (slim.length) window.sessionStorage.setItem(STORE_KEY, JSON.stringify(slim));
    else window.sessionStorage.removeItem(STORE_KEY);
  }, [items]);

  // ------------------------------------------------------------------ welcome + nudge

  useEffect(() => {
    if (!open) return;
    let active = true;
    apiFetch<AssistantWelcome>(`/assistant/welcome?page=${encodeURIComponent(pathname)}`)
      .then((w) => active && setWelcome(w))
      .catch(() => active && setWelcome(null));
    return () => {
      active = false;
    };
  }, [open, pathname, user?.id]);

  useEffect(() => {
    if (open || pathname.startsWith('/auth') || window.sessionStorage.getItem(NUDGE_KEY)) return;
    const timer = window.setTimeout(() => setNudge(true), 9000);
    return () => window.clearTimeout(timer);
  }, [open, pathname]);

  const dismissNudge = () => {
    setNudge(false);
    window.sessionStorage.setItem(NUDGE_KEY, '1');
  };

  // ------------------------------------------------------------------ scrolling + keys

  useEffect(() => {
    const list = listRef.current;
    if (list && stickRef.current)
      list.scrollTo({ top: list.scrollHeight, behavior: reduceMotion || streaming ? 'auto' : 'smooth' });
  }, [items, view, reduceMotion, streaming]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setOpen((v) => !v);
        dismissNudge();
      }
      if (e.key === 'Escape' && open) {
        if (expanded) setExpanded(false);
        else setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, expanded]);

  useEffect(() => {
    if (open && view === 'chat' && !mobile) window.setTimeout(() => inputRef.current?.focus(), 120);
  }, [open, view, mobile]);

  useEffect(() => {
    if (!(open && (mobile || big))) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open, mobile, big]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [input]);

  // ------------------------------------------------------------------ asking

  const ask = useCallback(
    async (question: string, base?: ChatItem[], imagesOverride?: ChatImagePayload[]) => {
      const text = question.trim().slice(0, MAX_INPUT);
      const images = imagesOverride ?? pendingImages;
      if ((!text && !images.length) || streaming) return;
      if (text === PERSON) {
        setView('person');
        return;
      }
      const history = base ?? items;
      const imagePayload: AssistantImage[] = images.map(({ mimeType, data }) => ({ mimeType, data }));
      const userItem: ChatItem = {
        id: uid(),
        role: 'user',
        text: text || (images.length ? 'What do you see here?' : ''),
        images: imagePayload.length ? imagePayload : undefined,
        imagePreviews: images.map((image) => image.previewUrl),
      };
      const assistantId = uid();
      const next = [...history, userItem];
      setItems([...next, { id: assistantId, role: 'assistant', text: '', status: 'streaming' }]);
      setInput('');
      setPendingImages([]);
      setStreaming(true);
      stickRef.current = true;

      const controller = new AbortController();
      abortRef.current = controller;
      const patch = (fn: (m: ChatItem) => ChatItem) =>
        setItems((cur) => cur.map((m) => (m.id === assistantId ? fn(m) : m)));

      try {
        await streamAssistant(
          { messages: transcript(next), page: pathname, locale },
          (event) => {
            if (event.type === 'start') patch((m) => ({ ...m, source: event.source }));
            else if (event.type === 'delta') patch((m) => ({ ...m, text: m.text + event.text }));
            else if (event.type === 'done') {
              const r = event.reply;
              const suggestions =
                r.handoff && !r.suggestions.includes(PERSON)
                  ? [PERSON, ...r.suggestions].slice(0, 4)
                  : r.suggestions;
              patch((m) => ({
                ...m,
                id: r.id,
                text: r.reply,
                links: r.links,
                suggestions,
                handoff: r.handoff,
                source: r.source,
                status: 'done',
              }));
            } else if (event.type === 'error') {
              patch((m) => ({
                ...m,
                text: m.text || event.message,
                status: m.text ? 'done' : 'error',
                suggestions: [PERSON],
              }));
            }
          },
          controller.signal,
        );
      } catch (err) {
        if (controller.signal.aborted) {
          patch((m) => ({ ...m, status: 'done', text: m.text || '_Stopped._' }));
        } else {
          const busy = err instanceof ApiError && err.status === 429;
          patch((m) => ({
            ...m,
            status: 'error',
            text: busy
              ? 'You are sending messages very fast. Please give it a minute, or speak with our team.'
              : err instanceof ApiError && err.status === 400
                ? err.message
                : 'I cannot reach Dealo right now. Check your connection, or talk to a person.',
            suggestions: [PERSON],
            handoff: true,
          }));
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [items, streaming, pathname, locale, pendingImages],
  );

  const attachFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).slice(0, 2);
      if (!list.length) return;
      setAttaching(true);
      try {
        const prepared: ChatImagePayload[] = [];
        for (const file of list) prepared.push(await prepareChatImage(file));
        setPendingImages((current) => [...current, ...prepared].slice(0, 2));
      } catch (error) {
        toast.error('Could not attach', error instanceof Error ? error.message : 'Try another image.');
      } finally {
        setAttaching(false);
      }
    },
    [toast],
  );

  // Opening from anywhere: openAssistant('question') in lib/assistant-client.
  useEffect(() => {
    const onOpen = (event: Event) => {
      const prompt = (event as CustomEvent<{ prompt?: string }>).detail?.prompt;
      setOpen(true);
      setView('chat');
      dismissNudge();
      if (prompt) pendingPrompt.current = prompt;
    };
    window.addEventListener(OPEN_ASSISTANT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_ASSISTANT_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (open && pendingPrompt.current && !streaming) {
      const prompt = pendingPrompt.current;
      pendingPrompt.current = null;
      void ask(prompt);
    }
  }, [open, streaming, ask]);

  const stop = () => abortRef.current?.abort();

  const regenerate = () => {
    const lastUserIndex = items.map((m) => m.role).lastIndexOf('user');
    if (lastUserIndex === -1 || streaming) return;
    void ask(items[lastUserIndex]!.text, items.slice(0, lastUserIndex));
  };

  const restart = () => {
    abortRef.current?.abort();
    setItems([]);
    setView('chat');
  };

  const rate = (item: ChatItem, rating: 'up' | 'down') => {
    if (item.rating) return;
    setItems((cur) => cur.map((m) => (m.id === item.id ? { ...m, rating } : m)));
    const index = items.findIndex((m) => m.id === item.id);
    const question = [...items.slice(0, index)].reverse().find((m) => m.role === 'user')?.text ?? '';
    void apiFetch('/assistant/feedback', {
      method: 'POST',
      json: {
        messageId: item.id.slice(0, 64),
        rating,
        question: question.slice(0, 2000),
        answer: item.text.slice(0, 6000),
        page: pathname,
      },
    }).catch(() => undefined);
  };

  const lastQuestion = [...items].reverse().find((m) => m.role === 'user')?.text ?? '';
  const last = items[items.length - 1];
  const close = () => {
    setOpen(false);
    setExpanded(false);
  };

  // ------------------------------------------------------------------ render

  if (yieldToModal) return null;

  return (
    <>
      {/* Full-screen backdrop when expanded on desktop */}
      <AnimatePresence>
        {open && big ? (
          <motion.button
            type="button"
            aria-label="Collapse assistant"
            className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpanded(false)}
          />
        ) : null}
      </AnimatePresence>

      <div
        className={cn(
          'pointer-events-none fixed right-2 z-[96] flex flex-col items-end gap-3 min-[340px]:right-4 sm:right-6',
          onDashboard
            ? 'bottom-[calc(4.75rem+var(--safe-bottom))] lg:bottom-6'
            : 'bottom-[max(0.75rem,var(--safe-bottom))] sm:bottom-6',
        )}
      >
        {/* ── Main chat panel ── */}
        <AnimatePresence>
          {open ? (
            <motion.section
              key="panel"
              layout={!reduceMotion}
              role="dialog"
              aria-label={t('chat.title')}
              initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: 16, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 340, damping: 32 }}
              className={cn(
                'pointer-events-auto relative flex origin-bottom-right flex-col overflow-hidden',
                'border border-border bg-background text-foreground shadow-2xl',
                mobile
                  ? 'fixed inset-0 z-[100] h-dvh w-full rounded-none'
                  : big
                    ? 'fixed inset-0 m-auto h-[min(54rem,calc(100dvh-4rem))] w-[min(64rem,calc(100vw-3rem))] rounded-3xl shadow-[0_32px_96px_-24px_rgba(0,0,0,0.45)]'
                    : cn(
                        'w-[min(26rem,calc(100vw-1rem))] rounded-3xl shadow-[0_24px_64px_-16px_rgba(0,0,0,0.22)]',
                        onDashboard
                          ? 'h-[min(42rem,calc(100dvh-10.5rem))] lg:h-[min(42rem,calc(100dvh-7rem))]'
                          : 'h-[min(42rem,calc(100dvh-6.5rem))]',
                      ),
              )}
            >
              <Header
                view={view}
                streaming={streaming}
                signedIn={Boolean(user)}
                canExpand={!mobile}
                expanded={big}
                hasChat={items.length > 0}
                onBack={() => setView('chat')}
                onRestart={restart}
                onToggleExpand={() => setExpanded((v) => !v)}
                onClose={close}
              />

              {view === 'chat' ? (
                <>
                  <div
                    ref={listRef}
                    onScroll={(e) => {
                      const el = e.currentTarget;
                      stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
                    }}
                    className="relative z-[1] min-h-0 flex-1 overflow-y-auto overscroll-contain bg-surface/70"
                    aria-live="polite"
                  >
                    <div className={cn('mx-auto w-full px-3.5 py-4 sm:px-5 sm:py-5', big && 'max-w-3xl')}>
                      {items.length === 0 ? (
                        <EmptyState welcome={welcome} big={big} whatsapp={whatsapp} onAsk={(q) => void ask(q)} />
                      ) : (
                        <div className="space-y-4">
                          {items.map((m, index) => (
                            <Message
                              key={m.id}
                              item={m}
                              isLast={index === items.length - 1}
                              busy={streaming}
                              onNavigate={() => {
                                if (mobile || big) close();
                              }}
                              onRate={(r) => rate(m, r)}
                              onRegenerate={regenerate}
                              onActionPrompt={(p) => void ask(p)}
                            />
                          ))}

                          {/* Action suggestion pills */}
                          {!streaming && last?.role === 'assistant' && last.suggestions?.length ? (
                            <motion.div
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.08 }}
                              className="flex flex-wrap gap-2 pt-1 pl-10"
                            >
                              {last.suggestions.map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => void ask(s)}
                                  className={cn(
                                    'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold shadow-xs transition hover:-translate-y-0.5 active:translate-y-0',
                                    s === PERSON
                                      ? 'bg-brand text-on-brand hover:bg-brand-strong'
                                      : 'border border-border bg-surface-elevated text-foreground hover:border-brand hover:text-brand',
                                  )}
                                >
                                  {s === PERSON ? (
                                    <Headphones className="h-3.5 w-3.5 shrink-0" />
                                  ) : (
                                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-brand" />
                                  )}
                                  {s === PERSON ? t('chat.person') : s}
                                </button>
                              ))}
                            </motion.div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>

                  <Composer
                    big={big}
                    mobile={mobile}
                    input={input}
                    setInput={setInput}
                    inputRef={inputRef}
                    fileRef={fileRef}
                    streaming={streaming}
                    attaching={attaching}
                    pendingImages={pendingImages}
                    onRemoveImage={(index) =>
                      setPendingImages((current) => {
                        const next = [...current];
                        const [removed] = next.splice(index, 1);
                        if (removed) URL.revokeObjectURL(removed.previewUrl);
                        return next;
                      })
                    }
                    onAttach={(files) => void attachFiles(files)}
                    onSend={() => void ask(input)}
                    onStop={stop}
                    onPerson={() => setView('person')}
                    whatsapp={whatsapp}
                  />
                </>
              ) : null}

              {view === 'person' ? (
                <PersonForm
                  signedIn={Boolean(user)}
                  defaultName={user ? `${user.firstName} ${user.lastName}`.trim() : ''}
                  defaultEmail={user?.email ?? ''}
                  defaultMessage={lastQuestion}
                  chat={transcript(items)}
                  page={pathname}
                  whatsapp={whatsapp}
                  onSent={(note) => {
                    setSentNote(note);
                    setView('sent');
                  }}
                />
              ) : null}

              {view === 'sent' ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                  <motion.span
                    initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 16 }}
                    className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-on-brand shadow-lg shadow-brand/30"
                  >
                    <CheckCircle2 className="h-8 w-8" />
                  </motion.span>
                  <div>
                    <p className="font-display text-xl font-bold text-foreground">
                      {t('chat.sent')}
                    </p>
                    <p className="mt-1.5 max-w-xs text-sm text-muted">{sentNote}</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    {user ? (
                      <Link href="/dashboard/support" onClick={close} className="btn-secondary px-3.5 py-2 text-xs">
                        {t('chat.tickets')}
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setView('chat')}
                      className="btn-primary px-4 py-2 text-xs"
                    >
                      {t('chat.back')}
                    </button>
                  </div>
                </div>
              ) : null}
            </motion.section>
          ) : null}
        </AnimatePresence>

        {/* ── Nudge tooltip ── */}
        <AnimatePresence>
          {nudge && !open ? (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="pointer-events-auto relative mr-1 flex max-w-[17.5rem] items-center gap-3 overflow-hidden rounded-2xl border border-border bg-surface-elevated py-3 pl-3.5 pr-9 text-left shadow-xl"
            >
              <button
                type="button"
                className="text-left"
                onClick={() => {
                  setOpen(true);
                  dismissNudge();
                }}
              >
                <p className="text-[12.5px] font-bold text-foreground">
                  {t('chat.nudge.title')}
                </p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {t('chat.nudge.body')}
                </p>
              </button>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={dismissNudge}
                className="absolute right-2 top-2 rounded-full p-1 text-muted transition hover:bg-surface hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* ── FAB trigger button ── */}
        {!(open && (mobile || big)) ? (
          <div className="pointer-events-auto flex items-center gap-2.5">
            <AnimatePresence>
              {!open ? (
                <motion.button
                  key="live-type"
                  type="button"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.25 }}
                  onClick={() => {
                    setOpen(true);
                    dismissNudge();
                  }}
                  className="hidden rounded-full border border-border bg-surface-elevated/95 px-3.5 py-2 shadow-lg backdrop-blur-md sm:inline-flex"
                  aria-label={t('chat.open')}
                >
                  <FabLiveTypewriter phrases={LIVE_KEYS.map((key) => t(key))} />
                </motion.button>
              ) : null}
            </AnimatePresence>

            <motion.button
              type="button"
              data-tour="support-help"
              aria-label={open ? t('chat.close') : t('chat.open')}
              aria-expanded={open}
              title={`${t('chat.open')} (Ctrl + /)`}
              onClick={() => {
                setOpen((v) => !v);
                dismissNudge();
              }}
              whileHover={reduceMotion ? undefined : { scale: 1.06 }}
              whileTap={{ scale: 0.92 }}
              className="relative inline-flex h-14 w-14 items-center justify-center rounded-full min-[340px]:h-[3.75rem] min-[340px]:w-[3.75rem]"
            >
              {!open && !reduceMotion ? (
                <motion.span
                  aria-hidden
                  className="absolute -inset-1.5 rounded-full bg-brand/25 blur-xs"
                  animate={{ opacity: [0.35, 0.75, 0.35], scale: [0.92, 1.08, 0.92] }}
                  transition={{ duration: 3.5, repeat: Infinity }}
                />
              ) : null}

              <AnimatePresence mode="wait" initial={false}>
                {open ? (
                  <motion.span
                    key="x"
                    initial={{ rotate: -70, opacity: 0, scale: 0.7 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: 70, opacity: 0, scale: 0.7 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                    className="relative inline-flex h-full w-full items-center justify-center rounded-full bg-foreground text-background shadow-xl"
                  >
                    <X className="h-5 w-5" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="orb"
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    className="relative"
                  >
                    <AssistantOrb size={56} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        ) : null}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------- header

function Header({
  view,
  streaming,
  signedIn,
  canExpand,
  expanded,
  hasChat,
  onBack,
  onRestart,
  onToggleExpand,
  onClose,
}: {
  view: View;
  streaming: boolean;
  signedIn: boolean;
  canExpand: boolean;
  expanded: boolean;
  hasChat: boolean;
  onBack: () => void;
  onRestart: () => void;
  onToggleExpand: () => void;
  onClose: () => void;
}) {
  const { t } = useLocale();

  const iconBtn =
    'inline-flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-elevated text-foreground shadow-2xs transition hover:bg-surface hover:text-brand';

  return (
    <header className="relative z-10 shrink-0 border-b border-border bg-background/95 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 backdrop-blur-md">
      <div className="flex items-center gap-3">
        {view !== 'chat' ? (
          <button type="button" onClick={onBack} aria-label="Back to chat" className={iconBtn}>
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : null}

        <div className="min-w-0 flex-1">
          {view === 'chat' ? (
            <>
              <DealoAiMark />
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-muted">
                <span
                  className={cn(
                    'h-1.5 w-1.5 shrink-0 rounded-full',
                    streaming
                      ? 'animate-pulse bg-amber-500'
                      : 'bg-brand shadow-[0_0_6px_color-mix(in_srgb,var(--brand)_80%,transparent)]',
                  )}
                />
                {streaming ? 'Writing answer…' : 'Online · can read images'}
              </p>
            </>
          ) : (
            <>
              <p className="truncate text-sm font-bold text-foreground">
                {t('chat.person')}
              </p>
              <p className="text-[11px] text-muted">
                {signedIn ? 'Opens a support ticket' : 'We reply by email'}
              </p>
            </>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          {view === 'chat' && hasChat ? (
            <button
              type="button"
              onClick={onRestart}
              aria-label="New chat"
              title="New chat"
              className={iconBtn}
            >
              <SquarePen className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {canExpand ? (
            <button
              type="button"
              onClick={onToggleExpand}
              aria-label={expanded ? 'Shrink' : 'Expand'}
              title={expanded ? 'Shrink' : 'Expand'}
              className={cn(iconBtn, 'hidden sm:inline-flex')}
            >
              {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={cn(iconBtn, 'hover:border-danger/40 hover:bg-danger/10 hover:text-danger')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

// ----------------------------------------------------------------- empty state

function EmptyState({
  welcome,
  big,
  whatsapp,
  onAsk,
}: {
  welcome: AssistantWelcome | null;
  big: boolean;
  whatsapp: string | null;
  onAsk: (q: string) => void;
}) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col items-center pt-2 text-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full overflow-hidden rounded-2xl border border-border bg-surface-elevated p-4.5 shadow-xs"
      >
        <div className="min-w-0 text-left">
          <DealoAiMark compact />
          <h3 className="mt-2 font-display text-[1.2rem] font-bold leading-tight text-foreground sm:text-xl">
            {welcome ? (
              <>
                {welcome.greeting},{' '}
                <span className="text-brand">{t('chat.help')}</span>
              </>
            ) : (
              t('chat.help')
            )}
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            {welcome?.intro ?? t('chat.nudge.body')} Attach a CV screenshot or job description — I can analyze it
            directly.
          </p>
        </div>
      </motion.div>

      {/* Capabilities 2x2 or 4x1 grid */}
      <div className={cn('mt-3.5 grid w-full gap-2.5', big ? 'grid-cols-4' : 'grid-cols-2')}>
        {CAPABILITIES.map((c, i) => (
          <motion.button
            key={c.title}
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + i * 0.05 }}
            whileHover={{ y: -2 }}
            onClick={() => onAsk(c.prompt)}
            className="group relative overflow-hidden rounded-xl border border-border bg-surface-elevated p-3.5 text-left shadow-2xs transition hover:border-brand/50 hover:shadow-sm"
          >
            <span
              className={cn(
                'inline-flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-xs',
                c.gradient,
              )}
            >
              <c.icon className="h-4 w-4" />
            </span>
            <p className="mt-2.5 text-xs font-bold text-foreground">{c.title}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted">{c.body}</p>
          </motion.button>
        ))}
      </div>

      {/* Context prompts */}
      {/* Page-context suggestion chips */}
      {welcome?.suggestions.length ? (
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {welcome.suggestions.map((s, i) => (
            <motion.button
              key={s}
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.04 }}
              onClick={() => onAsk(s)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-elevated px-3 py-1.5 text-[11.5px] font-medium text-foreground shadow-2xs transition hover:border-brand hover:text-brand"
            >
              {s === PERSON ? (
                <Headphones className="h-3 w-3 shrink-0" />
              ) : (
                <ArrowUpRight className="h-3 w-3 shrink-0 text-brand" />
              )}
              {s === PERSON ? t('chat.person') : s}
            </motion.button>
          ))}
        </div>
      ) : null}

      {whatsapp ? (
        <a
          href={whatsapp}
          target="_blank"
          rel="noreferrer"
          className="mt-3.5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#25D366]/40 bg-[#25D366]/10 px-3 py-2.5 text-xs font-semibold text-[#128C7E] transition hover:bg-[#25D366]/18 dark:text-[#6ef3a8]"
        >
          <WhatsAppIcon className="h-4 w-4" />
          {t('wa.cta')} · Chat with us on WhatsApp
        </a>
      ) : null}
    </div>
  );
}

// --------------------------------------------------------------------- message

function Message({
  item,
  isLast,
  busy,
  onNavigate,
  onRate,
  onRegenerate,
  onActionPrompt,
}: {
  item: ChatItem;
  isLast: boolean;
  busy: boolean;
  onNavigate: () => void;
  onRate: (rating: 'up' | 'down') => void;
  onRegenerate: () => void;
  onActionPrompt: (prompt: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const reduce = useReducedMotion();

  if (item.role === 'user') {
    return (
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] space-y-2">
          {item.imagePreviews?.length ? (
            <div className="flex flex-wrap justify-end gap-1.5">
              {item.imagePreviews.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt="Attached"
                  className="h-24 w-24 rounded-xl object-cover ring-2 ring-emerald-600/30 shadow-md"
                />
              ))}
            </div>
          ) : null}
          {item.text ? (
            <p className="whitespace-pre-wrap rounded-2xl rounded-br-xs bg-brand px-4 py-2.5 text-[13.5px] font-medium leading-relaxed text-on-brand shadow-sm">
              {item.text}
            </p>
          ) : null}
        </div>
      </motion.div>
    );
  }

  const thinking = item.status === 'streaming' && !item.text;
  const isError = item.status === 'error';

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex gap-2.5 items-start"
    >
      <AssistantOrb size={30} active={item.status === 'streaming'} className="mt-0.5" />

      <div className="min-w-0 flex-1">
        {thinking ? (
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface-elevated px-3.5 py-3 shadow-2xs">
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-brand"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
            <span className="text-xs font-medium text-muted">Thinking it through…</span>
          </div>
        ) : isError ? (
          /* High-legibility Offline / Fallback Card */
          <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-3.5 text-slate-900 shadow-2xs dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-zinc-100">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400">
                <WifiOff className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-amber-900 dark:text-amber-300">
                  Connection Notice
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-800 dark:text-zinc-200">
                  {item.text}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onActionPrompt(PERSON)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 active:scale-95 dark:bg-[#7cff4d] dark:text-[#062417] dark:hover:bg-[#8eff63]"
                  >
                    <Headphones className="h-3.5 w-3.5" />
                    Talk to a person
                  </button>
                  <button
                    type="button"
                    onClick={onRegenerate}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-95 dark:border-zinc-700 dark:bg-[#121c16] dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Try again
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl rounded-tl-xs border border-border bg-surface-elevated px-4 py-3 shadow-2xs">
            <AssistantMarkdown
              text={item.text}
              streaming={item.status === 'streaming'}
              onNavigate={onNavigate}
              className="text-[13.5px] leading-relaxed text-foreground"
            />
          </div>
        )}

        {/* Links */}
        {/* Quick-access links */}
        {item.links?.length && item.status === 'done' ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={onNavigate}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-600/30 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-[#7cff4d]/30 dark:bg-[#7cff4d]/10 dark:text-[#7cff4d]"
              >
                {l.label} <ArrowUpRight className="h-3 w-3" />
              </Link>
            ))}
          </div>
        ) : null}

        {/* Actions toolbar */}
        {item.status === 'done' && item.text && !isError ? (
          <div
            className={cn(
              'mt-1.5 flex items-center gap-0.5 text-slate-500 dark:text-zinc-400 transition',
              isLast ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100',
            )}
          >
            <ActionButton
              label={copied ? 'Copied' : 'Copy'}
              onClick={() => {
                void navigator.clipboard?.writeText(item.text).then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1400);
                });
              }}
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </ActionButton>
            <ActionButton
              label="Helpful"
              active={item.rating === 'up'}
              disabled={Boolean(item.rating)}
              onClick={() => onRate('up')}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </ActionButton>
            <ActionButton
              label="Not helpful"
              active={item.rating === 'down'}
              disabled={Boolean(item.rating)}
              onClick={() => onRate('down')}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </ActionButton>
            {isLast ? (
              <ActionButton label="Regenerate" disabled={busy} onClick={onRegenerate}>
                <RefreshCw className="h-3.5 w-3.5" />
              </ActionButton>
            ) : null}
            {item.rating ? (
              <span className="ml-1 text-[10.5px] font-medium text-emerald-600 dark:text-[#7cff4d]">
                Thanks for feedback
              </span>
            ) : null}
            {item.source ? (
              <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                {item.source === 'ai' ? 'Dealo AI' : 'Guide'}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

function ActionButton({
  label,
  onClick,
  children,
  active,
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled && !active}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white disabled:cursor-default disabled:opacity-40',
        active && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-[#7cff4d]',
      )}
    >
      {children}
    </button>
  );
}

// -------------------------------------------------------------------- composer

function Composer({
  big,
  mobile,
  input,
  setInput,
  inputRef,
  fileRef,
  streaming,
  attaching,
  pendingImages,
  onRemoveImage,
  onAttach,
  onSend,
  onStop,
  onPerson,
  whatsapp,
}: {
  big: boolean;
  mobile: boolean;
  input: string;
  setInput: (v: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  fileRef: React.RefObject<HTMLInputElement | null>;
  streaming: boolean;
  attaching: boolean;
  pendingImages: ChatImagePayload[];
  onRemoveImage: (index: number) => void;
  onAttach: (files: FileList | File[]) => void;
  onSend: () => void;
  onStop: () => void;
  onPerson: () => void;
  whatsapp: string | null;
}) {
  const { t } = useLocale();
  const placeholder = pendingImages.length ? 'Ask about this image…' : t('chat.placeholder');
  const near = input.length > MAX_INPUT * 0.8;
  const canSend = Boolean(input.trim() || pendingImages.length);

  return (
    <form
      className="relative z-10 shrink-0 border-t border-border bg-background px-3.5 pt-3 pb-[max(env(safe-area-inset-bottom),0.85rem)]"
      onSubmit={(e) => {
        e.preventDefault();
        if (!streaming && canSend) onSend();
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files?.length) onAttach(e.dataTransfer.files);
      }}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onAttach(e.target.files);
          e.target.value = '';
        }}
      />
      <div className={cn('mx-auto w-full', big && 'max-w-3xl')}>
        {pendingImages.length ? (
          <div className="mb-2 flex flex-wrap gap-2 px-1">
            {pendingImages.map((image, index) => (
              <div key={image.previewUrl} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.previewUrl}
                  alt={`Attachment ${index + 1}`}
                  className="h-14 w-14 rounded-xl object-cover ring-1 ring-slate-300 dark:ring-zinc-700 shadow-xs"
                />
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() => onRemoveImage(index)}
                  className="absolute -right-1.5 -top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white shadow-xs hover:bg-slate-800 dark:bg-white dark:text-black"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {/* Input Pill */}
        <div className="rounded-2xl border border-border bg-surface p-1.5 shadow-xs transition focus-within:border-brand focus-within:bg-surface-elevated focus-within:ring-2 focus-within:ring-brand/15">
          <div className="flex items-end gap-1.5">
            <button
              type="button"
              aria-label="Attach image"
              disabled={streaming || attaching || pendingImages.length >= 2}
              onClick={() => fileRef.current?.click()}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-surface-elevated hover:text-foreground disabled:opacity-40"
            >
              {attaching ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4.5 w-4.5" />}
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT))}
              onPaste={(e) => {
                const files = Array.from(e.clipboardData.items)
                  .filter((item) => item.type.startsWith('image/'))
                  .map((item) => item.getAsFile())
                  .filter((file): file is File => Boolean(file));
                if (files.length) {
                  e.preventDefault();
                  onAttach(files);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  if (!streaming && canSend) onSend();
                }
              }}
              rows={1}
              placeholder={placeholder}
              aria-label={placeholder}
              className="max-h-[160px] min-h-[2.4rem] flex-1 resize-none bg-transparent px-1 py-2 text-[13.5px] leading-relaxed text-foreground caret-brand outline-none placeholder:text-muted"
            />

            {streaming ? (
              <motion.button
                type="button"
                onClick={onStop}
                aria-label="Stop answering"
                whileTap={{ scale: 0.9 }}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background shadow-xs"
              >
                <Square className="h-3 w-3 fill-current" />
              </motion.button>
            ) : (
              <motion.button
                type="submit"
                disabled={!canSend}
                aria-label="Send"
                whileTap={{ scale: 0.9 }}
                className={cn(
                  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition shadow-xs disabled:opacity-35',
                  canSend
                    ? 'bg-brand text-on-brand hover:bg-brand-strong'
                    : 'bg-surface-elevated text-muted',
                )}
              >
                <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
              </motion.button>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-muted">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              type="button"
              onClick={onPerson}
              className="inline-flex items-center gap-1.5 font-semibold text-foreground transition hover:text-brand"
            >
              <UserRound className="h-3.5 w-3.5" />
              {t('chat.person')}
            </button>
            {whatsapp ? (
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-semibold text-[#128C7E] transition hover:text-[#0b6b5c] dark:text-[#6ef3a8]"
              >
                <WhatsAppIcon className="h-3.5 w-3.5" />
                WhatsApp
              </a>
            ) : null}
          </div>
          {near ? (
            <span className={cn('tabular-nums', input.length >= MAX_INPUT && 'font-bold text-danger')}>
              {input.length}/{MAX_INPUT}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10.5px]">
              <Paperclip className="h-3 w-3" />
              Attach or paste image
            </span>
          )}
        </div>
        <p className="mt-1 text-center text-[10px] text-muted">{t('chat.disclaimer')}</p>
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ person form

const CATEGORIES = [
  { id: 'general', label: 'General question' },
  { id: 'billing', label: 'Payment or plan' },
  { id: 'technical', label: 'Something is not working' },
  { id: 'hiring', label: 'Hiring and the ATS' },
  { id: 'talent', label: 'CVs and jobs' },
];

function PersonForm({
  signedIn,
  defaultName,
  defaultEmail,
  defaultMessage,
  chat,
  page,
  whatsapp,
  onSent,
}: {
  signedIn: boolean;
  defaultName: string;
  defaultEmail: string;
  defaultMessage: string;
  chat: AssistantMessage[];
  page: string;
  whatsapp: string | null;
  onSent: (note: string) => void;
}) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [message, setMessage] = useState(defaultMessage);
  const [category, setCategory] = useState('general');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (message.trim().length < 8) return setError('Please provide a bit more detail (at least 8 characters).');
    setSending(true);
    try {
      if (signedIn) {
        const history = chat.length
          ? `\n\n--- Dealo AI chat ---\n${chat.map((m) => `${m.role === 'user' ? 'Me' : 'Assistant'}: ${m.text}`).join('\n')}`
          : '';
        await apiFetch('/support/tickets', {
          method: 'POST',
          json: {
            subject: `Chat: ${message.trim().replace(/\s+/g, ' ').slice(0, 80)}`,
            body: `${message.trim()}\n\nPage: ${page}${history}`.slice(0, 5000),
            priority: category === 'billing' || category === 'technical' ? 'HIGH' : 'NORMAL',
            category,
          },
        });
        onSent('A member of our team will reply on your support ticket. You can track it under Dashboard > Support.');
      } else {
        const res = await apiFetch<{ message: string }>('/assistant/handoff', {
          method: 'POST',
          json: {
            name,
            email,
            message: message.trim(),
            transcript: chat.map((m) => ({ ...m, text: m.text.slice(0, 6000) })),
            page,
          },
        });
        onSent(res.message);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const field =
    'mt-1 block w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15';

  return (
    <form onSubmit={(e) => void submit(e)} className="flex min-h-0 flex-1 flex-col bg-surface/70">
      <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3 rounded-xl border border-brand/25 bg-brand-soft p-3.5 text-foreground">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-on-brand">
            <Headphones className="h-4 w-4" />
          </span>
          <p className="text-xs leading-relaxed text-muted">
            {signedIn
              ? 'Your message and conversation history will be sent directly to our support team.'
              : 'Leave your details and message. Our team receives this chat context so you won’t have to repeat yourself.'}
          </p>
        </div>

        {!signedIn ? (
          <>
            <label className="block text-xs font-bold text-foreground">
              Your name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={120}
                className={field}
                autoComplete="name"
              />
            </label>
            <label className="block text-xs font-bold text-foreground">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
                className={field}
                autoComplete="email"
                placeholder="you@email.com"
              />
            </label>
          </>
        ) : (
          <label className="block text-xs font-bold text-foreground">
            Topic
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block text-xs font-bold text-foreground">
          How can we help?
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
            rows={4}
            required
            className={field}
            placeholder="Describe what you need help with…"
          />
        </label>

        {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-background px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        {whatsapp ? (
          <a
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#128C7E] dark:text-[#6ef3a8]"
          >
            <WhatsAppIcon className="h-3.5 w-3.5" />
            Chat with us on WhatsApp
          </a>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={sending}
          className="btn-primary px-4 py-2 text-xs disabled:opacity-60"
        >
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          {signedIn ? 'Open ticket' : 'Send message'}
        </button>
      </div>
    </form>
  );
}

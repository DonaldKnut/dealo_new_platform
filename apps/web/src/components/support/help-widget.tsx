'use client';

import { type AssistantLink, type AssistantMessage, type AssistantReply, type AssistantWelcome } from '@dealo/shared';
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
  Loader2,
  Maximize2,
  MessageCircle,
  Minimize2,
  RefreshCw,
  Send,
  Sparkles,
  Square,
  SquarePen,
  ThumbsDown,
  ThumbsUp,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';

import { AssistantMarkdown } from '@/components/assistant/markdown';
import { useLocale } from '@/components/i18n/locale-context';
import { useModal } from '@/components/modals/modal-context';
import { useAuthSession } from '@/hooks/use-auth-session';
import { ApiError, apiFetch } from '@/lib/api';
import { OPEN_ASSISTANT_EVENT, streamAssistant } from '@/lib/assistant-client';
import { cn } from '@/lib/utils';

type ChatItem = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
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

const CAPABILITIES: { icon: LucideIcon; title: string; body: string; prompt: string; gradient: string; ring: string }[] = [
  {
    icon: FileText,
    title: 'Standout CV',
    body: 'Rewrite, tailor, download',
    prompt: 'Help me make my CV stand out for jobs in Nigeria',
    gradient: 'from-emerald-500 to-teal-600',
    ring: 'ring-emerald-500/20',
  },
  {
    icon: Briefcase,
    title: 'Find a job',
    body: 'Nigerian & remote roles',
    prompt: 'Find jobs in Nigeria that match my skills, and how do I apply?',
    gradient: 'from-sky-500 to-cyan-600',
    ring: 'ring-sky-500/20',
  },
  {
    icon: Bot,
    title: 'Hire with AI',
    body: 'Agents, ATS, shortlists',
    prompt: 'How can Dealo help me hire faster? Compare Hiring Agents, the ATS and your recruiters.',
    gradient: 'from-violet-500 to-purple-600',
    ring: 'ring-violet-500/20',
  },
  {
    icon: Code2,
    title: 'Build on API',
    body: 'Keys, webhooks, code',
    prompt: 'Show me how to create a hire request with the Dealo API in JavaScript, with webhooks',
    gradient: 'from-amber-500 to-orange-600',
    ring: 'ring-amber-500/20',
  },
];

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function transcript(items: ChatItem[]): AssistantMessage[] {
  return items
    .filter((m) => m.status !== 'error' && m.text.trim())
    .slice(-20)
    .map(({ role, text }) => ({ role, text: text.slice(0, 6000) }));
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

/** Dealo AI launcher mark — chat icon only on a glass orb. */
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
  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      {active && !reduce ? (
        <motion.span
          aria-hidden
          className="absolute -inset-1.5 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,255,77,0.35) 0%, transparent 70%)' }}
          animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0.15, 0.6] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
      ) : null}

      <span
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background: 'linear-gradient(145deg, #17533a 0%, #062417 55%, #031209 100%)',
          boxShadow: `0 ${size * 0.22}px ${size * 0.6}px -${size * 0.1}px rgba(6,36,23,0.8), inset 0 1px 0 rgba(124,255,77,0.18)`,
        }}
      />
      <span
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.08) 0%, transparent 50%)' }}
      />
      <span aria-hidden className="absolute inset-0 rounded-full ring-2 ring-[#7cff4d]/30" />

      <MessageCircle
        className="relative text-[#c8ffe0]"
        style={{ width: size * 0.42, height: size * 0.42 }}
        strokeWidth={2.25}
        aria-hidden
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
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stickRef = useRef(true);
  const pendingPrompt = useRef<string | null>(null);

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
    if (items.length) window.sessionStorage.setItem(STORE_KEY, JSON.stringify(items.slice(-40)));
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
    async (question: string, base?: ChatItem[]) => {
      const text = question.trim().slice(0, MAX_INPUT);
      if (!text || streaming) return;
      if (text === PERSON) {
        setView('person');
        return;
      }
      const history = base ?? items;
      const userItem: ChatItem = { id: uid(), role: 'user', text };
      const assistantId = uid();
      const next = [...history, userItem];
      setItems([...next, { id: assistantId, role: 'assistant', text: '', status: 'streaming' }]);
      setInput('');
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
              patch((m) => ({ ...m, text: m.text || event.message, status: m.text ? 'done' : 'error', suggestions: [PERSON] }));
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
              ? 'You are sending messages very fast. Give it a minute, or talk to a person.'
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
    [items, streaming, pathname, locale],
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
  const aiOn = welcome?.aiEnabled ?? true;
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
            className="fixed inset-0 z-[95] bg-slate-950/60 backdrop-blur-md"
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
              initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.93, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={reduceMotion ? undefined : { opacity: 0, y: 20, scale: 0.95, filter: 'blur(5px)' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={cn(
                'pointer-events-auto flex origin-bottom-right flex-col overflow-hidden',
                // Premium glass shell
                'border border-white/[0.07] bg-[#0a0f0d]/96 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.75),0_0_0_1px_rgba(124,255,77,0.07),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl',
                mobile
                  ? 'fixed inset-0 h-dvh w-full rounded-none pb-[var(--safe-bottom)] pt-[var(--safe-top)]'
                  : big
                    ? 'fixed inset-0 m-auto h-[min(54rem,calc(100dvh-4rem))] w-[min(64rem,calc(100vw-3rem))] rounded-[2rem]'
                    : cn(
                        'w-[min(26rem,calc(100vw-1rem))] rounded-[1.75rem]',
                        onDashboard
                          ? 'h-[min(42rem,calc(100dvh-10.5rem))] lg:h-[min(42rem,calc(100dvh-7rem))]'
                          : 'h-[min(42rem,calc(100dvh-6.5rem))]',
                      ),
              )}
            >
              <Header
                view={view}
                streaming={streaming}
                aiOn={aiOn}
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
                    className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain"
                    aria-live="polite"
                  >
                    <div className={cn('mx-auto w-full px-3.5 py-5 sm:px-5', big && 'max-w-3xl')}>
                      {items.length === 0 ? (
                        <EmptyState welcome={welcome} big={big} onAsk={(q) => void ask(q)} />
                      ) : (
                        <div className="space-y-5">
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
                            />
                          ))}
                          {!streaming && last?.role === 'assistant' && last.suggestions?.length ? (
                            <motion.div
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 }}
                              className="flex flex-wrap gap-1.5 pl-10"
                            >
                              {last.suggestions.map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => void ask(s)}
                                  className={cn(
                                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-medium transition hover:-translate-y-px',
                                    s === PERSON
                                      ? 'border-transparent bg-white text-slate-900 shadow-sm hover:opacity-90'
                                      : 'border-white/10 bg-white/5 text-slate-200 hover:border-[#7cff4d]/40 hover:bg-[#7cff4d]/10 hover:text-[#7cff4d]',
                                  )}
                                >
                                  {s === PERSON ? (
                                    <Headphones className="h-3 w-3" />
                                  ) : (
                                    <Sparkles className="h-3 w-3 text-[#7cff4d]" />
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
                    input={input}
                    setInput={setInput}
                    inputRef={inputRef}
                    streaming={streaming}
                    onSend={() => void ask(input)}
                    onStop={stop}
                    onPerson={() => setView('person')}
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
                    className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#7cff4d] to-emerald-500 text-[#031209] shadow-lg shadow-[#7cff4d]/30"
                  >
                    <CheckCircle2 className="h-8 w-8" />
                  </motion.span>
                  <div>
                    <p className="font-display text-xl font-bold text-white">{t('chat.sent')}</p>
                    <p className="mt-1 max-w-xs text-sm text-slate-400">{sentNote}</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {user ? (
                      <Link href="/dashboard/support" onClick={close} className="btn-secondary px-3 text-xs">
                        {t('chat.tickets')}
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setView('chat')}
                      className="btn-primary px-3 text-xs"
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
              className="pointer-events-auto relative mr-1 flex max-w-[17rem] items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-[#0d1a11]/95 py-3 pl-3.5 pr-9 text-left shadow-2xl backdrop-blur-xl"
            >
              {/* Green glow */}
              <span
                aria-hidden
                className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[#7cff4d]/20 blur-2xl"
              />
              <AssistantOrb size={32} />
              <button
                type="button"
                className="text-left"
                onClick={() => {
                  setOpen(true);
                  dismissNudge();
                }}
              >
                <p className="text-[12.5px] font-semibold text-white">{t('chat.nudge.title')}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{t('chat.nudge.body')}</p>
              </button>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={dismissNudge}
                className="absolute right-2 top-2 rounded-full p-1 text-slate-500 hover:bg-white/10 hover:text-slate-200 transition"
              >
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* ── FAB trigger button ── */}
        {!(open && (mobile || big)) ? (
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
            whileHover={reduceMotion ? undefined : { scale: 1.07 }}
            whileTap={{ scale: 0.9 }}
            className="pointer-events-auto relative inline-flex h-14 w-14 items-center justify-center rounded-full min-[340px]:h-[3.75rem] min-[340px]:w-[3.75rem]"
          >
            {/* Outer ambient glow ring */}
            {!open && !reduceMotion ? (
              <motion.span
                aria-hidden
                className="absolute -inset-1.5 rounded-full"
                style={{
                  background:
                    'radial-gradient(circle, rgba(124,255,77,0.4) 0%, rgba(20,184,166,0.15) 50%, transparent 70%)',
                }}
                animate={{ opacity: [0.4, 0.9, 0.4], scale: [0.9, 1.1, 0.9] }}
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
                  className="relative inline-flex h-full w-full items-center justify-center rounded-full text-[#c8ffe0] ring-2 ring-[#7cff4d]/30"
                  style={{
                    background: 'linear-gradient(145deg, #17533a 0%, #062417 55%, #031209 100%)',
                    boxShadow: '0 12px 32px -8px rgba(6,36,23,0.85), inset 0 1px 0 rgba(124,255,77,0.2)',
                  }}
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
        ) : null}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------- header

function Header({
  view,
  streaming,
  aiOn,
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
  aiOn: boolean;
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
  const reduce = useReducedMotion();

  const iconBtn =
    'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 ring-1 ring-white/8 transition hover:bg-white/10 hover:text-white bg-white/5';

  return (
    <header className="relative shrink-0 overflow-hidden px-4 pb-4 pt-4">
      {/* Deep forest gradient base */}
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(160deg, #0d2318 0%, #071710 40%, #040e09 100%)',
        }}
      />

      {/* Animated aurora orbs */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -left-16 -top-20 h-52 w-52 rounded-full bg-[#14b8a6]/40 blur-3xl"
        animate={reduce ? undefined : { x: [0, 36, -12, 0], y: [0, 18, 8, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-[#7cff4d]/25 blur-3xl"
        animate={reduce ? undefined : { x: [0, -28, 10, 0], y: [0, 22, -6, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -bottom-24 left-1/3 h-36 w-36 rounded-full bg-violet-500/18 blur-3xl"
        animate={reduce ? undefined : { x: [0, 28, -18, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Gradient veil and hairline border */}
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-[#040e09]/60" />
      <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#7cff4d]/40 to-transparent" />

      {/* Content row */}
      <div className="relative flex items-center gap-3">
        {view !== 'chat' ? (
          <button type="button" onClick={onBack} aria-label="Back to chat" className={iconBtn}>
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : (
          <AssistantOrb size={42} active={streaming} />
        )}

        <div className="min-w-0 flex-1">
          {/* Title with subtle gradient text */}
          <p className="flex items-center gap-2 truncate font-display text-[16px] font-bold leading-tight tracking-tight text-white">
            {view === 'chat' ? t('chat.title') : t('chat.person')}
          </p>

          {/* Status line */}
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-[10.5px] text-slate-400">
            {view === 'chat' ? (
              <>
                {/* Pulsing status dot */}
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span
                    className={cn(
                      'absolute inline-flex h-full w-full rounded-full',
                      streaming ? 'animate-ping bg-amber-400 opacity-70' : 'animate-ping bg-[#7cff4d] opacity-60',
                    )}
                  />
                  <span
                    className={cn(
                      'relative inline-flex h-1.5 w-1.5 rounded-full',
                      streaming ? 'bg-amber-400' : 'bg-[#7cff4d]',
                    )}
                  />
                </span>
                {streaming
                  ? 'Writing an answer…'
                  : aiOn
                    ? 'Online · knows Dealo inside out'
                    : 'Online · instant answers'}
              </>
            ) : signedIn ? (
              'We open a support ticket with this chat'
            ) : (
              'We reply by email, usually within a few hours'
            )}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          {view === 'chat' && hasChat ? (
            <button type="button" onClick={onRestart} aria-label="New chat" title="New chat" className={iconBtn}>
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
          <button type="button" onClick={onClose} aria-label="Close" className={iconBtn}>
            <X className="h-3.5 w-3.5" />
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
  onAsk,
}: {
  welcome: AssistantWelcome | null;
  big: boolean;
  onAsk: (q: string) => void;
}) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col items-center pt-2 text-center">
      <motion.div
        initial={{ scale: 0.65, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        className="relative"
      >
        <span
          aria-hidden
          className="absolute inset-0 -z-10 scale-[1.8] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(124,255,77,0.18) 0%, transparent 70%)' }}
        />
        <AssistantOrb size={big ? 72 : 64} />
      </motion.div>

      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-5 font-display text-[1.3rem] font-bold leading-tight text-white sm:text-2xl"
      >
        {welcome ? (
          <>
            {welcome.greeting}.{' '}
            <span
              style={{
                background: 'linear-gradient(90deg, #7cff4d, #14b8a6, #38bdf8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {t('chat.help')}
            </span>
          </>
        ) : (
          t('chat.help')
        )}
      </motion.h3>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className="mt-2 max-w-xs text-[12.5px] leading-relaxed text-slate-400"
      >
        {welcome?.intro ?? t('chat.nudge.body')}
      </motion.p>

      <div className={cn('mt-6 grid w-full gap-2.5', big ? 'grid-cols-4' : 'grid-cols-2')}>
        {CAPABILITIES.map((c, i) => (
          <motion.button
            key={c.title}
            type="button"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.07 }}
            whileHover={{ y: -3 }}
            onClick={() => onAsk(c.prompt)}
            className={cn(
              'group relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.04] p-3 text-left transition hover:border-white/14 hover:bg-white/[0.07]',
              `ring-1 ${c.ring} ring-inset`,
            )}
          >
            {/* Capability icon with gradient bubble */}
            <span
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md',
                c.gradient,
              )}
            >
              <c.icon className="h-4 w-4" />
            </span>
            <p className="mt-2.5 text-[12.5px] font-semibold text-white">{c.title}</p>
            <p className="text-[11px] text-slate-500">{c.body}</p>

            {/* Hover shine */}
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-[0.06]',
                c.gradient,
              )}
            />
          </motion.button>
        ))}
      </div>

      {/* Page-context suggestion chips */}
      {welcome?.suggestions.length ? (
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {welcome.suggestions.map((s, i) => (
            <motion.button
              key={s}
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.42 + i * 0.05 }}
              onClick={() => onAsk(s)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11.5px] font-medium text-slate-300 transition hover:border-[#7cff4d]/40 hover:text-[#7cff4d]"
            >
              {s === PERSON ? <Headphones className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3 text-[#7cff4d]" />}
              {s === PERSON ? t('chat.person') : s}
            </motion.button>
          ))}
        </div>
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
}: {
  item: ChatItem;
  isLast: boolean;
  busy: boolean;
  onNavigate: () => void;
  onRate: (rating: 'up' | 'down') => void;
  onRegenerate: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const reduce = useReducedMotion();

  if (item.role === 'user') {
    return (
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="flex justify-end"
      >
        <p
          className="max-w-[85%] whitespace-pre-wrap rounded-[1.25rem] rounded-br-md px-3.5 py-2.5 text-[13.5px] leading-relaxed text-white shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #17533a 0%, #0a3528 50%, #041f14 100%)',
            boxShadow: '0 4px 20px -6px rgba(20,184,166,0.35)',
          }}
        >
          {item.text}
        </p>
      </motion.div>
    );
  }

  const thinking = item.status === 'streaming' && !item.text;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex gap-2.5"
    >
      <AssistantOrb size={30} active={item.status === 'streaming'} className="mt-0.5" />

      <div className="min-w-0 flex-1">
        {thinking ? (
          /* Animated "thinking" shimmer */
          <div className="flex items-center gap-2 py-1.5">
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-[#7cff4d]/60"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
            <motion.span
              className="text-[12.5px] font-medium text-slate-400"
              animate={reduce ? undefined : { opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            >
              Thinking it through…
            </motion.span>
          </div>
        ) : (
          <div
            className={cn(
              'rounded-[1.25rem] rounded-tl-md border px-3.5 py-3',
              item.status === 'error'
                ? 'border-red-500/20 bg-red-500/5 text-red-300'
                : 'border-white/8 bg-white/[0.04] text-slate-100',
            )}
          >
            <AssistantMarkdown text={item.text} streaming={item.status === 'streaming'} onNavigate={onNavigate} />
          </div>
        )}

        {/* Quick-access links */}
        {item.links?.length && item.status === 'done' ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={onNavigate}
                className="inline-flex items-center gap-1 rounded-full border border-[#7cff4d]/25 bg-[#7cff4d]/8 px-2.5 py-1 text-[11px] font-semibold text-[#7cff4d] transition hover:-translate-y-px hover:border-[#7cff4d]/50"
              >
                {l.label} <ArrowUpRight className="h-3 w-3" />
              </Link>
            ))}
          </div>
        ) : null}

        {/* Message actions toolbar */}
        {item.status === 'done' && item.text ? (
          <div
            className={cn(
              'mt-1.5 flex items-center gap-0.5 transition',
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
              {copied ? <Check className="h-3.5 w-3.5 text-[#7cff4d]" /> : <Copy className="h-3.5 w-3.5" />}
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
              <span className="ml-1 text-[10.5px] text-[#7cff4d]">Thanks for the feedback</span>
            ) : null}
            {item.source ? (
              <span className="ml-auto text-[10px] uppercase tracking-wider text-slate-600">
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
        'inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/8 hover:text-slate-200 disabled:cursor-default disabled:opacity-40',
        active && 'bg-[#7cff4d]/10 text-[#7cff4d] opacity-100',
      )}
    >
      {children}
    </button>
  );
}

// -------------------------------------------------------------------- composer

function Composer({
  big,
  input,
  setInput,
  inputRef,
  streaming,
  onSend,
  onStop,
  onPerson,
}: {
  big: boolean;
  input: string;
  setInput: (v: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  streaming: boolean;
  onSend: () => void;
  onStop: () => void;
  onPerson: () => void;
}) {
  const { t } = useLocale();
  const placeholder = t('chat.placeholder');
  const near = input.length > MAX_INPUT * 0.8;

  return (
    <form
      className="relative shrink-0 border-t border-white/[0.06] bg-gradient-to-b from-transparent to-[#040e09]/70 px-3 pb-3 pt-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!streaming) onSend();
      }}
    >
      <div className={cn('mx-auto w-full', big && 'max-w-3xl')}>
        {/* Input field with animated gradient border on focus */}
        <div className="group relative rounded-[1.4rem] p-px transition-all duration-200 focus-within:[background:linear-gradient(120deg,#14b8a6,#7cff4d_50%,#38bdf8)] [background:rgba(255,255,255,0.08)]">
          <div className="flex items-end gap-2 rounded-[calc(1.4rem-1px)] bg-[#0d1a11]/90 px-2.5 py-2 backdrop-blur-sm">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  if (!streaming) onSend();
                }
              }}
              rows={1}
              placeholder={placeholder}
              aria-label={placeholder}
              className="max-h-[168px] min-h-[2.4rem] flex-1 resize-none bg-transparent px-1.5 py-2 text-[13.5px] leading-relaxed text-white outline-none placeholder:text-slate-600"
            />

            {/* Stop / Send button */}
            {streaming ? (
              <motion.button
                type="button"
                onClick={onStop}
                aria-label="Stop answering"
                whileTap={{ scale: 0.88 }}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg shadow-white/20"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </motion.button>
            ) : (
              <motion.button
                type="submit"
                disabled={!input.trim()}
                aria-label="Send"
                whileTap={{ scale: 0.88 }}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#031209] shadow-lg shadow-[#7cff4d]/30 transition disabled:opacity-30 disabled:shadow-none"
                style={{
                  background: input.trim()
                    ? 'linear-gradient(145deg, #7cff4d 0%, #3dbe1a 60%, #1f7a08 100%)'
                    : 'rgba(255,255,255,0.08)',
                  color: input.trim() ? '#031209' : 'rgba(255,255,255,0.3)',
                }}
              >
                <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
              </motion.button>
            )}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 px-1 text-[11px] text-slate-600">
          <button
            type="button"
            onClick={onPerson}
            className="inline-flex items-center gap-1 font-semibold text-slate-400 transition hover:text-white"
          >
            <UserRound className="h-3.5 w-3.5" /> {t('chat.person')}
          </button>
          {near ? (
            <span className={cn('tabular-nums', input.length >= MAX_INPUT && 'text-red-500')}>
              {input.length}/{MAX_INPUT}
            </span>
          ) : (
            <span className="text-[10px] text-slate-700">{t('chat.disclaimer')}</span>
          )}
        </div>
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
  onSent,
}: {
  signedIn: boolean;
  defaultName: string;
  defaultEmail: string;
  defaultMessage: string;
  chat: AssistantMessage[];
  page: string;
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
    if (message.trim().length < 8) return setError('Please tell us a little more (at least 8 characters).');
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
        onSent('A person from our team will reply on your ticket. You can follow it under Dashboard, Support.');
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

  return (
    <form onSubmit={(e) => void submit(e)} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {/* Info callout */}
        <div className="flex items-start gap-3 rounded-2xl border border-[#7cff4d]/15 bg-[#7cff4d]/5 p-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7cff4d] to-emerald-500 text-[#031209] shadow-sm shadow-[#7cff4d]/30">
            <Headphones className="h-4 w-4" />
          </span>
          <p className="text-xs leading-relaxed text-slate-300">
            {signedIn
              ? 'Your message and this chat go straight to our support team as a ticket.'
              : 'Leave your name and email. Our team gets this chat too, so you will not need to repeat yourself.'}
          </p>
        </div>

        {/* Guest fields */}
        {!signedIn ? (
          <>
            <label className="block text-xs font-semibold text-slate-300">
              Your name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={120}
                className="input-field mt-1 bg-white/5 text-white placeholder:text-slate-600 border-white/10 focus:border-[#7cff4d]/40"
                autoComplete="name"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-300">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
                className="input-field mt-1 bg-white/5 text-white placeholder:text-slate-600 border-white/10 focus:border-[#7cff4d]/40"
                autoComplete="email"
                placeholder="you@email.com"
              />
            </label>
          </>
        ) : (
          <label className="block text-xs font-semibold text-slate-300">
            What is it about?
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-field mt-1 bg-white/5 text-white border-white/10 focus:border-[#7cff4d]/40"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block text-xs font-semibold text-slate-300">
          How can we help?
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
            rows={4}
            required
            className="input-field mt-1 min-h-[6rem] bg-white/5 text-white placeholder:text-slate-600 border-white/10 focus:border-[#7cff4d]/40"
            placeholder="What happened, and what you expected…"
          />
        </label>

        {error ? <p className="text-xs text-red-400">{error}</p> : null}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-white/[0.06] px-4 py-3">
        <button
          type="submit"
          disabled={sending}
          className="btn-primary px-4 text-xs disabled:opacity-60"
        >
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          {signedIn ? 'Open ticket' : 'Send'}
        </button>
      </div>
    </form>
  );
}

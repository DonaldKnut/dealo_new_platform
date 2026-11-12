'use client';

import { ASSISTANT_NAME, type AssistantLink, type AssistantMessage, type AssistantReply, type AssistantWelcome } from '@dealo/shared';
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
import { WhatsAppIcon } from '@/components/whatsapp-icon';
import { useAuthSession } from '@/hooks/use-auth-session';
import { ApiError, apiFetch } from '@/lib/api';
import { OPEN_ASSISTANT_EVENT, streamAssistant } from '@/lib/assistant-client';
import { cn } from '@/lib/utils';
import { whatsappHref, whatsappMessageFor } from '@/lib/whatsapp';

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

const CAPABILITIES: { icon: LucideIcon; title: string; body: string; prompt: string; tone: string }[] = [
  { icon: FileText, title: 'Standout CV', body: 'Rewrite, tailor, download', prompt: 'Help me make my CV stand out for jobs in Nigeria', tone: 'from-emerald-400/25 to-teal-500/5 text-emerald-600 dark:text-emerald-300' },
  { icon: Briefcase, title: 'Find a job', body: 'Nigerian & remote roles', prompt: 'Find jobs in Nigeria that match my skills, and how do I apply?', tone: 'from-sky-400/25 to-cyan-500/5 text-sky-600 dark:text-sky-300' },
  { icon: Bot, title: 'Hire with AI', body: 'Agents, ATS, shortlists', prompt: 'How can Dealo help me hire faster? Compare Hiring Agents, the ATS and your recruiters.', tone: 'from-violet-400/25 to-fuchsia-500/5 text-violet-600 dark:text-violet-300' },
  { icon: Code2, title: 'Build on the API', body: 'Keys, webhooks, code', prompt: 'Show me how to create a hire request with the Dealo API in JavaScript, with webhooks', tone: 'from-amber-400/25 to-orange-500/5 text-amber-600 dark:text-amber-300' },
];

const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

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

/** The animated gradient orb that is Dealo AI's face. Spins faster while it is answering. */
function AssistantOrb({ size = 40, active = false, className }: { size?: number; active?: boolean; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <span className={cn('relative inline-flex shrink-0 items-center justify-center rounded-full', className)} style={{ width: size, height: size }}>
      <motion.span
        aria-hidden
        className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#7cff4d,#14b8a6,#38bdf8,#a78bfa,#7cff4d)]"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: active ? 1.6 : 6, repeat: Infinity, ease: 'linear' }}
      />
      <span aria-hidden className="absolute inset-[2px] rounded-full bg-[radial-gradient(circle_at_30%_25%,#1f6b4a,#062417_70%)]" />
      <span aria-hidden className="absolute inset-[2px] rounded-full bg-[radial-gradient(circle_at_32%_22%,rgba(255,255,255,0.45),transparent_45%)]" />
      {active && !reduce ? (
        <motion.span
          aria-hidden
          className="absolute -inset-1 rounded-full border border-[#7cff4d]/50"
          animate={{ scale: [1, 1.18, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
      ) : null}
      <Sparkles className="relative text-[#c9ffb0]" style={{ width: size * 0.42, height: size * 0.42 }} />
    </span>
  );
}

export function HelpWidget() {
  const { t } = useLocale();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const mobile = useIsMobile();
  const { user } = useAuthSession();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<View>('chat');
  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [welcome, setWelcome] = useState<AssistantWelcome | null>(null);
  const [sentNote, setSentNote] = useState('');
  const [nudge, setNudge] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stickRef = useRef(true);
  const pendingPrompt = useRef<string | null>(null);

  const whatsapp = whatsappHref(whatsappMessageFor(pathname, t('wa.prefill')));
  const onDashboard = pathname.startsWith('/dashboard');
  const big = expanded && !mobile;

  // ------------------------------------------------------------------ persistence

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(STORE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ChatItem[];
        if (Array.isArray(parsed)) setItems(parsed.map((m) => (m.status === 'streaming' ? { ...m, status: 'done' } : m)));
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
    if (list && stickRef.current) list.scrollTo({ top: list.scrollHeight, behavior: reduceMotion || streaming ? 'auto' : 'smooth' });
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
      const patch = (fn: (m: ChatItem) => ChatItem) => setItems((cur) => cur.map((m) => (m.id === assistantId ? fn(m) : m)));

      try {
        await streamAssistant(
          { messages: transcript(next), page: pathname },
          (event) => {
            if (event.type === 'start') patch((m) => ({ ...m, source: event.source }));
            else if (event.type === 'delta') patch((m) => ({ ...m, text: m.text + event.text }));
            else if (event.type === 'done') {
              const r = event.reply;
              const suggestions = r.handoff && !r.suggestions.includes(PERSON) ? [PERSON, ...r.suggestions].slice(0, 4) : r.suggestions;
              patch((m) => ({ ...m, id: r.id, text: r.reply, links: r.links, suggestions, handoff: r.handoff, source: r.source, status: 'done' }));
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
            text: busy ? 'You are sending messages very fast. Give it a minute, or talk to a person.' : err instanceof ApiError && err.status === 400 ? err.message : 'I cannot reach Dealo right now. Check your connection, or talk to a person.',
            suggestions: [PERSON],
            handoff: true,
          }));
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [items, streaming, pathname],
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
      json: { messageId: item.id.slice(0, 64), rating, question: question.slice(0, 2000), answer: item.text.slice(0, 6000), page: pathname },
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

  return (
    <>
      <AnimatePresence>
        {open && big ? (
          <motion.button
            type="button"
            aria-label="Collapse assistant"
            className="fixed inset-0 z-[95] bg-[#04140c]/55 backdrop-blur-md"
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
          onDashboard ? 'bottom-[calc(4.75rem+var(--safe-bottom))] lg:bottom-6' : 'bottom-[max(0.75rem,var(--safe-bottom))] sm:bottom-6',
        )}
      >
        <AnimatePresence>
          {open ? (
            <motion.section
              key="panel"
              layout={!reduceMotion}
              role="dialog"
              aria-label={ASSISTANT_NAME}
              initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.94, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={reduceMotion ? undefined : { opacity: 0, y: 18, scale: 0.95, filter: 'blur(4px)' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className={cn(
                'pointer-events-auto flex origin-bottom-right flex-col overflow-hidden border border-white/10 bg-surface-elevated/95 shadow-[0_30px_90px_-20px_rgba(4,47,46,0.55),0_0_0_1px_rgba(124,255,77,0.06)] backdrop-blur-xl',
                mobile
                  ? 'fixed inset-0 h-dvh w-full rounded-none pb-[var(--safe-bottom)] pt-[var(--safe-top)]'
                  : big
                    ? 'fixed inset-0 m-auto h-[min(52rem,calc(100dvh-4rem))] w-[min(62rem,calc(100vw-3rem))] rounded-[2rem]'
                    : cn(
                        'w-[min(26rem,calc(100vw-1rem))] rounded-[1.75rem]',
                        onDashboard ? 'h-[min(42rem,calc(100dvh-10.5rem))] lg:h-[min(42rem,calc(100dvh-7rem))]' : 'h-[min(42rem,calc(100dvh-6.5rem))]',
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
                            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-wrap gap-1.5 pl-10">
                              {last.suggestions.map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => void ask(s)}
                                  className={cn(
                                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-medium transition hover:-translate-y-px',
                                    s === PERSON
                                      ? 'border-transparent bg-foreground text-background shadow-sm hover:opacity-90'
                                      : 'border-border bg-surface/70 text-foreground hover:border-brand/60 hover:bg-brand-soft/50 hover:text-brand',
                                  )}
                                >
                                  {s === PERSON ? <Headphones className="h-3 w-3" /> : <Sparkles className="h-3 w-3 text-brand" />}
                                  {s}
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
                    streaming={streaming}
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
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                  <motion.span
                    initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 16 }}
                    className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand to-emerald-400 text-white shadow-lg shadow-brand/30 dark:text-[#071f14]"
                  >
                    <CheckCircle2 className="h-8 w-8" />
                  </motion.span>
                  <p className="font-display text-xl text-foreground">Message sent</p>
                  <p className="max-w-xs text-sm text-muted">{sentNote}</p>
                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    {user ? (
                      <Link href="/dashboard/support" onClick={close} className="btn-secondary px-3 text-xs">
                        See my tickets
                      </Link>
                    ) : null}
                    <button type="button" onClick={() => setView('chat')} className="btn-primary px-3 text-xs">
                      Back to chat
                    </button>
                  </div>
                </div>
              ) : null}
            </motion.section>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {nudge && !open ? (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.95 }}
              className="pointer-events-auto relative mr-1 flex max-w-[16rem] items-center gap-2.5 rounded-2xl border border-border bg-surface-elevated/95 py-2.5 pl-3 pr-8 text-left shadow-xl backdrop-blur"
            >
              <AssistantOrb size={28} />
              <button
                type="button"
                className="text-left"
                onClick={() => {
                  setOpen(true);
                  dismissNudge();
                }}
              >
                <p className="text-[12.5px] font-semibold text-foreground">Need a hand?</p>
                <p className="text-[11px] text-muted">Ask Dealo AI anything, answers in seconds.</p>
              </button>
              <button type="button" aria-label="Dismiss" onClick={dismissNudge} className="absolute right-2 top-2 rounded-full p-1 text-muted hover:bg-surface hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {!(open && (mobile || big)) ? (
          <motion.button
            type="button"
            data-tour="support-help"
            aria-label={open ? `Close ${ASSISTANT_NAME}` : `Open ${ASSISTANT_NAME}`}
            aria-expanded={open}
            title={`${ASSISTANT_NAME} (Ctrl + /)`}
            onClick={() => {
              setOpen((v) => !v);
              dismissNudge();
            }}
            whileHover={reduceMotion ? undefined : { scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            className="pointer-events-auto relative inline-flex h-14 w-14 items-center justify-center rounded-full shadow-[0_18px_40px_-8px_rgba(15,118,110,0.65)] min-[340px]:h-[3.75rem] min-[340px]:w-[3.75rem]"
          >
            {!open && !reduceMotion ? (
              <motion.span
                aria-hidden
                className="absolute -inset-1 rounded-full bg-[#7cff4d]/25 blur-md"
                animate={{ opacity: [0.35, 0.8, 0.35], scale: [0.95, 1.08, 0.95] }}
                transition={{ duration: 3.2, repeat: Infinity }}
              />
            ) : null}
            <AnimatePresence mode="wait" initial={false}>
              {open ? (
                <motion.span
                  key="x"
                  initial={{ rotate: -60, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 60, opacity: 0 }}
                  className="relative inline-flex h-full w-full items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_25%,#1f6b4a,#062417_70%)] text-[#c9ffb0] ring-2 ring-[#7cff4d]/40"
                >
                  <X className="h-5 w-5" />
                </motion.span>
              ) : (
                <motion.span key="orb" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} className="relative">
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
  const reduce = useReducedMotion();
  const iconBtn = 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/90 ring-1 ring-white/10 transition hover:bg-white/20 hover:text-white';
  return (
    <header className="relative shrink-0 overflow-hidden bg-[#05170e] px-4 pb-4 pt-4 text-white">
      {/* Aurora */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -left-16 -top-24 h-56 w-56 rounded-full bg-[#14b8a6]/45 blur-3xl"
        animate={reduce ? undefined : { x: [0, 40, -10, 0], y: [0, 20, 10, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-[#7cff4d]/30 blur-3xl"
        animate={reduce ? undefined : { x: [0, -30, 10, 0], y: [0, 25, -5, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        aria-hidden
        className="pointer-events-none absolute bottom-[-6rem] left-1/3 h-40 w-40 rounded-full bg-[#a78bfa]/25 blur-3xl"
        animate={reduce ? undefined : { x: [0, 30, -20, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(5,23,14,0.55))]" />
      <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#7cff4d]/50 to-transparent" />

      <div className="relative flex items-center gap-3">
        {view !== 'chat' ? (
          <button type="button" onClick={onBack} aria-label="Back to chat" className={iconBtn}>
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : (
          <AssistantOrb size={42} active={streaming} />
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate font-display text-[17px] leading-tight tracking-tight">
            {view === 'chat' ? ASSISTANT_NAME : 'Talk to a person'}
            {view === 'chat' ? (
              <span className="rounded-full border border-[#7cff4d]/40 bg-[#7cff4d]/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-widest text-[#b8ff9a]">
                {aiOn ? 'AI' : 'Guide'}
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-white/70">
            {view === 'chat' ? (
              <>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7cff4d] opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#7cff4d]" />
                </span>
                {streaming ? 'Writing an answer…' : aiOn ? 'Online · knows Dealo inside out' : 'Online · instant answers'}
              </>
            ) : signedIn ? (
              'We open a support ticket with this chat'
            ) : (
              'We reply by email, usually within a few hours'
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {view === 'chat' && hasChat ? (
            <button type="button" onClick={onRestart} aria-label="New chat" title="New chat" className={iconBtn}>
              <SquarePen className="h-4 w-4" />
            </button>
          ) : null}
          {canExpand ? (
            <button type="button" onClick={onToggleExpand} aria-label={expanded ? 'Shrink' : 'Expand'} title={expanded ? 'Shrink' : 'Expand'} className={cn(iconBtn, 'hidden sm:inline-flex')}>
              {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          ) : null}
          <button type="button" onClick={onClose} aria-label="Close" className={iconBtn}>
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

// ----------------------------------------------------------------- empty state

function EmptyState({ welcome, big, onAsk }: { welcome: AssistantWelcome | null; big: boolean; onAsk: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center pt-2 text-center">
      <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }} className="relative">
        <span aria-hidden className="absolute inset-0 -z-10 scale-150 rounded-full bg-[#7cff4d]/20 blur-2xl" />
        <AssistantOrb size={big ? 76 : 64} />
      </motion.div>
      <motion.h3 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mt-4 font-display text-[1.35rem] leading-tight text-foreground sm:text-2xl">
        {welcome ? (
          <>
            {welcome.greeting}.
            <br />
            <span className="bg-gradient-to-r from-brand via-emerald-500 to-sky-500 bg-clip-text text-transparent">How can I help?</span>
          </>
        ) : (
          'How can I help?'
        )}
      </motion.h3>
      <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-muted">
        {welcome?.intro ?? 'Ask about hiring, jobs, CVs, the Dealo API, or anything you are stuck on.'}
      </motion.p>

      <div className={cn('mt-5 grid w-full gap-2.5', big ? 'grid-cols-4' : 'grid-cols-2')}>
        {CAPABILITIES.map((c, i) => (
          <motion.button
            key={c.title}
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 + i * 0.06 }}
            whileHover={{ y: -3 }}
            onClick={() => onAsk(c.prompt)}
            className="group relative overflow-hidden rounded-2xl border border-border bg-surface/60 p-3 text-left transition hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5"
          >
            <span aria-hidden className={cn('absolute inset-0 bg-gradient-to-br opacity-0 transition group-hover:opacity-100', c.tone)} />
            <span className={cn('relative inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br', c.tone)}>
              <c.icon className="h-4 w-4" />
            </span>
            <p className="relative mt-2 text-[12.5px] font-semibold text-foreground">{c.title}</p>
            <p className="relative text-[11px] text-muted">{c.body}</p>
          </motion.button>
        ))}
      </div>

      {welcome?.suggestions.length ? (
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {welcome.suggestions.map((s, i) => (
            <motion.button
              key={s}
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              onClick={() => onAsk(s)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1.5 text-[11.5px] font-medium text-foreground transition hover:border-brand/60 hover:text-brand"
            >
              {s === PERSON ? <Headphones className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3 text-brand" />}
              {s}
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
      <motion.div initial={reduce ? false : { opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-[1.25rem] rounded-br-md bg-gradient-to-br from-[#14b8a6] via-brand to-[#065f46] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-white shadow-md shadow-brand/20">
          {item.text}
        </p>
      </motion.div>
    );
  }

  const thinking = item.status === 'streaming' && !item.text;
  return (
    <motion.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="group flex gap-2.5">
      <AssistantOrb size={30} active={item.status === 'streaming'} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        {thinking ? (
          <div className="flex items-center gap-2 py-1.5">
            <motion.span
              className="bg-[linear-gradient(90deg,var(--color-muted,#6b7280)_0%,#14b8a6_40%,#7cff4d_50%,var(--color-muted,#6b7280)_70%)] bg-[length:200%_100%] bg-clip-text text-[13px] font-medium text-transparent"
              animate={reduce ? undefined : { backgroundPosition: ['100% 0%', '-100% 0%'] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
            >
              Thinking it through…
            </motion.span>
          </div>
        ) : (
          <div
            className={cn(
              'rounded-[1.25rem] rounded-tl-md border px-3.5 py-3',
              item.status === 'error' ? 'border-red-500/30 bg-red-500/5' : 'border-border/80 bg-surface/50',
            )}
          >
            <AssistantMarkdown text={item.text} streaming={item.status === 'streaming'} onNavigate={onNavigate} />
          </div>
        )}

        {item.links?.length && item.status === 'done' ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={onNavigate}
                className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand-soft/60 px-2.5 py-1 text-[11px] font-semibold text-brand transition hover:-translate-y-px hover:border-brand"
              >
                {l.label} <ArrowUpRight className="h-3 w-3" />
              </Link>
            ))}
          </div>
        ) : null}

        {item.status === 'done' && item.text ? (
          <div className={cn('mt-1.5 flex items-center gap-0.5 text-muted transition', isLast ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100')}>
            <ActionButton
              label={copied ? 'Copied' : 'Copy'}
              onClick={() => {
                void navigator.clipboard?.writeText(item.text).then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1400);
                });
              }}
            >
              {copied ? <Check className="h-3.5 w-3.5 text-brand" /> : <Copy className="h-3.5 w-3.5" />}
            </ActionButton>
            <ActionButton label="Helpful" active={item.rating === 'up'} disabled={Boolean(item.rating)} onClick={() => onRate('up')}>
              <ThumbsUp className="h-3.5 w-3.5" />
            </ActionButton>
            <ActionButton label="Not helpful" active={item.rating === 'down'} disabled={Boolean(item.rating)} onClick={() => onRate('down')}>
              <ThumbsDown className="h-3.5 w-3.5" />
            </ActionButton>
            {isLast ? (
              <ActionButton label="Regenerate" disabled={busy} onClick={onRegenerate}>
                <RefreshCw className="h-3.5 w-3.5" />
              </ActionButton>
            ) : null}
            {item.rating ? <span className="ml-1 text-[10.5px] text-brand">Thanks for the feedback</span> : null}
            {item.source ? (
              <span className="ml-auto text-[10px] uppercase tracking-wider text-muted/70">{item.source === 'ai' ? 'Dealo AI' : 'Dealo guide'}</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

function ActionButton({ label, onClick, children, active, disabled }: { label: string; onClick: () => void; children: React.ReactNode; active?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled && !active}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-surface hover:text-foreground disabled:cursor-default disabled:opacity-40',
        active && 'bg-brand-soft text-brand opacity-100',
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
  streaming,
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
  streaming: boolean;
  onSend: () => void;
  onStop: () => void;
  onPerson: () => void;
  whatsapp: string | null;
}) {
  const near = input.length > MAX_INPUT * 0.8;
  return (
    <form
      className="relative shrink-0 border-t border-border/70 bg-gradient-to-b from-transparent to-surface/40 px-3 pb-3 pt-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!streaming) onSend();
      }}
    >
      <div className={cn('mx-auto w-full', big && 'max-w-3xl')}>
        <div className="group relative rounded-[1.4rem] p-px transition focus-within:bg-[linear-gradient(120deg,#14b8a6,#7cff4d,#38bdf8)] bg-border/80">
          <div className="flex items-end gap-2 rounded-[calc(1.4rem-1px)] bg-surface-elevated px-2.5 py-2">
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
              placeholder="Ask Dealo AI anything…"
              aria-label="Your question"
              className="max-h-[168px] min-h-[2.4rem] flex-1 resize-none bg-transparent px-1.5 py-2 text-[13.5px] leading-relaxed text-foreground outline-none placeholder:text-muted"
            />
            {streaming ? (
              <motion.button
                type="button"
                onClick={onStop}
                aria-label="Stop answering"
                whileTap={{ scale: 0.9 }}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background shadow-md"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </motion.button>
            ) : (
              <motion.button
                type="submit"
                disabled={!input.trim()}
                aria-label="Send"
                whileTap={{ scale: 0.9 }}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(145deg,#14b8a6,#0f766e_55%,#064e3b)] text-white shadow-md shadow-brand/30 transition disabled:opacity-35 disabled:shadow-none"
              >
                <ArrowUp className="h-4.5 w-4.5" />
              </motion.button>
            )}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 px-1 text-[11px] text-muted">
          <button type="button" onClick={onPerson} className="inline-flex items-center gap-1 font-semibold text-foreground transition hover:text-brand">
            <UserRound className="h-3.5 w-3.5" /> Talk to a person
          </button>
          <div className="flex items-center gap-3">
            {near ? <span className={cn('tabular-nums', input.length >= MAX_INPUT && 'text-red-500')}>{input.length}/{MAX_INPUT}</span> : null}
            {!mobile && !near ? <span className="hidden min-[420px]:inline">Enter to send · Shift+Enter new line</span> : null}
            {whatsapp ? (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#128C7E] hover:underline dark:text-[#25D366]">
                <WhatsAppIcon className="h-3.5 w-3.5" /> WhatsApp
              </a>
            ) : null}
          </div>
        </div>
        <p className="mt-1 text-center text-[10px] text-muted/70">Dealo AI can make mistakes. Check important details.</p>
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
    if (message.trim().length < 8) return setError('Please tell us a little more (at least 8 characters).');
    setSending(true);
    try {
      if (signedIn) {
        const history = chat.length ? `\n\n--- Dealo AI chat ---\n${chat.map((m) => `${m.role === 'user' ? 'Me' : 'Assistant'}: ${m.text}`).join('\n')}` : '';
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
          json: { name, email, message: message.trim(), transcript: chat.map((m) => ({ ...m, text: m.text.slice(0, 6000) })), page },
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
        <div className="flex items-start gap-3 rounded-2xl border border-brand/20 bg-brand-soft/50 p-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-emerald-500 text-white shadow-sm dark:text-[#071f14]">
            <Headphones className="h-4 w-4" />
          </span>
          <p className="text-xs leading-relaxed text-foreground">
            {signedIn ? 'Your message and this chat go straight to our support team as a ticket.' : 'Leave your name and email. Our team gets this chat too, so you will not need to repeat yourself.'}
          </p>
        </div>
        {!signedIn ? (
          <>
            <label className="block text-xs font-semibold text-foreground">
              Your name
              <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={120} className="input-field mt-1" autoComplete="name" />
            </label>
            <label className="block text-xs font-semibold text-foreground">
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} className="input-field mt-1" autoComplete="email" placeholder="you@email.com" />
            </label>
          </>
        ) : (
          <label className="block text-xs font-semibold text-foreground">
            What is it about?
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field mt-1">
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block text-xs font-semibold text-foreground">
          How can we help?
          <textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, 2000))} rows={4} required className="input-field mt-1 min-h-[6rem]" placeholder="What happened, and what you expected…" />
        </label>
        {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-4 py-3">
        {whatsapp ? (
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-2 text-xs font-semibold text-[#073b1f] hover:brightness-95">
            <WhatsAppIcon className="h-3.5 w-3.5" /> WhatsApp
          </a>
        ) : (
          <span />
        )}
        <button type="submit" disabled={sending} className="btn-primary px-4 text-xs disabled:opacity-60">
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          {signedIn ? 'Open ticket' : 'Send'}
        </button>
      </div>
    </form>
  );
}

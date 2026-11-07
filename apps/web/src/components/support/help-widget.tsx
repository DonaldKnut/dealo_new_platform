'use client';

import type { AssistantLink, AssistantMessage, AssistantReply } from '@dealo/shared';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, Bot, CheckCircle2, Headphones, Loader2, MessagesSquare, Send, Sparkles, UserRound, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';

import { useLocale } from '@/components/i18n/locale-context';
import { WhatsAppIcon } from '@/components/whatsapp-icon';
import { useAuthSession } from '@/hooks/use-auth-session';
import { ApiError, apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { whatsappHref, whatsappMessageFor } from '@/lib/whatsapp';

type ChatItem = AssistantMessage & { links?: AssistantLink[]; suggestions?: string[]; handoff?: boolean };
type View = 'chat' | 'person' | 'sent';

const STORE_KEY = 'dealo-help-chat';
const PERSON = 'Talk to a person';
const WELCOME: ChatItem = {
  role: 'assistant',
  text: 'Hi! I am the Dealo assistant. Ask me about CVs, jobs, hiring or your account. I answer straight away, and a person on our team is one tap away.',
  suggestions: ['How do I build a CV?', 'Find a job', 'What are Hiring Agents?', PERSON],
};

const CATEGORIES = [
  { id: 'general', label: 'General question' },
  { id: 'billing', label: 'Payment or plan' },
  { id: 'technical', label: 'Something is not working' },
  { id: 'hiring', label: 'Hiring and the ATS' },
  { id: 'talent', label: 'CVs and jobs' },
];

function transcript(items: ChatItem[]): AssistantMessage[] {
  return items.slice(1).slice(-16).map(({ role, text }) => ({ role, text: text.slice(0, 1500) }));
}

export function HelpWidget() {
  const { t } = useLocale();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const { user } = useAuthSession();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('chat');
  const [items, setItems] = useState<ChatItem[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [source, setSource] = useState<AssistantReply['source'] | null>(null);
  const [sentNote, setSentNote] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const whatsapp = whatsappHref(whatsappMessageFor(pathname, t('wa.prefill')));
  const onDashboard = pathname.startsWith('/dashboard');

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(STORE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ChatItem[];
        if (Array.isArray(parsed) && parsed.length) setItems(parsed);
      }
    } catch {
      /* a broken saved chat just starts fresh */
    }
  }, []);

  useEffect(() => {
    if (items.length > 1) window.sessionStorage.setItem(STORE_KEY, JSON.stringify(items.slice(-30)));
  }, [items]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [items, thinking, view, reduceMotion]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    if (view === 'chat' && window.matchMedia('(min-width: 640px)').matches) inputRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, view]);

  const ask = useCallback(
    async (question: string) => {
      const text = question.trim();
      if (!text || thinking) return;
      if (text === PERSON) {
        setView('person');
        return;
      }
      const next: ChatItem[] = [...items, { role: 'user', text: text.slice(0, 1500) }];
      setItems(next);
      setInput('');
      setThinking(true);
      try {
        const reply = await apiFetch<AssistantReply>('/assistant/chat', { method: 'POST', json: { messages: transcript(next), page: pathname } });
        setSource(reply.source);
        const suggestions = reply.handoff && !reply.suggestions.includes(PERSON) ? [PERSON, ...reply.suggestions] : reply.suggestions;
        setItems((cur) => [...cur, { role: 'assistant', text: reply.reply, links: reply.links, suggestions, handoff: reply.handoff }]);
      } catch (err) {
        const busy = err instanceof ApiError && err.status === 429;
        setItems((cur) => [
          ...cur,
          {
            role: 'assistant',
            text: busy ? 'You are sending messages very fast. Give it a minute, or talk to a person.' : 'I cannot reach our server right now. You can still talk to a person.',
            suggestions: [PERSON],
            handoff: true,
          },
        ]);
      } finally {
        setThinking(false);
      }
    },
    [items, thinking, pathname],
  );

  const restart = () => {
    setItems([WELCOME]);
    setSource(null);
    window.sessionStorage.removeItem(STORE_KEY);
  };

  const last = items[items.length - 1];
  const lastQuestion = [...items].reverse().find((m) => m.role === 'user')?.text ?? '';

  return (
    <div
      className={cn(
        'pointer-events-none fixed right-2 z-[90] flex flex-col items-end gap-3 min-[340px]:right-4 sm:right-6',
        onDashboard ? 'bottom-[calc(4.75rem+var(--safe-bottom))] lg:bottom-6' : 'bottom-[max(0.75rem,var(--safe-bottom))] sm:bottom-6',
      )}
    >
      <AnimatePresence>
        {open ? (
          <motion.section
            role="dialog"
            aria-label="Dealo help"
            initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className={cn(
              'pointer-events-auto flex w-[min(24rem,calc(100vw-1rem))] origin-bottom-right flex-col overflow-hidden rounded-3xl border border-border bg-surface-elevated shadow-[0_24px_60px_rgba(4,47,46,0.28)]',
              onDashboard ? 'h-[min(36rem,calc(100dvh-10.5rem))] lg:h-[min(36rem,calc(100dvh-7rem))]' : 'h-[min(36rem,calc(100dvh-6.5rem))]',
            )}
          >
            <header className="relative shrink-0 overflow-hidden bg-[linear-gradient(135deg,#0f766e,#064e3b)] px-4 pb-4 pt-4 text-white dark:bg-[linear-gradient(135deg,#0f3d22,#071f14)]">
              <svg aria-hidden viewBox="0 0 200 80" className="pointer-events-none absolute -right-6 -top-4 h-28 w-56 opacity-30">
                <circle cx="170" cy="18" r="34" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="170" cy="18" r="52" fill="none" stroke="currentColor" strokeWidth="1" />
                <circle cx="120" cy="64" r="4" fill="currentColor" />
                <circle cx="96" cy="20" r="2.5" fill="currentColor" />
              </svg>
              <div className="relative flex items-center gap-3">
                {view !== 'chat' ? (
                  <button type="button" onClick={() => setView('chat')} aria-label="Back to chat" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 hover:bg-white/25">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                ) : (
                  <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                    <Sparkles className="h-5 w-5" />
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0f766e] bg-[#7cff4d] dark:border-[#0f3d22]" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-lg leading-tight">{view === 'chat' ? 'Dealo assistant' : 'Talk to a person'}</p>
                  <p className="truncate text-[11px] text-white/80">
                    {view === 'chat'
                      ? source === 'ai'
                        ? 'AI answers instantly · a person is one tap away'
                        : 'Instant answers · a person is one tap away'
                      : user
                        ? 'We open a support ticket with this chat'
                        : 'We reply by email, usually within a few hours'}
                  </p>
                </div>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 hover:bg-white/25">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            {view === 'chat' ? (
              <>
                <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-4" aria-live="polite">
                  {items.map((m, i) => (
                    <div key={i} className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                      {m.role === 'assistant' ? (
                        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                          <Bot className="h-3.5 w-3.5" />
                        </span>
                      ) : null}
                      <div className={cn('max-w-[82%] space-y-2', m.role === 'user' && 'flex flex-col items-end')}>
                        <p
                          className={cn(
                            'whitespace-pre-line rounded-2xl px-3 py-2 text-[13px] leading-relaxed',
                            m.role === 'user' ? 'rounded-br-md bg-brand text-white dark:text-[#071f14]' : 'rounded-tl-md bg-surface text-foreground',
                          )}
                        >
                          {m.text}
                        </p>
                        {m.links?.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {m.links.map((l) => (
                              <Link
                                key={l.href}
                                href={l.href}
                                onClick={() => setOpen(false)}
                                className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand hover:border-brand"
                              >
                                {l.label} <ArrowUpRight className="h-3 w-3" />
                              </Link>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {thinking ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-brand">
                        <Bot className="h-3.5 w-3.5" />
                      </span>
                      <span className="inline-flex gap-1 rounded-2xl rounded-tl-md bg-surface px-3 py-3">
                        {[0, 1, 2].map((d) => (
                          <motion.span key={d} className="h-1.5 w-1.5 rounded-full bg-muted" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: d * 0.15 }} />
                        ))}
                      </span>
                    </div>
                  ) : null}
                  {!thinking && last.role === 'assistant' && last.suggestions?.length ? (
                    <div className="flex flex-wrap gap-1.5 pl-9">
                      {last.suggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => void ask(s)}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
                            s === PERSON ? 'border-foreground/20 bg-foreground text-background hover:opacity-90' : 'border-border bg-background text-foreground hover:border-brand hover:text-brand',
                          )}
                        >
                          {s === PERSON ? <Headphones className="h-3 w-3" /> : null}
                          {s}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <form
                  className="shrink-0 border-t border-border bg-background/60 p-2.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void ask(input);
                  }}
                >
                  <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface-elevated px-2 py-1.5 focus-within:border-brand">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value.slice(0, 1500))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void ask(input);
                        }
                      }}
                      rows={1}
                      placeholder="Ask a question…"
                      aria-label="Your question"
                      className="max-h-28 min-h-[2.25rem] flex-1 resize-none bg-transparent px-1.5 py-2 text-[13px] outline-none placeholder:text-muted"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || thinking}
                      aria-label="Send"
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition disabled:opacity-40 dark:text-[#071f14]"
                    >
                      {thinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 px-1 text-[11px] text-muted">
                    <button type="button" onClick={() => setView('person')} className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-brand">
                      <UserRound className="h-3.5 w-3.5" /> Talk to a person
                    </button>
                    <div className="flex items-center gap-3">
                      {items.length > 1 ? (
                        <button type="button" onClick={restart} className="hover:text-foreground">
                          New chat
                        </button>
                      ) : null}
                      {whatsapp ? (
                        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#128C7E] hover:underline dark:text-[#25D366]">
                          <WhatsAppIcon className="h-3.5 w-3.5" /> WhatsApp
                        </a>
                      ) : null}
                    </div>
                  </div>
                </form>
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
                <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <CheckCircle2 className="h-7 w-7" />
                </motion.span>
                <p className="font-display text-lg text-foreground">Message sent</p>
                <p className="text-sm text-muted">{sentNote}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {user ? (
                    <Link href="/dashboard/support" onClick={() => setOpen(false)} className="btn-secondary px-3 text-xs">
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

      <motion.button
        type="button"
        data-tour="support-help"
        aria-label={open ? 'Close help' : 'Help and chat'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.94 }}
        className="pointer-events-auto relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(145deg,#14b8a6,#0f766e_55%,#064e3b)] text-white shadow-[0_14px_34px_rgba(15,118,110,0.4)] min-[340px]:h-14 min-[340px]:w-14"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={open ? 'x' : 'chat'} initial={{ rotate: -40, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 40, opacity: 0 }} transition={{ duration: 0.15 }}>
            {open ? <X className="h-5 w-5" /> : <MessagesSquare className="h-6 w-6" />}
          </motion.span>
        </AnimatePresence>
        {!open ? (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-[#7cff4d] text-[#071f14]">
            <Sparkles className="h-2.5 w-2.5" />
          </span>
        ) : null}
      </motion.button>
    </div>
  );
}

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
        const history = chat.length ? `\n\n--- Help chat ---\n${chat.map((m) => `${m.role === 'user' ? 'Me' : 'Assistant'}: ${m.text}`).join('\n')}` : '';
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
        const res = await apiFetch<{ message: string }>('/assistant/handoff', { method: 'POST', json: { name, email, message: message.trim(), transcript: chat, page } });
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
        <div className="flex items-start gap-3 rounded-2xl bg-brand-soft/60 p-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white dark:text-[#071f14]">
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

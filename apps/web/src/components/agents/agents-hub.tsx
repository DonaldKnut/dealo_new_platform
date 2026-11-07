'use client';

import { AGENT_CATALOG, AGENT_PLANS, HIRING_AGENTS, type AgentOverview, type AgentTask, type HiringAgentId } from '@dealo/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Check, Clock3, Crown, History, Inbox, Loader2, Play, Settings2, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAtsWorkspace } from '@/components/ats/ats-workspace';
import { FormModal } from '@/components/ui/form-modal';
import { useToast } from '@/components/ui/toast';
import { WhatsAppIcon } from '@/components/whatsapp-icon';
import { agentsApi, TRIGGER_LABEL } from '@/lib/agents-api';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { whatsappHref } from '@/lib/whatsapp';

import { AgentSettingsModal, RunAgentModal, Switch } from './agent-dialogs';
import { AGENT_LOOK, formatNaira } from './agent-meta';
import { AgentTaskCard } from './agent-task-card';

type Tab = 'inbox' | 'agents' | 'activity';
const AUTOMATIC: HiringAgentId[] = ['screening', 'follow_up', 'scheduling', 'pipeline_digest'];

export function AgentsHub() {
  const toast = useToast();
  const { orgId, current } = useAtsWorkspace();
  const [overview, setOverview] = useState<AgentOverview | null>(null);
  const [inbox, setInbox] = useState<AgentTask[] | null>(null);
  const [history, setHistory] = useState<AgentTask[] | null>(null);
  const [tab, setTab] = useState<Tab>('inbox');
  const [running, setRunning] = useState<HiringAgentId | null>(null);
  const [settingsFor, setSettingsFor] = useState<HiringAgentId | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [toggling, setToggling] = useState<HiringAgentId | null>(null);

  const canManage = current ? ['OWNER', 'ADMIN', 'RECRUITER'].includes(current.myRole) : false;
  const isAdmin = current ? ['OWNER', 'ADMIN'].includes(current.myRole) : false;

  const load = useCallback(async () => {
    if (!orgId) return;
    const [o, pending, past] = await Promise.all([
      agentsApi.overview(orgId),
      agentsApi.tasks(orgId, { status: 'PENDING', limit: 50 }),
      agentsApi.tasks(orgId, { status: 'HISTORY', limit: 40 }),
    ]);
    setOverview(o);
    setInbox(pending);
    setHistory(past);
  }, [orgId]);

  useEffect(() => {
    void load().catch((err) => toast.error('Could not load agents', err instanceof ApiError ? err.message : ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  // Coming back from Paystack.
  useEffect(() => {
    if (!orgId) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('plan') === 'pro') {
      setUpgradeOpen(true);
      window.history.replaceState(null, '', window.location.pathname);
    }
    const reference = params.get('upgrade');
    if (!reference) return;
    window.history.replaceState(null, '', window.location.pathname);
    agentsApi
      .verifyUpgrade(orgId, reference)
      .then((r) => {
        if (r.plan === 'PRO') toast.success('Welcome to Pro', `${AGENT_PLANS.PRO.monthlyRuns.toLocaleString()} agent runs a month are ready.`);
        else if (r.status === 'FAILED') toast.error('Payment did not go through', r.failureReason ?? '');
        else toast.info('Payment is still processing', 'Refresh in a minute.');
        void load();
      })
      .catch(() => toast.error('Could not check the payment'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const onTaskChange = (task: AgentTask) => {
    setInbox((list) => list?.filter((t) => t.id !== task.id) ?? list);
    setHistory((list) => [task, ...(list ?? []).filter((t) => t.id !== task.id)]);
    setOverview((o) => (o ? { ...o, pending: Math.max(0, o.pending - 1) } : o));
  };

  const onRan = (task: AgentTask) => {
    setRunning(null);
    if (task.status === 'PENDING') {
      setInbox((list) => [task, ...(list ?? []).filter((t) => t.id !== task.id)]);
      setTab('inbox');
    } else {
      setHistory((list) => [task, ...(list ?? []).filter((t) => t.id !== task.id)]);
      setTab('activity');
    }
    void agentsApi.overview(orgId!).then(setOverview).catch(() => undefined);
  };

  const toggle = async (agent: HiringAgentId, enabled: boolean) => {
    if (!orgId) return;
    setToggling(agent);
    setOverview((o) => (o ? { ...o, agents: o.agents.map((a) => (a.id === agent ? { ...a, enabled } : a)) } : o));
    try {
      await agentsApi.update(orgId, agent, { enabled });
      toast.success(enabled ? `${AGENT_CATALOG[agent].name} is on` : `${AGENT_CATALOG[agent].name} is off`, enabled ? autoNote(agent) : undefined);
    } catch (err) {
      setOverview((o) => (o ? { ...o, agents: o.agents.map((a) => (a.id === agent ? { ...a, enabled: !enabled } : a)) } : o));
      toast.error('Could not change it', err instanceof ApiError ? err.message : '');
    } finally {
      setToggling(null);
    }
  };

  const usagePct = overview ? Math.min(100, Math.round((overview.usage.runs / overview.usage.limit) * 100)) : 0;
  const settingsConfig = useMemo(() => overview?.agents.find((a) => a.id === settingsFor)?.config ?? {}, [overview, settingsFor]);

  if (!overview || !inbox || !history) {
    return (
      <div className="space-y-4">
        <div className="h-48 animate-pulse rounded-[1.75rem] bg-surface" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-[1.4rem] bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------ hero */}
      <section className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#061a14] p-4 text-white shadow-[0_30px_80px_-40px_rgba(4,47,46,0.8)] min-[340px]:p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-emerald-400/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] [background-size:22px_22px]" />
        <div className="relative grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
              <Bot className="h-3.5 w-3.5" /> Hiring Agents
            </p>
            <h1 className="mt-2 font-display text-[1.7rem] leading-tight min-[340px]:text-3xl sm:text-4xl">Your AI hiring team, on shift 24/7</h1>
            <p className="mt-2 max-w-xl text-sm text-white/70">
              Seven agents screen, write, source, follow up, schedule and report for {current?.workspace.name ?? 'your workspace'}. They prepare the work; a person on your team always makes the call.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold', overview.plan === 'PRO' ? 'bg-amber-300 text-[#3b2600]' : 'bg-white/10 text-white')}>
                {overview.plan === 'PRO' ? <Crown className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />} {AGENT_PLANS[overview.plan].name} plan
                {overview.planUntil ? ` · until ${new Date(overview.planUntil).toLocaleDateString()}` : ''}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">
                <Sparkles className="h-3.5 w-3.5 text-emerald-300" /> {overview.provider === 'gemini' ? 'Gemini AI + Dealo rules' : 'Dealo rules engine'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> Person approves every step
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 min-[340px]:gap-3">
            <Stat label="Waiting for you" value={overview.pending} accent="text-amber-300" onClick={() => setTab('inbox')} />
            <Stat label="Hours saved (30 days)" value={overview.impact.hoursSaved30d} accent="text-emerald-300" />
            <div className="col-span-2 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
              <div className="flex items-center justify-between gap-2 text-xs text-white/70">
                <span>Agent runs this month</span>
                <span className="tabular-nums text-white">
                  {overview.usage.runs.toLocaleString()} / {overview.usage.limit.toLocaleString()}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className={cn('h-full rounded-full', usagePct > 85 ? 'bg-gradient-to-r from-amber-300 to-rose-400' : 'bg-gradient-to-r from-emerald-300 to-teal-400')}
                  initial={{ width: 0 }}
                  animate={{ width: `${usagePct}%` }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              {overview.plan === 'FREE' ? (
                <button type="button" onClick={() => setUpgradeOpen(true)} className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-4 py-2 text-sm font-semibold text-[#3b2600] transition hover:brightness-105">
                  <Crown className="h-4 w-4" /> Go Pro · {AGENT_PLANS.PRO.monthlyRuns.toLocaleString()} runs
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ tabs */}
      <div role="tablist" className="inline-flex max-w-full overflow-x-auto rounded-full border border-border bg-surface p-1 scrollbar-none">
        {(
          [
            { id: 'inbox', label: 'Inbox', icon: Inbox, count: inbox.length },
            { id: 'agents', label: 'Agents', icon: Bot, count: overview.agents.filter((a) => a.enabled).length },
            { id: 'activity', label: 'Activity', icon: History, count: 0 },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={cn('relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors', active ? 'text-white dark:text-[#071f14]' : 'text-muted hover:text-foreground')}
            >
              {active ? <motion.span layoutId="agents-tab" className="absolute inset-0 rounded-full bg-brand" transition={{ type: 'spring', stiffness: 420, damping: 34 }} /> : null}
              <Icon className="relative z-10 h-4 w-4" />
              <span className="relative z-10">{t.label}</span>
              {t.count ? (
                <span className={cn('relative z-10 rounded-full px-1.5 text-[10px] tabular-nums', active ? 'bg-white/20' : 'bg-brand-soft text-brand')}>{t.count}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'inbox' ? (
          <motion.section key="inbox" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            {inbox.length ? (
              <AnimatePresence initial={false}>
                {inbox.map((task, i) => (
                  <AgentTaskCard key={task.id} task={task} orgId={orgId!} onChange={onTaskChange} defaultOpen={i === 0} />
                ))}
              </AnimatePresence>
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-border p-8 text-center">
                <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <Check className="h-6 w-6" />
                </span>
                <p className="mt-3 font-display text-xl text-foreground">All caught up</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted">When an agent needs a decision, it lands here. Turn on the automatic agents, or run one now.</p>
                <button type="button" onClick={() => setTab('agents')} className="btn-primary mt-4 text-sm">
                  <Bot className="h-4 w-4" /> See the agents
                </button>
              </div>
            )}
          </motion.section>
        ) : null}

        {tab === 'agents' ? (
          <motion.section key="agents" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {HIRING_AGENTS.map((id, i) => {
              const meta = AGENT_CATALOG[id];
              const look = AGENT_LOOK[id];
              const state = overview.agents.find((a) => a.id === id)!;
              const Icon = look.icon;
              const automatic = AUTOMATIC.includes(id);
              return (
                <motion.article
                  key={id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="group relative flex flex-col overflow-hidden rounded-[1.4rem] border border-border bg-surface-elevated p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <div aria-hidden className={cn('pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br opacity-20 blur-2xl transition-opacity group-hover:opacity-40', look.gradient)} />
                  <div className="relative flex items-start justify-between gap-3">
                    <span className={cn('inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg', look.gradient)}>
                      <Icon className="h-6 w-6" />
                    </span>
                    {automatic ? (
                      <span className="flex items-center gap-2 text-[11px] font-semibold text-muted">
                        {state.enabled ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-300">
                            <span className="relative flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                            </span>
                            Auto
                          </span>
                        ) : (
                          'Off'
                        )}
                        <Switch checked={state.enabled} disabled={!canManage || toggling === id} onChange={(v) => void toggle(id, v)} label={`Automatic ${meta.name}`} />
                      </span>
                    ) : (
                      <span className="rounded-full bg-surface px-2 py-1 text-[11px] font-semibold text-muted">On demand</span>
                    )}
                  </div>
                  <h3 className="relative mt-3 font-display text-lg text-foreground">{meta.name}</h3>
                  <p className={cn('relative text-sm font-medium', look.text)}>{meta.tagline}</p>
                  <p className="relative mt-2 flex-1 text-sm leading-relaxed text-muted">{meta.description}</p>
                  <div className="relative mt-3 flex flex-wrap gap-1">
                    {meta.triggers.map((t) => (
                      <span key={t} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted">
                        {TRIGGER_LABEL[t]}
                      </span>
                    ))}
                  </div>
                  <div className="relative mt-3 grid grid-cols-3 gap-1 rounded-xl bg-surface p-2 text-center">
                    <MiniStat label="Runs (30d)" value={state.stats.runs30d} />
                    <MiniStat label="Approved" value={state.stats.approved30d} />
                    <MiniStat label="Waiting" value={state.stats.pending} />
                  </div>
                  <div className="relative mt-3 flex items-center gap-2">
                    <button type="button" className="btn-primary flex-1 justify-center text-sm" disabled={!canManage} onClick={() => setRunning(id)}>
                      <Play className="h-4 w-4" /> Run now
                    </button>
                    <button type="button" className="btn-secondary px-3 text-sm" disabled={!canManage} onClick={() => setSettingsFor(id)} aria-label={`${meta.name} settings`}>
                      <Settings2 className="h-4 w-4" />
                    </button>
                  </div>
                  {state.lastRunAt ? (
                    <p className="relative mt-2 flex items-center gap-1 text-[11px] text-muted">
                      <Clock3 className="h-3 w-3" /> Last run {new Date(state.lastRunAt).toLocaleString()}
                    </p>
                  ) : null}
                </motion.article>
              );
            })}
          </motion.section>
        ) : null}

        {tab === 'activity' ? (
          <motion.section key="activity" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            {history.length ? (
              history.map((task) => <AgentTaskCard key={task.id} task={task} orgId={orgId!} onChange={onTaskChange} />)
            ) : (
              <p className="rounded-[1.4rem] border border-dashed border-border p-8 text-center text-sm text-muted">Finished and dismissed agent work shows here.</p>
            )}
          </motion.section>
        ) : null}
      </AnimatePresence>

      <RunAgentModal orgId={orgId!} agent={running} onClose={() => setRunning(null)} onDone={onRan} onLimit={() => { setRunning(null); setUpgradeOpen(true); }} />
      <AgentSettingsModal
        orgId={orgId!}
        agent={settingsFor}
        config={settingsConfig}
        onClose={() => setSettingsFor(null)}
        onSaved={(config) => setOverview((o) => (o ? { ...o, agents: o.agents.map((a) => (a.id === settingsFor ? { ...a, config } : a)) } : o))}
      />
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} orgId={orgId!} canPay={isAdmin} paymentsEnabled={overview.paymentsEnabled} plan={overview.plan} />
    </div>
  );
}

function autoNote(agent: HiringAgentId) {
  if (agent === 'screening') return 'It refreshes the shortlist each time someone applies.';
  if (agent === 'scheduling') return 'It prepares an invite when someone reaches the interview stage.';
  if (agent === 'follow_up') return 'It checks for waiting candidates every morning.';
  return 'Your first briefing arrives tomorrow morning.';
}

function Stat({ label, value, accent, onClick }: { label: string; value: number; accent: string; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-left backdrop-blur transition hover:bg-white/10">
      <p className={cn('font-display text-3xl tabular-nums', accent)}>{value.toLocaleString()}</p>
      <p className="text-xs text-white/70">{label}</p>
    </Tag>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-display text-lg tabular-nums text-foreground">{value}</p>
      <p className="text-[10px] text-muted">{label}</p>
    </div>
  );
}

function UpgradeModal({ open, onClose, orgId, canPay, paymentsEnabled, plan }: { open: boolean; onClose: () => void; orgId: string; canPay: boolean; paymentsEnabled: boolean; plan: 'FREE' | 'PRO' }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const whatsapp = whatsappHref('Hi Dealo, I want to upgrade our workspace to Hiring Agents Pro.');

  const pay = async () => {
    setBusy(true);
    try {
      const { authorizationUrl } = await agentsApi.upgrade(orgId);
      window.location.href = authorizationUrl;
    } catch (err) {
      toast.error('Could not start payment', err instanceof ApiError ? err.message : '');
      setBusy(false);
    }
  };

  const rows: Array<[string, string, string]> = [
    ['Agent runs a month', String(AGENT_PLANS.FREE.monthlyRuns), AGENT_PLANS.PRO.monthlyRuns.toLocaleString()],
    ['All 7 agents', '✓', '✓'],
    ['Automatic screening, follow-up and scheduling', '✓', '✓'],
    ['Daily briefing to the whole team', '✓', '✓'],
    ['Priority help from Dealo recruiters', '—', '✓'],
  ];

  return (
    <FormModal
      open={open}
      onClose={onClose}
      icon={Crown}
      title="Hiring Agents Pro"
      description={`${formatNaira(AGENT_PLANS.PRO.priceMinor)} per workspace per month. Cancel any time.`}
      footer={
        plan === 'PRO' ? undefined : paymentsEnabled && canPay ? (
          <button type="button" className="btn-primary w-full min-[340px]:w-auto" disabled={busy} onClick={() => void pay()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />} Pay {formatNaira(AGENT_PLANS.PRO.priceMinor)} with Paystack
          </button>
        ) : whatsapp ? (
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-[#073b1f] min-[340px]:w-auto">
            <WhatsAppIcon className="h-4 w-4" /> Upgrade on WhatsApp
          </a>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs text-muted">
              <tr>
                <th className="px-3 py-2 text-left font-semibold" />
                <th className="px-3 py-2 font-semibold">Free</th>
                <th className="px-3 py-2 font-semibold text-amber-600 dark:text-amber-300">Pro</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, free, pro]) => (
                <tr key={label} className="border-t border-border">
                  <td className="px-3 py-2 text-foreground">{label}</td>
                  <td className="px-3 py-2 text-center text-muted">{free}</td>
                  <td className="px-3 py-2 text-center font-semibold text-foreground">{pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!canPay && plan !== 'PRO' ? <p className="text-xs text-muted">Ask a workspace owner or admin to upgrade.</p> : null}
        {!paymentsEnabled && plan !== 'PRO' ? <p className="text-xs text-muted">Card payment is being switched on. Message us and we will upgrade you the same day.</p> : null}
      </div>
    </FormModal>
  );
}

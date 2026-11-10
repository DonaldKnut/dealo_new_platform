'use client';

import { motion } from 'framer-motion';
import { ArrowRight, ExternalLink, PlugZap, Webhook, Zap } from 'lucide-react';

import { MarketingPill } from './marketing-pill';
import { MarketingSection } from './marketing-section';
import { Reveal } from './reveal';

/* Integration "logos" rendered as branded initials tiles */
const INTEGRATIONS = [
  { name: 'Slack', abbr: 'SL', color: 'from-[#4A154B] to-[#611f69]', text: 'text-white' },
  { name: 'Google Workspace', abbr: 'GW', color: 'from-[#1a73e8] to-[#0d47a1]', text: 'text-white' },
  { name: 'Microsoft Teams', abbr: 'MT', color: 'from-[#5b5ea6] to-[#444791]', text: 'text-white' },
  { name: 'Workday', abbr: 'WD', color: 'from-[#f4511e] to-[#bf360c]', text: 'text-white' },
  { name: 'BambooHR', abbr: 'BH', color: 'from-[#73ac39] to-[#4a7a1e]', text: 'text-white' },
  { name: 'Paystack', abbr: 'PS', color: 'from-[#00c3f7] to-[#0096c7]', text: 'text-white' },
  { name: 'Flutterwave', abbr: 'FW', color: 'from-[#f5a623] to-[#e08c00]', text: 'text-white' },
  { name: 'Webhooks', abbr: <Webhook className="h-4 w-4" />, color: 'from-slate-700 to-slate-900', text: 'text-white' },
  { name: 'REST API', abbr: 'API', color: 'from-indigo-600 to-indigo-900', text: 'text-white' },
] as const;

const CAPABILITIES = [
  {
    icon: Zap,
    title: 'Real-time webhooks',
    body: 'Fire events when candidates move stages, offers are signed, or interviews are booked. Pipe data into any system in real time.',
  },
  {
    icon: PlugZap,
    title: 'Full REST API',
    body: 'Read and write jobs, candidates, and pipeline stages programmatically. Fully documented, versioned, and production-ready.',
  },
  {
    icon: ExternalLink,
    title: 'Native integrations',
    body: 'One-click connections to Slack, Google Calendar, Microsoft Teams, and your HRIS. No custom code required.',
  },
] as const;

export function AtsIntegrations({ onStart }: { onStart?: () => void }) {
  return (
    <MarketingSection>
      <Reveal>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <MarketingPill icon={PlugZap}>Integrations</MarketingPill>
            <h2 className="display-title mt-3 max-w-2xl text-[1.55rem] leading-tight text-foreground min-[340px]:mt-4 min-[340px]:text-3xl sm:text-4xl lg:text-5xl">
              Plays nicely with your stack
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
              Connect Dealo ATS to the tools your team already uses — or build your own integrations
              via our API and webhooks.
            </p>
          </div>
          {onStart && (
            <button
              type="button"
              className="btn-secondary w-full shrink-0 min-[400px]:w-auto"
              onClick={onStart}
            >
              View API docs
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </Reveal>

      {/* Logo tile grid */}
      <Reveal delay={0.1}>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 min-[340px]:mt-14 min-[340px]:gap-4">
          {INTEGRATIONS.map((int, i) => (
            <motion.div
              key={int.name}
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -4, scale: 1.08 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              title={int.name}
              className={`group flex h-14 w-14 cursor-default items-center justify-center rounded-2xl bg-gradient-to-br ${int.color} ${int.text} text-xs font-bold shadow-md ring-1 ring-white/10 transition-shadow hover:shadow-xl min-[340px]:h-16 min-[340px]:w-16 min-[340px]:text-sm`}
            >
              {typeof int.abbr === 'string' ? int.abbr : int.abbr}
            </motion.div>
          ))}

          {/* More placeholder */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: INTEGRATIONS.length * 0.05 }}
            className="flex h-14 w-14 cursor-default items-center justify-center rounded-2xl border-2 border-dashed border-border text-xs font-semibold text-muted min-[340px]:h-16 min-[340px]:w-16"
          >
            +more
          </motion.div>
        </div>
      </Reveal>

      {/* Capabilities 3-col */}
      <div className="mt-10 grid grid-cols-1 gap-4 min-[340px]:mt-14 min-[560px]:grid-cols-3">
        {CAPABILITIES.map((cap, i) => {
          const Icon = cap.icon;
          return (
            <Reveal key={cap.title} delay={i * 0.1}>
              <div className="group flex flex-col gap-3 rounded-2xl border border-border/80 bg-surface-elevated/70 p-5 transition-all hover:border-brand/30 hover:shadow-md min-[340px]:p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand ring-1 ring-brand/10 transition-transform group-hover:scale-110">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-base font-bold text-foreground min-[340px]:text-lg">
                    {cap.title}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted min-[340px]:text-sm">
                    {cap.body}
                  </p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </MarketingSection>
  );
}


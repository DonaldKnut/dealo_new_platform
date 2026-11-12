'use client';

import { Check, Copy } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h'; level: number; text: string }
  | { kind: 'ul' | 'ol'; items: string[]; start: number }
  | { kind: 'quote'; text: string }
  | { kind: 'code'; lang: string; code: string }
  | { kind: 'hr' };

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ kind: 'p', text: para.join('\n') });
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const fence = /^\s*```\s*([\w+-]*)\s*$/.exec(line);
    if (fence) {
      flush();
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i]!)) code.push(lines[i++]!);
      blocks.push({ kind: 'code', lang: fence[1] ?? '', code: code.join('\n') });
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ kind: 'h', level: heading[1]!.length, text: heading[2]! });
      continue;
    }
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      flush();
      blocks.push({ kind: 'hr' });
      continue;
    }
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*(\d+)[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flush();
      const kind = bullet ? 'ul' : 'ol';
      const items: string[] = [];
      const start = numbered ? Number(numbered[1]) : 1;
      while (i < lines.length) {
        const current = lines[i]!;
        const match = kind === 'ul' ? /^\s*[-*•]\s+(.*)$/.exec(current) : /^\s*\d+[.)]\s+(.*)$/.exec(current);
        if (match) {
          items.push(match[1]!);
          i++;
        } else if (/^\s{2,}\S/.test(current) && items.length) {
          items[items.length - 1] += ` ${current.trim()}`;
          i++;
        } else break;
      }
      i--;
      blocks.push({ kind, items, start });
      continue;
    }
    const quote = /^\s*>\s?(.*)$/.exec(line);
    if (quote) {
      flush();
      blocks.push({ kind: 'quote', text: quote[1]! });
      continue;
    }
    para.push(line);
  }
  flush();
  return blocks;
}

const INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\[[^\]\n]+\]\([^)\s]+\))|(\*[^*\s][^*\n]*\*)|(_[^_\s][^_\n]*_)/g;

function renderInline(text: string, onNavigate?: () => void): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) out.push(text.slice(last, index));
    const token = match[0];
    if (match[1]) {
      out.push(
        <code key={key++} className="rounded-md bg-foreground/[0.07] px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (match[2]) {
      out.push(
        <strong key={key++} className="font-semibold text-foreground">
          {renderInline(token.slice(2, -2), onNavigate)}
        </strong>,
      );
    } else if (match[3]) {
      const [, label = '', href = ''] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token) ?? [];
      out.push(<SmartLink key={key++} href={href} label={label} onNavigate={onNavigate} />);
    } else {
      out.push(
        <em key={key++} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    }
    last = index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.map((node, i) => (typeof node === 'string' ? <Fragment key={`t${i}`}>{withBreaks(node)}</Fragment> : node));
}

function withBreaks(text: string) {
  const parts = text.split('\n');
  return parts.map((part, i) => (
    <Fragment key={i}>
      {part}
      {i < parts.length - 1 ? <br /> : null}
    </Fragment>
  ));
}

function SmartLink({ href, label, onNavigate }: { href: string; label: string; onNavigate?: () => void }) {
  const cls = 'font-semibold text-brand underline decoration-brand/30 underline-offset-2 transition hover:decoration-brand';
  if (href.startsWith('/') && !href.startsWith('//')) {
    return (
      <Link href={href} onClick={onNavigate} className={cls}>
        {label}
      </Link>
    );
  }
  if (/^https?:\/\//i.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow" className={cls}>
        {label}
      </a>
    );
  }
  return <span>{label}</span>;
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="group/code overflow-hidden rounded-xl border border-white/10 bg-[#06140d] text-[#d8f5e4] shadow-inner">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#7cff4d]/80">{lang || 'code'}</span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(code).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1400);
            });
          }}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="max-h-80 overflow-auto px-3 py-2.5 text-[11.5px] leading-relaxed">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}

const Caret = () => <span aria-hidden className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[3px] animate-pulse rounded-full bg-brand align-baseline" />;

/** Renders the assistant's Markdown as React elements; no raw HTML is ever injected. */
export function AssistantMarkdown({ text, streaming = false, onNavigate, className }: { text: string; streaming?: boolean; onNavigate?: () => void; className?: string }) {
  const blocks = parseBlocks(text);
  const lastIndex = blocks.length - 1;

  return (
    <div className={cn('space-y-2.5 text-[13.5px] leading-relaxed text-foreground/90', className)}>
      {blocks.map((block, index) => {
        const caret = streaming && index === lastIndex ? <Caret /> : null;
        switch (block.kind) {
          case 'h':
            return (
              <p key={index} className={cn('font-display font-semibold text-foreground', block.level <= 2 ? 'text-[15px]' : 'text-[14px]')}>
                {renderInline(block.text, onNavigate)}
                {caret}
              </p>
            );
          case 'ul':
          case 'ol': {
            const List = block.kind === 'ul' ? 'ul' : 'ol';
            return (
              <List key={index} start={block.kind === 'ol' ? block.start : undefined} className="space-y-1.5 pl-1">
                {block.items.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    {block.kind === 'ul' ? (
                      <span aria-hidden className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-brand to-emerald-400" />
                    ) : (
                      <span aria-hidden className="mt-[0.1em] inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md bg-brand/10 px-1 text-[10.5px] font-bold text-brand">
                        {block.start + i}
                      </span>
                    )}
                    <span className="min-w-0">
                      {renderInline(item, onNavigate)}
                      {caret && i === block.items.length - 1 ? caret : null}
                    </span>
                  </li>
                ))}
              </List>
            );
          }
          case 'quote':
            return (
              <blockquote key={index} className="border-l-2 border-brand/50 pl-3 text-muted">
                {renderInline(block.text, onNavigate)}
                {caret}
              </blockquote>
            );
          case 'code':
            return (
              <div key={index}>
                <CodeBlock lang={block.lang} code={block.code} />
                {caret}
              </div>
            );
          case 'hr':
            return <hr key={index} className="border-border/70" />;
          default:
            return (
              <p key={index}>
                {renderInline(block.text, onNavigate)}
                {caret}
              </p>
            );
        }
      })}
      {streaming && !blocks.length ? <Caret /> : null}
    </div>
  );
}

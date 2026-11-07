import type { ResumeData, ResumeSection, ResumeStyle } from '@dealo/shared';
import { Fragment, type ReactNode } from 'react';

import type { Prims, RStyle } from './primitives';
import { CvIcon, HeaderArt } from './resume-art';
import { SECTION_LABEL, contactItems, dateRange, tint, visibleSections } from './resume-content';

export type TemplateProps = {
  P: Prims;
  data: ResumeData;
  style: ResumeStyle;
  family: string;
  /** Free users get a small "Made with Dealo" footer. */
  branding: boolean;
};

type Theme = {
  size: number;
  accent: string;
  text: string;
  muted: string;
  gap: number;
  title: (label: string, section?: ResumeSection) => ReactNode;
  skills: 'chips' | 'inline' | 'list' | 'grid';
  onDark?: boolean;
};

/** Heading icon shown before a section title when the person turns icons on. */
function HeadIcon({ P, data, section, color, size = 10 }: { P: Prims; data: ResumeData; section?: ResumeSection; color: string; size?: number }) {
  if (!section || !data.design.icons) return null;
  return <CvIcon P={P} name={section} size={size} color={color} style={{ marginRight: 5 }} />;
}

/** Inline **bold** and *italic* runs for text people format in the editor. */
function inlineRuns(P: Prims, text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g)
    .filter(Boolean)
    .map((part, i) => {
      if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
        return (
          <P.Text key={i} style={{ fontWeight: BOLD }}>
            {part.slice(2, -2)}
          </P.Text>
        );
      }
      if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
        return (
          <P.Text key={i} style={{ fontStyle: 'italic' }}>
            {part.slice(1, -1)}
          </P.Text>
        );
      }
      return <Fragment key={i}>{part}</Fragment>;
    });
}

/** Paragraphs and "- " bullet lines with inline formatting. */
function RichText({ P, text, theme }: { P: Prims; text: string; theme: Theme }) {
  const blocks: Array<{ list: boolean; lines: string[] }> = [];
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      blocks.push({ list: false, lines: [] });
      continue;
    }
    const isItem = /^\s*[-•]\s+/.test(line);
    const last = blocks[blocks.length - 1];
    if (last && last.list === isItem && last.lines.length) last.lines.push(isItem ? line.replace(/^\s*[-•]\s+/, '') : line);
    else blocks.push({ list: isItem, lines: [isItem ? line.replace(/^\s*[-•]\s+/, '') : line] });
  }
  return (
    <>
      {blocks
        .filter((b) => b.lines.length)
        .map((block, i) =>
          block.list ? (
            <P.View key={i} style={{ marginTop: i ? 3 : 0 }}>
              {block.lines.map((line, j) => (
                <Bullet key={j} P={P} theme={theme}>
                  {inlineRuns(P, line)}
                </Bullet>
              ))}
            </P.View>
          ) : (
            <P.Text key={i} style={{ lineHeight: 1.45, color: theme.text, marginTop: i ? 4 : 0 }}>
              {inlineRuns(P, block.lines.join(' '))}
            </P.Text>
          ),
        )}
    </>
  );
}

const BOLD = 'bold';
/** Top margin on every page (≈ 0.55in), so text never starts against the paper's edge after a page break. */
const PAGE_TOP = 40;

function Footer({ P, branding }: { P: Prims; branding: boolean }) {
  if (!branding) return null;
  return (
    <P.View fixed style={{ position: 'absolute', bottom: 12, left: 0, right: 0, alignItems: 'center' }}>
      <P.Text style={{ fontSize: 7, color: '#94a3b8', letterSpacing: 0.5 }}>
        Made with Dealo · dealo.africa/resume-builder
      </P.Text>
    </P.View>
  );
}

function Bullet({ P, theme, children }: { P: Prims; theme: Theme; children: ReactNode }) {
  return (
    <P.View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 2 }}>
      <P.Text style={{ width: 10, color: theme.accent, fontSize: theme.size - 1, fontWeight: BOLD }}>•</P.Text>
      <P.Text style={{ flex: 1, fontSize: theme.size, color: theme.text, lineHeight: 1.38 }}>{children}</P.Text>
    </P.View>
  );
}

function Row({
  P,
  left,
  right,
  theme,
  pill,
}: {
  P: Prims;
  left: ReactNode;
  right?: string;
  theme: Theme;
  pill?: boolean;
}) {
  return (
    <P.View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 1 }}>
      <P.View style={{ flex: 1, paddingRight: 8 }}>{left}</P.View>
      {right ? (
        pill ? (
          <P.View
            style={{
              backgroundColor: theme.onDark ? 'rgba(255,255,255,0.18)' : tint(theme.accent, 0.92),
              paddingVertical: 1.5,
              paddingHorizontal: 6,
              borderRadius: 3,
            }}
          >
            <P.Text
              style={{
                fontSize: theme.size - 1.5,
                fontWeight: BOLD,
                color: theme.onDark ? '#ffffff' : theme.accent,
                letterSpacing: 0.2,
              }}
            >
              {right}
            </P.Text>
          </P.View>
        ) : (
          <P.Text style={{ fontSize: theme.size - 1.2, fontWeight: BOLD, color: theme.muted, letterSpacing: 0.2 }}>
            {right}
          </P.Text>
        )
      ) : null}
    </P.View>
  );
}

function renderSection(P: Prims, data: ResumeData, section: ResumeSection, theme: Theme): ReactNode {
  const { size, muted } = theme;
  const block = (children: ReactNode) => (
    <P.View key={section} style={{ marginBottom: theme.gap }} wrap={section !== 'summary'}>
      {theme.title(SECTION_LABEL[section], section)}
      {children}
    </P.View>
  );

  switch (section) {
    case 'summary':
      return block(
        <P.View
          style={{
            borderLeftWidth: 2.5,
            borderLeftStyle: 'solid',
            borderLeftColor: theme.accent,
            paddingLeft: 10,
            paddingVertical: 1,
          }}
        >
          <RichText P={P} text={data.summary} theme={theme} />
        </P.View>,
      );
    case 'experience':
      return block(
        data.experience
          .filter((e) => e.role || e.company)
          .map((job, index) => (
            <P.View key={job.id} wrap={false} style={{ marginTop: index ? theme.gap * 0.7 : 0 }}>
              <Row
                P={P}
                theme={theme}
                pill
                left={<P.Text style={{ fontWeight: BOLD, fontSize: size + 0.8, color: '#0f172a' }}>{job.role}</P.Text>}
                right={dateRange(job.start, job.end, job.current)}
              />
              {job.company || job.location ? (
                <P.View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 1, marginBottom: 2 }}>
                  <P.Text style={{ fontSize: size - 0.5, fontWeight: BOLD, color: theme.muted }}>
                    {job.company}
                  </P.Text>
                  {job.company && job.location ? (
                    <P.Text style={{ fontSize: size - 0.5, color: theme.muted, marginHorizontal: 4 }}>•</P.Text>
                  ) : null}
                  {job.location ? (
                    <P.Text style={{ fontSize: size - 0.5, color: theme.muted }}>{job.location}</P.Text>
                  ) : null}
                </P.View>
              ) : null}
              {job.bullets.filter(Boolean).map((b, i) => (
                <Bullet key={i} P={P} theme={theme}>
                  {b}
                </Bullet>
              ))}
            </P.View>
          )),
      );
    case 'education':
      return block(
        data.education
          .filter((e) => e.school || e.qualification)
          .map((ed, index) => (
            <P.View key={ed.id} wrap={false} style={{ marginTop: index ? theme.gap * 0.55 : 0 }}>
              <Row
                P={P}
                theme={theme}
                pill
                left={
                  <P.Text style={{ fontWeight: BOLD, fontSize: size + 0.5, color: '#0f172a' }}>
                    {[ed.qualification, ed.field].filter(Boolean).join(' in ') || ed.qualification || ed.field || ed.school}
                  </P.Text>
                }
                right={dateRange(ed.start, ed.end, false)}
              />
              <P.View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 1 }}>
                {ed.qualification || ed.field ? (
                  <P.Text style={{ fontSize: size - 0.5, color: theme.muted, fontWeight: BOLD }}>{ed.school}</P.Text>
                ) : null}
                {ed.grade ? (
                  <P.View
                    style={{
                      marginLeft: 6,
                      backgroundColor: tint(theme.accent, 0.9),
                      paddingHorizontal: 4,
                      paddingVertical: 1,
                      borderRadius: 2,
                    }}
                  >
                    <P.Text style={{ fontSize: size - 1.5, fontWeight: BOLD, color: theme.accent }}>{ed.grade}</P.Text>
                  </P.View>
                ) : null}
              </P.View>
            </P.View>
          )),
      );
    case 'skills':
      if (theme.skills === 'inline') return block(<P.Text style={{ lineHeight: 1.45 }}>{data.skills.join('  ·  ')}</P.Text>);
      if (theme.skills === 'list')
        return block(
          data.skills.map((s) => (
            <Bullet key={s} P={P} theme={theme}>
              {s}
            </Bullet>
          )),
        );
      return block(
        <P.View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {data.skills.map((s) => (
            <P.View
              key={s}
              style={
                theme.skills === 'grid'
                  ? { width: '48%', flexDirection: 'row', paddingVertical: 2 }
                  : {
                      paddingVertical: 2.5,
                      paddingHorizontal: 7,
                      borderRadius: 4,
                      borderWidth: 0.8,
                      borderStyle: 'solid',
                      borderColor: theme.onDark ? 'rgba(255,255,255,0.25)' : tint(theme.accent, 0.72),
                      backgroundColor: theme.onDark ? 'rgba(255,255,255,0.14)' : tint(theme.accent, 0.92),
                      marginBottom: 3,
                      marginRight: 4,
                    }
              }
            >
              {theme.skills === 'grid' ? <P.Text style={{ width: 9, color: theme.accent }}>•</P.Text> : null}
              <P.Text
                style={{
                  fontSize: size - 0.8,
                  fontWeight: theme.skills === 'chips' ? BOLD : 'normal',
                  color: theme.skills === 'grid' ? theme.text : theme.onDark ? '#ffffff' : theme.accent,
                }}
              >
                {s}
              </P.Text>
            </P.View>
          ))}
        </P.View>,
      );
    case 'certifications':
      return block(
        data.certifications
          .filter((c) => c.name)
          .map((c, index) => (
            <P.View key={c.id} wrap={false} style={{ marginTop: index ? 5 : 0 }}>
              <Row
                P={P}
                theme={theme}
                pill={theme.onDark}
                left={
                  <P.Text style={{ fontWeight: BOLD, fontSize: size + 0.3, color: theme.onDark ? '#ffffff' : '#0f172a' }}>
                    {c.name}
                  </P.Text>
                }
                right={c.year}
              />
              {c.issuer || c.number ? (
                <P.Text style={{ fontSize: size - 0.8, color: theme.onDark ? 'rgba(255,255,255,0.85)' : muted, marginTop: 1 }}>
                  {[c.issuer, c.number ? `Licence #${c.number}` : ''].filter(Boolean).join('  ·  ')}
                </P.Text>
              ) : null}
            </P.View>
          )),
      );
    case 'languages':
      return block(
        data.languages
          .filter((l) => l.name)
          .map((l) => (
            <P.View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <P.Text style={{ fontWeight: BOLD, fontSize: size }}>{l.name}</P.Text>
              {l.level ? (
                <P.Text style={{ color: muted, fontSize: size - 0.5, marginLeft: 4 }}>{`— ${l.level}`}</P.Text>
              ) : null}
            </P.View>
          )),
      );
    case 'projects':
      return block(
        data.projects
          .filter((p) => p.name)
          .map((p, index) => (
            <P.View key={p.id} wrap={false} style={{ marginTop: index ? 5 : 0 }}>
              <P.Text style={{ fontWeight: BOLD, fontSize: size + 0.3, color: '#0f172a' }}>
                {p.name}
                {p.link ? <P.Text style={{ fontWeight: 'normal', color: muted, fontSize: size - 0.8 }}>{`  ${p.link.replace(/^https?:\/\//, '')}`}</P.Text> : null}
              </P.Text>
              {p.description ? (
                <P.View style={{ marginTop: 1 }}>
                  <RichText P={P} text={p.description} theme={theme} />
                </P.View>
              ) : null}
            </P.View>
          )),
      );
    case 'references':
      if (data.references.mode === 'on_request' || !data.references.items.some((r) => r.name)) {
        return block(<P.Text style={{ color: muted, fontStyle: 'italic' }}>Available on request.</P.Text>);
      }
      return block(
        <P.View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {data.references.items
            .filter((r) => r.name)
            .map((r) => (
              <P.View key={r.id} style={{ width: '46%' }}>
                <P.Text style={{ fontWeight: BOLD, color: '#0f172a' }}>{r.name}</P.Text>
                <P.Text style={{ color: muted, fontSize: size - 0.5 }}>{[r.role, r.company].filter(Boolean).join(', ')}</P.Text>
                {r.contact ? <P.Text style={{ color: muted, fontSize: size - 0.5 }}>{r.contact}</P.Text> : null}
              </P.View>
            ))}
        </P.View>,
      );
  }
}

function Contacts({
  P,
  data,
  color,
  center,
  size,
  capsule,
  iconColor,
}: {
  P: Prims;
  data: ResumeData;
  color: string;
  center?: boolean;
  size: number;
  capsule?: boolean;
  iconColor?: string;
}) {
  const items = contactItems(data.personal);
  if (!items.length) return null;
  const icon = (kind: (typeof items)[number]['kind']) =>
    data.design.icons ? <CvIcon P={P} name={kind} size={size + 0.5} color={iconColor ?? color} style={{ marginRight: 3.5 }} /> : null;
  return (
    <P.View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: center ? 'center' : 'flex-start',
        marginTop: 4,
        alignItems: 'center',
      }}
    >
      {items.map((item, i) => (
        <Fragment key={item.text}>
          {capsule ? (
            <P.View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.18)',
                borderRadius: 4,
                paddingHorizontal: 7,
                paddingVertical: 2.5,
                marginRight: 6,
                marginBottom: 4,
              }}
            >
              {icon(item.kind)}
              {item.href ? (
                <P.Link href={item.href} style={{ fontSize: size, color, fontWeight: BOLD }}>
                  {item.text}
                </P.Link>
              ) : (
                <P.Text style={{ fontSize: size, color, fontWeight: BOLD }}>{item.text}</P.Text>
              )}
            </P.View>
          ) : (
            <P.View style={{ flexDirection: 'row', alignItems: 'center', marginRight: center ? 0 : 10 }}>
              {icon(item.kind)}
              {item.href ? (
                <P.Link href={item.href} style={{ fontSize: size, color }}>
                  {item.text}
                </P.Link>
              ) : (
                <P.Text style={{ fontSize: size, color }}>{item.text}</P.Text>
              )}
              {i < items.length - 1 && center ? (
                <P.Text style={{ fontSize: size, color, marginHorizontal: 5 }}>·</P.Text>
              ) : null}
            </P.View>
          )}
        </Fragment>
      ))}
    </P.View>
  );
}

const name = (data: ResumeData) => data.personal.fullName || 'Your Name';

// ------------------------------------------------------------------ Classic

function Classic({ P, data, style, family, branding }: TemplateProps) {
  const theme: Theme = {
    size: 9.5,
    accent: style.accentColor,
    text: '#1f2937',
    muted: '#475569',
    gap: 15,
    skills: 'inline',
    title: (label, section) => (
      <P.View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: tint(style.accentColor, 0.55), paddingBottom: 3, marginBottom: 7 }}>
        <HeadIcon P={P} data={data} section={section} color={style.accentColor} />
        <P.Text style={{ fontSize: 10, fontWeight: BOLD, letterSpacing: 1.2, textTransform: 'uppercase', color: style.accentColor }}>{label}</P.Text>
      </P.View>
    ),
  };
  return (
    <P.Page style={{ fontFamily: family, fontSize: theme.size, color: theme.text, lineHeight: 1.38, paddingTop: 46, paddingBottom: 48, paddingHorizontal: 54 }}>
      <HeaderArt P={P} art={data.design.art} color={style.accentColor} />
      <P.View style={{ alignItems: 'center', marginBottom: 20 }}>
        <P.Text style={{ fontSize: 23, fontWeight: BOLD, color: '#0f172a', textAlign: 'center', letterSpacing: 0.2 }}>{name(data)}</P.Text>
        {data.personal.headline ? (
          <P.Text style={{ fontSize: 10.5, color: style.accentColor, marginTop: 3, textAlign: 'center', fontWeight: 'normal' }}>
            {data.personal.headline}
          </P.Text>
        ) : null}
        <Contacts P={P} data={data} color={theme.muted} iconColor={style.accentColor} center size={8.5} />
      </P.View>
      {visibleSections(data).map((s) => renderSection(P, data, s, theme))}
      <Footer P={P} branding={branding} />
    </P.Page>
  );
}

// ------------------------------------------------------------------- Modern

function Modern({ P, data, style, family, branding }: TemplateProps) {
  const theme: Theme = {
    size: 9.3,
    accent: style.accentColor,
    text: '#1e293b',
    muted: '#64748b',
    gap: 16,
    skills: 'chips',
    title: (label, section) => (
      <P.View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 7,
          borderBottomWidth: 1,
          borderBottomStyle: 'solid',
          borderBottomColor: tint(style.accentColor, 0.84),
          paddingBottom: 3,
        }}
      >
        <P.View style={{ width: 4, height: 12, backgroundColor: style.accentColor, borderRadius: 2, marginRight: 6 }} />
        <HeadIcon P={P} data={data} section={section} color={style.accentColor} />
        <P.Text style={{ fontSize: 10.5, fontWeight: BOLD, letterSpacing: 0.6, textTransform: 'uppercase', color: '#0f172a' }}>
          {label}
        </P.Text>
      </P.View>
    ),
  };
  return (
    <P.Page style={{ fontFamily: family, fontSize: theme.size, color: theme.text, lineHeight: 1.38, paddingTop: PAGE_TOP, paddingBottom: 48 }}>
      {/* The banner runs to the top edge; the page's top margin applies from page 2 on. */}
      <P.View
        style={{
          backgroundColor: style.accentColor,
          paddingHorizontal: 52,
          paddingTop: 36,
          paddingBottom: 24,
          marginTop: -PAGE_TOP,
          marginBottom: 20,
        }}
      >
        <P.View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <P.View style={{ flex: 1, paddingRight: 20 }}>
            <P.Text style={{ fontSize: 24, fontWeight: BOLD, color: '#ffffff', letterSpacing: -0.2 }}>
              {name(data)}
            </P.Text>
            {data.personal.headline ? (
              <P.Text style={{ fontSize: 11, color: tint(style.accentColor, 0.82), marginTop: 4, fontWeight: 'normal' }}>
                {data.personal.headline}
              </P.Text>
            ) : null}
          </P.View>
          {/* Candidate Monogram Badge */}
          <P.View
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              backgroundColor: 'rgba(255,255,255,0.18)',
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: 'rgba(255,255,255,0.3)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <P.Text style={{ fontSize: 13, fontWeight: BOLD, color: '#ffffff' }}>
              {(name(data) || 'CV')
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </P.Text>
          </P.View>
        </P.View>

        {/* Contact Pills in Header */}
        <P.View style={{ marginTop: 12 }}>
          <Contacts P={P} data={data} color="#ffffff" capsule size={8.5} />
        </P.View>
      </P.View>
      <HeaderArt P={P} art={data.design.art} color="#ffffff" width={170} />

      {/* Body Content with 52pt left & right margins */}
      <P.View style={{ paddingHorizontal: 52, paddingBottom: 20 }}>
        {visibleSections(data).map((s) => renderSection(P, data, s, theme))}
      </P.View>
      <Footer P={P} branding={branding} />
    </P.Page>
  );
}

// ---------------------------------------------------------------- Executive

const SIDE: ResumeSection[] = ['skills', 'languages', 'certifications'];

function Executive({ P, data, style, family, branding }: TemplateProps) {
  const sideBg = tint(style.accentColor, 0.92);
  const base = { size: 9.2, accent: style.accentColor, text: '#1e293b', muted: '#64748b' };
  const main: Theme = {
    ...base,
    gap: 16,
    skills: 'list',
    title: (label, section) => (
      <P.View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: tint(style.accentColor, 0.8), paddingBottom: 3, marginBottom: 7 }}>
        <HeadIcon P={P} data={data} section={section} color={style.accentColor} />
        <P.Text style={{ fontSize: 10.5, fontWeight: BOLD, color: style.accentColor, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {label}
        </P.Text>
      </P.View>
    ),
  };
  const side: Theme = {
    ...base,
    gap: 16,
    skills: 'chips',
    title: (label, section) => (
      <P.View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: tint(style.accentColor, 0.75), paddingBottom: 3, marginBottom: 6 }}>
        <HeadIcon P={P} data={data} section={section} color={style.accentColor} size={9} />
        <P.Text style={{ fontSize: 8.5, fontWeight: BOLD, color: style.accentColor, letterSpacing: 1.1, textTransform: 'uppercase' }}>
          {label}
        </P.Text>
      </P.View>
    ),
  };
  const sections = visibleSections(data);
  const contacts = contactItems(data.personal);
  return (
    <P.Page style={{ fontFamily: family, fontSize: base.size, color: base.text, lineHeight: 1.38, flexDirection: 'row', paddingTop: PAGE_TOP, paddingBottom: 44 }}>
      <HeaderArt P={P} art={data.design.art} color={style.accentColor} width={160} />
      {/* Background Left Sidebar */}
      <P.View
        fixed
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: 196,
          backgroundColor: sideBg,
          borderRightWidth: 1,
          borderRightStyle: 'solid',
          borderRightColor: tint(style.accentColor, 0.85),
        }}
      />

      {/* Sidebar Content with generous padding */}
      <P.View style={{ width: 196, paddingHorizontal: 22 }}>
        {/* Monogram */}
        <P.View style={{ alignItems: 'center', marginBottom: 18 }}>
          <P.View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: style.accentColor,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 6,
            }}
          >
            <P.Text style={{ fontSize: 14, fontWeight: BOLD, color: '#ffffff' }}>
              {(name(data) || 'CV')
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </P.Text>
          </P.View>
        </P.View>

        {contacts.length ? (
          <P.View style={{ marginBottom: 16 }}>
            {side.title('Contact Details')}
            {contacts.map((c) => (
              <P.View
                key={c.text}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 4,
                  backgroundColor: '#ffffff',
                  borderRadius: 4,
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                  borderWidth: 0.5,
                  borderStyle: 'solid',
                  borderColor: tint(style.accentColor, 0.8),
                }}
              >
                {data.design.icons ? <CvIcon P={P} name={c.kind} size={8.5} color={style.accentColor} style={{ marginRight: 4 }} /> : null}
                {c.href ? (
                  <P.Link href={c.href} style={{ fontSize: 8, color: '#334155' }}>
                    {c.text}
                  </P.Link>
                ) : (
                  <P.Text style={{ fontSize: 8, color: '#334155' }}>{c.text}</P.Text>
                )}
              </P.View>
            ))}
          </P.View>
        ) : null}
        {sections.filter((s) => SIDE.includes(s)).map((s) => renderSection(P, data, s, side))}
      </P.View>

      {/* Main Column Content with generous padding */}
      <P.View style={{ flex: 1, paddingLeft: 28, paddingRight: 50, paddingBottom: 24 }}>
        <P.View
          style={{
            marginBottom: 18,
            borderBottomWidth: 1.5,
            borderBottomStyle: 'solid',
            borderBottomColor: tint(style.accentColor, 0.8),
            paddingBottom: 12,
          }}
        >
          <P.Text style={{ fontSize: 23, fontWeight: BOLD, color: '#0f172a', letterSpacing: -0.2 }}>{name(data)}</P.Text>
          {data.personal.headline ? (
            <P.Text style={{ fontSize: 11, fontWeight: BOLD, color: style.accentColor, marginTop: 3 }}>
              {data.personal.headline}
            </P.Text>
          ) : null}
        </P.View>
        {sections.filter((s) => !SIDE.includes(s)).map((s) => renderSection(P, data, s, main))}
      </P.View>
      <Footer P={P} branding={branding} />
    </P.Page>
  );
}

// ------------------------------------------------------------------ Minimal

function Minimal({ P, data, style, family, branding }: TemplateProps) {
  const theme: Theme = {
    size: 9.3,
    accent: style.accentColor,
    text: '#18181b',
    muted: '#71717a',
    gap: 16,
    skills: 'inline',
    title: () => null,
  };
  return (
    <P.Page style={{ fontFamily: family, fontSize: theme.size, color: theme.text, lineHeight: 1.4, paddingTop: 52, paddingBottom: 52, paddingHorizontal: 54 }}>
      <HeaderArt P={P} art={data.design.art} color={style.accentColor} />
      <P.View style={{ marginBottom: 26, borderBottomWidth: 1.5, borderBottomStyle: 'solid', borderBottomColor: '#18181b', paddingBottom: 14 }}>
        <P.Text style={{ fontSize: 26, fontWeight: BOLD, color: '#18181b', letterSpacing: -0.4 }}>{name(data)}</P.Text>
        {data.personal.headline ? <P.Text style={{ fontSize: 11, color: style.accentColor, marginTop: 4 }}>{data.personal.headline}</P.Text> : null}
        <Contacts P={P} data={data} color={theme.muted} iconColor={style.accentColor} size={8.5} />
      </P.View>
      {visibleSections(data).map((s) => (
        <P.View key={s} style={{ flexDirection: 'row', borderTopWidth: 0.6, borderTopStyle: 'solid', borderTopColor: '#e4e4e7', paddingTop: 10, marginBottom: 12 }}>
          <P.View style={{ width: 100, flexDirection: 'row', alignItems: 'flex-start', paddingRight: 10 }}>
            <HeadIcon P={P} data={data} section={s} color={style.accentColor} size={9} />
            <P.Text style={{ flex: 1, fontSize: 8.5, fontWeight: BOLD, letterSpacing: 1.1, textTransform: 'uppercase', color: style.accentColor }}>{SECTION_LABEL[s]}</P.Text>
          </P.View>
          <P.View style={{ flex: 1 }}>{renderSection(P, data, s, { ...theme, gap: 0 })}</P.View>
        </P.View>
      ))}
      <Footer P={P} branding={branding} />
    </P.Page>
  );
}

// ------------------------------------------------------------------ Artisan

function Artisan({ P, data, style, family, branding }: TemplateProps) {
  const theme: Theme = {
    size: 9.3,
    accent: style.accentColor,
    text: '#1e293b',
    muted: '#64748b',
    gap: 15,
    skills: 'grid',
    title: (label, section) => (
      <P.View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.8, borderBottomStyle: 'solid', borderBottomColor: style.accentColor, paddingBottom: 3, marginBottom: 7 }}>
        <HeadIcon P={P} data={data} section={section} color={style.accentColor} />
        <P.Text style={{ fontSize: 10.5, fontWeight: BOLD, color: '#0f172a', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {label}
        </P.Text>
      </P.View>
    ),
  };
  const certTheme: Theme = { ...theme, onDark: true, muted: 'rgba(255,255,255,0.85)', text: '#ffffff', title: () => null };
  const certs = data.certifications.filter((c) => c.name);
  const sections = visibleSections(data).filter((s) => s !== 'certifications');
  return (
    <P.Page style={{ fontFamily: family, fontSize: theme.size, color: theme.text, lineHeight: 1.38, paddingTop: 40, paddingBottom: 48, paddingHorizontal: 52 }}>
      {/* Decorative Top Accent Stripe */}
      <P.View fixed style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: style.accentColor }} />
      <HeaderArt P={P} art={data.design.art} color={style.accentColor} />

      <P.View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <P.View style={{ flex: 1, paddingRight: 16 }}>
          <P.Text style={{ fontSize: 24, fontWeight: BOLD, color: '#0f172a', letterSpacing: -0.3 }}>{name(data)}</P.Text>
          {data.personal.headline ? (
            <P.Text style={{ fontSize: 11.5, fontWeight: BOLD, color: style.accentColor, marginTop: 3 }}>{data.personal.headline}</P.Text>
          ) : null}
        </P.View>
      </P.View>

      <P.View style={{ borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: '#e2e8f0', paddingTop: 6, marginBottom: 14 }}>
        <Contacts P={P} data={data} color={theme.muted} iconColor={style.accentColor} size={8.5} />
      </P.View>

      {/* Prominent Trade Licences & Certifications Banner */}
      {certs.length ? (
        <P.View wrap={false} style={{ backgroundColor: style.accentColor, borderRadius: 5, padding: 12, marginBottom: 18 }}>
          <P.Text style={{ fontSize: 8.5, fontWeight: BOLD, letterSpacing: 1.2, textTransform: 'uppercase', color: '#ffffff', marginBottom: 6 }}>
            ★ Licences and Verified Credentials
          </P.Text>
          {renderSection(P, data, 'certifications', certTheme)}
        </P.View>
      ) : null}

      {sections.map((s) => renderSection(P, data, s, theme))}
      <Footer P={P} branding={branding} />
    </P.Page>
  );
}

// ------------------------------------------------------------------ Compact

function Compact({ P, data, style, family, branding }: TemplateProps) {
  const theme: Theme = {
    size: 8.6,
    accent: style.accentColor,
    text: '#1e293b',
    muted: '#64748b',
    gap: 11,
    skills: 'chips',
    title: (label, section) => (
      <P.View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: tint(style.accentColor, 0.7), paddingBottom: 2, marginBottom: 5 }}>
        <HeadIcon P={P} data={data} section={section} color={style.accentColor} size={9} />
        <P.Text style={{ fontSize: 8.5, fontWeight: BOLD, letterSpacing: 0.8, textTransform: 'uppercase', color: style.accentColor }}>{label}</P.Text>
      </P.View>
    ),
  };
  const sections = visibleSections(data);
  const left: ResumeSection[] = ['summary', 'experience', 'projects'];
  return (
    <P.Page style={{ fontFamily: family, fontSize: theme.size, color: theme.text, lineHeight: 1.32, paddingTop: PAGE_TOP, paddingBottom: 40, paddingHorizontal: 46 }}>
      <HeaderArt P={P} art={data.design.art} color={style.accentColor} width={150} />
      <P.View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
          paddingBottom: 8,
          marginBottom: 12,
          borderBottomWidth: 1.5,
          borderBottomStyle: 'solid',
          borderBottomColor: style.accentColor,
        }}
      >
        <P.View style={{ flex: 1 }}>
          <P.Text style={{ fontSize: 20, fontWeight: BOLD, color: '#0f172a' }}>{name(data)}</P.Text>
          {data.personal.headline ? <P.Text style={{ fontSize: 10, color: style.accentColor, marginTop: 1 }}>{data.personal.headline}</P.Text> : null}
        </P.View>
        <P.View style={{ width: 190, alignItems: 'flex-end' }}>
          {contactItems(data.personal).map((c) => (
            <P.View key={c.text} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
              {data.design.icons ? <CvIcon P={P} name={c.kind} size={8} color={style.accentColor} style={{ marginRight: 3 }} /> : null}
              <P.Text style={{ fontSize: 8, color: theme.muted, textAlign: 'right' }}>{c.text}</P.Text>
            </P.View>
          ))}
        </P.View>
      </P.View>
      <P.View style={{ flexDirection: 'row', gap: 18 }}>
        <P.View style={{ flex: 1.65 }}>{sections.filter((s) => left.includes(s)).map((s) => renderSection(P, data, s, theme))}</P.View>
        <P.View style={{ flex: 1 }}>{sections.filter((s) => !left.includes(s)).map((s) => renderSection(P, data, s, theme))}</P.View>
      </P.View>
      <Footer P={P} branding={branding} />
    </P.Page>
  );
}

export const TEMPLATE_COMPONENTS: Record<ResumeStyle['template'], (p: TemplateProps) => ReactNode> = {
  classic: Classic,
  modern: Modern,
  executive: Executive,
  minimal: Minimal,
  artisan: Artisan,
  compact: Compact,
};

// ------------------------------------------------------------- Cover letter

export type CoverLetterProps = {
  P: Prims;
  letter: import('@dealo/shared').CoverLetterData;
  style: ResumeStyle;
  family: string;
  branding: boolean;
};

export function CoverLetterTemplate({ P, letter, style, family, branding }: CoverLetterProps) {
  const contacts = [letter.email, letter.phone, letter.location].filter(Boolean);
  const s: RStyle = { fontFamily: family, fontSize: 9.8, color: '#1e293b', lineHeight: 1.55, paddingTop: 52, paddingBottom: 52, paddingHorizontal: 58 };
  return (
    <P.Page style={s}>
      <P.View style={{ borderBottomWidth: 2, borderBottomStyle: 'solid', borderBottomColor: style.accentColor, paddingBottom: 12, marginBottom: 22 }}>
        <P.Text style={{ fontSize: 22, fontWeight: BOLD, color: '#0f172a' }}>{letter.fullName || 'Your Name'}</P.Text>
        {contacts.length ? <P.Text style={{ fontSize: 9, color: '#64748b', marginTop: 3 }}>{contacts.join('  ·  ')}</P.Text> : null}
      </P.View>
      {letter.date ? <P.Text style={{ marginBottom: 12, color: '#64748b', fontSize: 9.5 }}>{letter.date}</P.Text> : null}
      {letter.recipient || letter.company ? (
        <P.View style={{ marginBottom: 16 }}>
          {letter.recipient ? <P.Text style={{ fontSize: 9.8 }}>{letter.recipient}</P.Text> : null}
          {letter.company ? <P.Text style={{ fontWeight: BOLD, fontSize: 10, color: '#0f172a' }}>{letter.company}</P.Text> : null}
        </P.View>
      ) : null}
      {letter.jobTitle ? <P.Text style={{ fontWeight: BOLD, color: style.accentColor, marginBottom: 14, fontSize: 11 }}>{`Re: Application for ${letter.jobTitle}`}</P.Text> : null}
      {letter.body
        .split(/\n{2,}/)
        .filter((p) => p.trim())
        .map((p, i) => (
          <P.Text key={i} style={{ marginBottom: 12, lineHeight: 1.55 }}>
            {p.trim()}
          </P.Text>
        ))}
      {letter.fullName ? <P.Text style={{ marginTop: 10, fontWeight: BOLD }}>{letter.fullName}</P.Text> : null}
      <Footer P={P} branding={branding} />
    </P.Page>
  );
}

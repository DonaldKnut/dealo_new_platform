import type { ResumeData, ResumeSection, ResumeStyle } from '@dealo/shared';
import { Fragment, type ReactNode } from 'react';

import type { Prims, RStyle } from './primitives';
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
  title: (label: string) => ReactNode;
  skills: 'chips' | 'inline' | 'list' | 'grid';
  onDark?: boolean;
};

const BOLD = 'bold';

function Footer({ P, branding }: { P: Prims; branding: boolean }) {
  if (!branding) return null;
  return (
    <P.View fixed style={{ position: 'absolute', bottom: 14, left: 0, right: 0, alignItems: 'center' }}>
      <P.Text style={{ fontSize: 7, color: '#94a3b8' }}>Made with Dealo · dealo.africa/resume-builder</P.Text>
    </P.View>
  );
}

function Bullet({ P, theme, children }: { P: Prims; theme: Theme; children: ReactNode }) {
  return (
    <P.View style={{ flexDirection: 'row', marginTop: 2 }}>
      <P.Text style={{ width: 9, color: theme.accent }}>•</P.Text>
      <P.Text style={{ flex: 1 }}>{children}</P.Text>
    </P.View>
  );
}

function Row({ P, left, right, theme }: { P: Prims; left: ReactNode; right?: string; theme: Theme }) {
  return (
    <P.View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
      <P.View style={{ flex: 1 }}>{left}</P.View>
      {right ? <P.Text style={{ fontSize: theme.size - 1, color: theme.muted, textAlign: 'right' }}>{right}</P.Text> : null}
    </P.View>
  );
}

function renderSection(P: Prims, data: ResumeData, section: ResumeSection, theme: Theme): ReactNode {
  const { size, muted } = theme;
  const block = (children: ReactNode) => (
    <P.View key={section} style={{ marginBottom: theme.gap }} wrap={section !== 'summary'}>
      {theme.title(SECTION_LABEL[section])}
      {children}
    </P.View>
  );

  switch (section) {
    case 'summary':
      return block(<P.Text style={{ lineHeight: 1.45 }}>{data.summary}</P.Text>);
    case 'experience':
      return block(
        data.experience
          .filter((e) => e.role || e.company)
          .map((job, index) => (
            <P.View key={job.id} wrap={false} style={{ marginTop: index ? theme.gap * 0.6 : 0 }}>
              <Row
                P={P}
                theme={theme}
                left={<P.Text style={{ fontWeight: BOLD, fontSize: size + 0.5 }}>{job.role}</P.Text>}
                right={dateRange(job.start, job.end, job.current)}
              />
              {job.company || job.location ? (
                <P.Text style={{ color: muted, marginTop: 1 }}>{[job.company, job.location].filter(Boolean).join(' · ')}</P.Text>
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
            <P.View key={ed.id} wrap={false} style={{ marginTop: index ? theme.gap * 0.5 : 0 }}>
              <Row
                P={P}
                theme={theme}
                left={
                  <P.Text style={{ fontWeight: BOLD }}>
                    {[ed.qualification, ed.field].filter(Boolean).join(', ') || ed.school}
                  </P.Text>
                }
                right={dateRange(ed.start, ed.end, false)}
              />
              <P.Text style={{ color: muted, marginTop: 1 }}>
                {[ed.qualification || ed.field ? ed.school : '', ed.grade].filter(Boolean).join(' · ')}
              </P.Text>
            </P.View>
          )),
      );
    case 'skills':
      if (theme.skills === 'inline') return block(<P.Text style={{ lineHeight: 1.45 }}>{data.skills.join(' · ')}</P.Text>);
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
                      paddingHorizontal: 6,
                      borderRadius: 8,
                      backgroundColor: theme.onDark ? 'rgba(255,255,255,0.14)' : tint(theme.accent, 0.88),
                    }
              }
            >
              {theme.skills === 'grid' ? <P.Text style={{ width: 9, color: theme.accent }}>•</P.Text> : null}
              <P.Text style={{ fontSize: size - 1, color: theme.skills === 'grid' ? theme.text : theme.onDark ? '#ffffff' : theme.accent }}>{s}</P.Text>
            </P.View>
          ))}
        </P.View>,
      );
    case 'certifications':
      return block(
        data.certifications
          .filter((c) => c.name)
          .map((c, index) => (
            <P.View key={c.id} wrap={false} style={{ marginTop: index ? 4 : 0 }}>
              <Row P={P} theme={theme} left={<P.Text style={{ fontWeight: BOLD }}>{c.name}</P.Text>} right={c.year} />
              {c.issuer || c.number ? (
                <P.Text style={{ color: theme.onDark ? 'rgba(255,255,255,0.75)' : muted }}>
                  {[c.issuer, c.number ? `No. ${c.number}` : ''].filter(Boolean).join(' · ')}
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
            <P.Text key={l.id} style={{ marginTop: 1 }}>
              <P.Text style={{ fontWeight: BOLD }}>{l.name}</P.Text>
              {l.level ? ` — ${l.level}` : ''}
            </P.Text>
          )),
      );
    case 'projects':
      return block(
        data.projects
          .filter((p) => p.name)
          .map((p, index) => (
            <P.View key={p.id} wrap={false} style={{ marginTop: index ? 5 : 0 }}>
              <P.Text style={{ fontWeight: BOLD }}>
                {p.name}
                {p.link ? <P.Text style={{ fontWeight: 'normal', color: muted }}>{`  ${p.link.replace(/^https?:\/\//, '')}`}</P.Text> : null}
              </P.Text>
              {p.description ? <P.Text style={{ lineHeight: 1.4, marginTop: 1 }}>{p.description}</P.Text> : null}
            </P.View>
          )),
      );
    case 'references':
      if (data.references.mode === 'on_request' || !data.references.items.some((r) => r.name)) {
        return block(<P.Text style={{ color: muted }}>Available on request.</P.Text>);
      }
      return block(
        <P.View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {data.references.items
            .filter((r) => r.name)
            .map((r) => (
              <P.View key={r.id} style={{ width: '46%' }}>
                <P.Text style={{ fontWeight: BOLD }}>{r.name}</P.Text>
                <P.Text style={{ color: muted }}>{[r.role, r.company].filter(Boolean).join(', ')}</P.Text>
                {r.contact ? <P.Text style={{ color: muted }}>{r.contact}</P.Text> : null}
              </P.View>
            ))}
        </P.View>,
      );
  }
}

function Contacts({ P, data, color, center, size }: { P: Prims; data: ResumeData; color: string; center?: boolean; size: number }) {
  const items = contactItems(data.personal);
  if (!items.length) return null;
  return (
    <P.View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: center ? 'center' : 'flex-start', marginTop: 5, columnGap: 10, rowGap: 2 }}>
      {items.map((item, i) => (
        <Fragment key={item.text}>
          {item.href ? (
            <P.Link href={item.href} style={{ fontSize: size, color }}>
              {item.text}
            </P.Link>
          ) : (
            <P.Text style={{ fontSize: size, color }}>{item.text}</P.Text>
          )}
          {i < items.length - 1 && center ? <P.Text style={{ fontSize: size, color }}>·</P.Text> : null}
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
    muted: '#64748b',
    gap: 13,
    skills: 'inline',
    title: (label) => (
      <P.View style={{ borderBottomWidth: 0.8, borderBottomStyle: 'solid', borderBottomColor: tint(style.accentColor, 0.6), paddingBottom: 3, marginBottom: 6 }}>
        <P.Text style={{ fontSize: 9, fontWeight: BOLD, letterSpacing: 1.2, textTransform: 'uppercase', color: style.accentColor }}>{label}</P.Text>
      </P.View>
    ),
  };
  return (
    <P.Page style={{ fontFamily: family, fontSize: theme.size, color: theme.text, lineHeight: 1.35, paddingTop: 40, paddingBottom: 44, paddingHorizontal: 46 }}>
      <P.View style={{ alignItems: 'center', marginBottom: 18 }}>
        <P.Text style={{ fontSize: 23, fontWeight: BOLD, color: '#0f172a', textAlign: 'center' }}>{name(data)}</P.Text>
        {data.personal.headline ? <P.Text style={{ fontSize: 11, color: style.accentColor, marginTop: 3, textAlign: 'center' }}>{data.personal.headline}</P.Text> : null}
        <Contacts P={P} data={data} color={theme.muted} center size={8.5} />
      </P.View>
      {visibleSections(data).map((s) => renderSection(P, data, s, theme))}
      <Footer P={P} branding={branding} />
    </P.Page>
  );
}

// ------------------------------------------------------------------- Modern

function Modern({ P, data, style, family, branding }: TemplateProps) {
  const theme: Theme = {
    size: 9.5,
    accent: style.accentColor,
    text: '#1f2937',
    muted: '#64748b',
    gap: 14,
    skills: 'chips',
    title: (label) => (
      <P.View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <P.View style={{ width: 3, height: 11, backgroundColor: style.accentColor, borderRadius: 2, marginRight: 6 }} />
        <P.Text style={{ fontSize: 11, fontWeight: BOLD, color: '#0f172a' }}>{label}</P.Text>
      </P.View>
    ),
  };
  return (
    <P.Page style={{ fontFamily: family, fontSize: theme.size, color: theme.text, lineHeight: 1.35, paddingBottom: 44 }}>
      <P.View style={{ backgroundColor: style.accentColor, paddingHorizontal: 44, paddingTop: 34, paddingBottom: 22, marginBottom: 20 }}>
        <P.Text style={{ fontSize: 25, fontWeight: BOLD, color: '#ffffff' }}>{name(data)}</P.Text>
        {data.personal.headline ? <P.Text style={{ fontSize: 11.5, color: tint(style.accentColor, 0.75), marginTop: 3 }}>{data.personal.headline}</P.Text> : null}
        <Contacts P={P} data={data} color="#ffffff" size={8.5} />
      </P.View>
      <P.View style={{ paddingHorizontal: 44 }}>{visibleSections(data).map((s) => renderSection(P, data, s, theme))}</P.View>
      <Footer P={P} branding={branding} />
    </P.Page>
  );
}

// ---------------------------------------------------------------- Executive

const SIDE: ResumeSection[] = ['skills', 'languages', 'certifications'];

function Executive({ P, data, style, family, branding }: TemplateProps) {
  const sideBg = tint(style.accentColor, 0.9);
  const base = { size: 9.3, accent: style.accentColor, text: '#1f2937', muted: '#64748b' };
  const main: Theme = {
    ...base,
    gap: 14,
    skills: 'list',
    title: (label) => (
      <P.Text style={{ fontSize: 11, fontWeight: BOLD, color: style.accentColor, marginBottom: 6, letterSpacing: 0.4 }}>{label}</P.Text>
    ),
  };
  const side: Theme = {
    ...base,
    gap: 16,
    skills: 'list',
    title: (label) => (
      <P.Text style={{ fontSize: 8.5, fontWeight: BOLD, color: style.accentColor, marginBottom: 5, letterSpacing: 1.1, textTransform: 'uppercase' }}>{label}</P.Text>
    ),
  };
  const sections = visibleSections(data);
  const contacts = contactItems(data.personal);
  return (
    <P.Page style={{ fontFamily: family, fontSize: base.size, color: base.text, lineHeight: 1.35, flexDirection: 'row', paddingBottom: 40 }}>
      <P.View fixed style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 178, backgroundColor: sideBg }} />
      <P.View style={{ width: 178, paddingTop: 40, paddingHorizontal: 20 }}>
        {contacts.length ? (
          <P.View style={{ marginBottom: 16 }}>
            {side.title('Contact')}
            {contacts.map((c) =>
              c.href ? (
                <P.Link key={c.text} href={c.href} style={{ fontSize: 8.5, marginTop: 2, color: base.text }}>
                  {c.text}
                </P.Link>
              ) : (
                <P.Text key={c.text} style={{ fontSize: 8.5, marginTop: 2 }}>
                  {c.text}
                </P.Text>
              ),
            )}
          </P.View>
        ) : null}
        {sections.filter((s) => SIDE.includes(s)).map((s) => renderSection(P, data, s, side))}
      </P.View>
      <P.View style={{ flex: 1, paddingTop: 40, paddingLeft: 24, paddingRight: 36 }}>
        <P.View style={{ marginBottom: 18 }}>
          <P.Text style={{ fontSize: 24, fontWeight: BOLD, color: '#0f172a' }}>{name(data)}</P.Text>
          {data.personal.headline ? <P.Text style={{ fontSize: 11.5, color: style.accentColor, marginTop: 3 }}>{data.personal.headline}</P.Text> : null}
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
    size: 9.5,
    accent: style.accentColor,
    text: '#27272a',
    muted: '#71717a',
    gap: 16,
    skills: 'inline',
    title: () => null,
  };
  return (
    <P.Page style={{ fontFamily: family, fontSize: theme.size, color: theme.text, lineHeight: 1.4, paddingTop: 52, paddingBottom: 48, paddingHorizontal: 54 }}>
      <P.View style={{ marginBottom: 26 }}>
        <P.Text style={{ fontSize: 27, color: '#18181b', letterSpacing: -0.3 }}>{name(data)}</P.Text>
        {data.personal.headline ? <P.Text style={{ fontSize: 11, color: style.accentColor, marginTop: 4 }}>{data.personal.headline}</P.Text> : null}
        <Contacts P={P} data={data} color={theme.muted} size={8.5} />
      </P.View>
      {visibleSections(data).map((s) => (
        <P.View key={s} style={{ flexDirection: 'row', borderTopWidth: 0.6, borderTopStyle: 'solid', borderTopColor: '#e4e4e7', paddingTop: 10, marginBottom: 10 }}>
          <P.Text style={{ width: 96, fontSize: 8, fontWeight: BOLD, letterSpacing: 1, textTransform: 'uppercase', color: style.accentColor, paddingRight: 8 }}>
            {SECTION_LABEL[s]}
          </P.Text>
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
    size: 9.5,
    accent: style.accentColor,
    text: '#1f2937',
    muted: '#64748b',
    gap: 14,
    skills: 'grid',
    title: (label) => (
      <P.Text style={{ fontSize: 10.5, fontWeight: BOLD, color: '#0f172a', marginBottom: 6, paddingBottom: 3, borderBottomWidth: 1.5, borderBottomStyle: 'solid', borderBottomColor: style.accentColor }}>
        {label}
      </P.Text>
    ),
  };
  const certTheme: Theme = { ...theme, onDark: true, muted: 'rgba(255,255,255,0.75)', text: '#ffffff', title: () => null };
  const certs = data.certifications.filter((c) => c.name);
  const sections = visibleSections(data).filter((s) => s !== 'certifications');
  return (
    <P.Page style={{ fontFamily: family, fontSize: theme.size, color: theme.text, lineHeight: 1.35, paddingTop: 36, paddingBottom: 44, paddingHorizontal: 40 }}>
      <P.View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
        <P.View style={{ flex: 1 }}>
          <P.Text style={{ fontSize: 24, fontWeight: BOLD, color: '#0f172a' }}>{name(data)}</P.Text>
          {data.personal.headline ? <P.Text style={{ fontSize: 12, fontWeight: BOLD, color: style.accentColor, marginTop: 2 }}>{data.personal.headline}</P.Text> : null}
        </P.View>
      </P.View>
      <P.View style={{ borderTopWidth: 3, borderTopStyle: 'solid', borderTopColor: style.accentColor, paddingTop: 6, marginBottom: 14 }}>
        <Contacts P={P} data={data} color={theme.muted} size={8.5} />
      </P.View>
      {certs.length ? (
        <P.View wrap={false} style={{ backgroundColor: style.accentColor, borderRadius: 6, padding: 12, marginBottom: 16, color: '#ffffff' }}>
          <P.Text style={{ fontSize: 9, fontWeight: BOLD, letterSpacing: 1.1, textTransform: 'uppercase', color: '#ffffff', marginBottom: 6 }}>
            Licences and certificates
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
    text: '#1f2937',
    muted: '#64748b',
    gap: 9,
    skills: 'inline',
    title: (label) => (
      <P.Text style={{ fontSize: 8.5, fontWeight: BOLD, letterSpacing: 1, textTransform: 'uppercase', color: style.accentColor, marginBottom: 4 }}>{label}</P.Text>
    ),
  };
  const sections = visibleSections(data);
  const left: ResumeSection[] = ['summary', 'experience', 'projects'];
  return (
    <P.Page style={{ fontFamily: family, fontSize: theme.size, color: theme.text, lineHeight: 1.3, paddingTop: 30, paddingBottom: 38, paddingHorizontal: 34 }}>
      <P.View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, paddingBottom: 8, marginBottom: 10, borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: style.accentColor }}>
        <P.View style={{ flex: 1 }}>
          <P.Text style={{ fontSize: 19, fontWeight: BOLD, color: '#0f172a' }}>{name(data)}</P.Text>
          {data.personal.headline ? <P.Text style={{ fontSize: 10, color: style.accentColor, marginTop: 1 }}>{data.personal.headline}</P.Text> : null}
        </P.View>
        <P.View style={{ width: 190, alignItems: 'flex-end' }}>
          {contactItems(data.personal).map((c) => (
            <P.Text key={c.text} style={{ fontSize: 8, color: theme.muted, textAlign: 'right' }}>
              {c.text}
            </P.Text>
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
  const s: RStyle = { fontFamily: family, fontSize: 10, color: '#1f2937', lineHeight: 1.5, paddingTop: 48, paddingBottom: 48, paddingHorizontal: 56 };
  return (
    <P.Page style={s}>
      <P.View style={{ borderBottomWidth: 2, borderBottomStyle: 'solid', borderBottomColor: style.accentColor, paddingBottom: 10, marginBottom: 22 }}>
        <P.Text style={{ fontSize: 22, fontWeight: BOLD, color: '#0f172a' }}>{letter.fullName || 'Your Name'}</P.Text>
        {contacts.length ? <P.Text style={{ fontSize: 9, color: '#64748b', marginTop: 3 }}>{contacts.join('  ·  ')}</P.Text> : null}
      </P.View>
      {letter.date ? <P.Text style={{ marginBottom: 12, color: '#64748b' }}>{letter.date}</P.Text> : null}
      {letter.recipient || letter.company ? (
        <P.View style={{ marginBottom: 16 }}>
          {letter.recipient ? <P.Text>{letter.recipient}</P.Text> : null}
          {letter.company ? <P.Text style={{ fontWeight: BOLD }}>{letter.company}</P.Text> : null}
        </P.View>
      ) : null}
      {letter.jobTitle ? <P.Text style={{ fontWeight: BOLD, color: style.accentColor, marginBottom: 12 }}>{`Re: ${letter.jobTitle}`}</P.Text> : null}
      {letter.body
        .split(/\n{2,}/)
        .filter((p) => p.trim())
        .map((p, i) => (
          <P.Text key={i} style={{ marginBottom: 10 }}>
            {p.trim()}
          </P.Text>
        ))}
      {letter.fullName ? <P.Text style={{ marginTop: 6, fontWeight: BOLD }}>{letter.fullName}</P.Text> : null}
      <Footer P={P} branding={branding} />
    </P.Page>
  );
}

'use client';

import { createContext, useContext, type ComponentProps, type CSSProperties, type ReactNode } from 'react';

/**
 * Templates are written once against these primitives. In "html" mode they render
 * divs for the live preview; in "pdf" mode they render @react-pdf elements.
 * Numbers in styles are points (pt) in both modes, so the two stay in step.
 */
export type RStyle = Record<string, string | number | undefined>;

export type Prims = {
  mode: 'html' | 'pdf';
  Page: (p: { style?: RStyle; children: ReactNode }) => ReactNode;
  View: (p: { style?: RStyle; children?: ReactNode; fixed?: boolean; wrap?: boolean }) => ReactNode;
  Text: (p: { style?: RStyle; children?: ReactNode; fixed?: boolean }) => ReactNode;
  Link: (p: { style?: RStyle; href: string; children: ReactNode }) => ReactNode;
};

export const PAGE_WIDTH_PT = 595.28;
export const PAGE_HEIGHT_PT = 841.89;
export const PT_TO_PX = 96 / 72;

const UNITLESS = new Set(['lineHeight', 'flex', 'flexGrow', 'flexShrink', 'opacity', 'fontWeight', 'zIndex']);

export function toCss(style: RStyle = {}): CSSProperties {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(style)) {
    if (value === undefined) continue;
    out[key] = typeof value === 'number' && !UNITLESS.has(key) ? `${value}pt` : value;
  }
  return out as CSSProperties;
}

const InText = createContext(false);

function HtmlText({ style, children }: { style?: RStyle; children?: ReactNode }) {
  const nested = useContext(InText);
  const css = toCss(style);
  return (
    <InText.Provider value>
      {nested ? (
        <span style={css}>{children}</span>
      ) : (
        <div style={{ margin: 0, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap', ...css }}>{children}</div>
      )}
    </InText.Provider>
  );
}

export const htmlPrims: Prims = {
  mode: 'html',
  Page: ({ style, children }) => (
    <div
      style={{
        position: 'relative',
        width: `${PAGE_WIDTH_PT}pt`,
        minHeight: `${PAGE_HEIGHT_PT}pt`,
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        ...toCss(style),
      }}
    >
      {children}
    </div>
  ),
  View: ({ style, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', boxSizing: 'border-box', minWidth: 0, ...toCss(style) }}>{children}</div>
  ),
  Text: HtmlText,
  // Previews often sit inside a clickable card, so links are plain text on screen; the PDF keeps real links.
  Link: ({ style, children }) => <span style={{ display: 'block', ...toCss(style) }}>{children}</span>,
};

/** Builds PDF primitives from the lazily-loaded @react-pdf/renderer module. */
export function makePdfPrims(lib: typeof import('@react-pdf/renderer')): Prims {
  const { Page, View, Text, Link } = lib;
  type PdfStyle = NonNullable<ComponentProps<typeof View>['style']>;
  const s = (style?: RStyle) => (style ?? {}) as PdfStyle;
  // react-pdf inherits line height as an absolute value from the page's body size, so larger text
  // (names, headlines) would overlap the next line. Give any sized text a line height of its own.
  // A unitless line height on text without its own size is resolved differently from CSS, so such
  // text simply keeps the page's spacing.
  const text = (style?: RStyle) => {
    if (!style) return s(style);
    if (style.fontSize !== undefined) return s(style.lineHeight === undefined ? { ...style, lineHeight: 1.25 } : style);
    if (style.lineHeight !== undefined) {
      const rest = { ...style };
      delete rest.lineHeight;
      return s(rest);
    }
    return s(style);
  };
  return {
    mode: 'pdf',
    Page: ({ style, children }) => (
      <Page size="A4" style={s(style)}>
        {children}
      </Page>
    ),
    View: ({ style, children, fixed, wrap }) => (
      <View style={s(style)} fixed={fixed} wrap={wrap}>
        {children}
      </View>
    ),
    Text: ({ style, children, fixed }) => (
      <Text style={text(style)} fixed={fixed}>
        {children}
      </Text>
    ),
    Link: ({ style, href, children }) => (
      <Link src={href} style={{ textDecoration: 'none', ...text(style) }}>
        {children}
      </Link>
    ),
  };
}

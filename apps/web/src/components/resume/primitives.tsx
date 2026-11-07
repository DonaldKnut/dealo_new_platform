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
  /** Vector drawing for CV icons and header art; sizes are in points like everything else. */
  Svg: (p: { width: number; height: number; viewBox: string; style?: RStyle; children: ReactNode }) => ReactNode;
  Path: (p: SvgShape & { d: string }) => ReactNode;
  Circle: (p: SvgShape & { cx: number; cy: number; r: number }) => ReactNode;
};

type SvgShape = { stroke?: string; strokeWidth?: number; fill?: string; opacity?: number };

export const PAGE_WIDTH_PT = 595.28;
export const PAGE_HEIGHT_PT = 841.89;
export const PT_TO_PX = 96 / 72;

const UNITLESS = new Set(['lineHeight', 'flex', 'flexGrow', 'flexShrink', 'opacity', 'fontWeight', 'zIndex']);

/** react-pdf shorthands that CSS does not have; a specific side (e.g. paddingLeft) still wins. */
const SHORTHANDS: Record<string, [string, string]> = {
  paddingHorizontal: ['paddingLeft', 'paddingRight'],
  paddingVertical: ['paddingTop', 'paddingBottom'],
  marginHorizontal: ['marginLeft', 'marginRight'],
  marginVertical: ['marginTop', 'marginBottom'],
};

export function toCss(style: RStyle = {}): CSSProperties {
  const out: Record<string, string | number> = {};
  const unit = (key: string, value: string | number) => (typeof value === 'number' && !UNITLESS.has(key) ? `${value}pt` : value);
  for (const [key, value] of Object.entries(style)) {
    const sides = SHORTHANDS[key];
    if (value === undefined || !sides) continue;
    for (const side of sides) out[side] = unit(side, value);
  }
  for (const [key, value] of Object.entries(style)) {
    if (value === undefined || SHORTHANDS[key]) continue;
    out[key] = unit(key, value);
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
  Svg: ({ width, height, viewBox, style, children }) => (
    <svg width={`${width}pt`} height={`${height}pt`} viewBox={viewBox} style={{ flexShrink: 0, ...toCss(style) }} aria-hidden>
      {children}
    </svg>
  ),
  Path: ({ d, stroke, strokeWidth, fill = 'none', opacity }) => (
    <path d={d} stroke={stroke} strokeWidth={strokeWidth} fill={fill} opacity={opacity} strokeLinecap="round" strokeLinejoin="round" />
  ),
  Circle: ({ cx, cy, r, stroke, strokeWidth, fill = 'none', opacity }) => (
    <circle cx={cx} cy={cy} r={r} stroke={stroke} strokeWidth={strokeWidth} fill={fill} opacity={opacity} />
  ),
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
    Svg: ({ width, height, viewBox, style, children }) => (
      <lib.Svg width={width} height={height} viewBox={viewBox} style={s(style)}>
        {children}
      </lib.Svg>
    ),
    Path: ({ d, stroke, strokeWidth, fill = 'none', opacity }) => (
      <lib.Path d={d} stroke={stroke} strokeWidth={strokeWidth} fill={fill} opacity={opacity} strokeLinecap="round" strokeLinejoin="round" />
    ),
    Circle: ({ cx, cy, r, stroke, strokeWidth, fill = 'none', opacity }) => (
      <lib.Circle cx={cx} cy={cy} r={r} stroke={stroke} strokeWidth={strokeWidth} fill={fill} opacity={opacity} />
    ),
  };
}

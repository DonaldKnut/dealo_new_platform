import type { ResumeArt, ResumeSection } from '@dealo/shared';
import { Fragment } from 'react';

import type { Prims } from './primitives';
import type { ContactItem } from './resume-content';

/** Simple 24×24 line icons (Lucide-style) drawn as plain paths so they render the same on screen and in the PDF. */
const ICONS = {
  email: ['M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z', 'm22 7-10 7L2 7'],
  phone: [
    'M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z',
  ],
  location: ['M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z', 'M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  linkedin: ['M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z', 'M2 9h4v12H2z', 'M4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'],
  website: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M2 12h20', 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'],
  summary: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  experience: ['M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16', 'M4 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z'],
  education: ['M22 10 12 5 2 10l10 5 10-5z', 'M6 12v5c3 3 9 3 12 0v-5'],
  skills: ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'],
  certifications: ['M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M8.21 13.89 7 23l5-3 5 3-1.21-9.12'],
  languages: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M2 12h20', 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'],
  projects: ['M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z'],
  references: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
} satisfies Record<ContactItem['kind'] | ResumeSection, string[]>;

export type CvIconName = keyof typeof ICONS;

export function CvIcon({ P, name, size, color, style }: { P: Prims; name: CvIconName; size: number; color: string; style?: Record<string, string | number> }) {
  return (
    <P.Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      {ICONS[name].map((d) => (
        <P.Path key={d} d={d} stroke={color} strokeWidth={2} />
      ))}
    </P.Svg>
  );
}

export const RESUME_ART_OPTIONS: Array<{ id: ResumeArt; name: string }> = [
  { id: 'none', name: 'None' },
  { id: 'waves', name: 'Waves' },
  { id: 'dots', name: 'Dots' },
  { id: 'rings', name: 'Rings' },
  { id: 'leaf', name: 'Leaves' },
];

/** A soft illustration in the top-right corner of the first page, in the CV's accent colour. */
export function HeaderArt({ P, art, color, width = 190 }: { P: Prims; art: ResumeArt; color: string; width?: number }) {
  if (art === 'none') return null;
  const height = width * 0.62;
  const shapes = (() => {
    switch (art) {
      case 'waves':
        return [0, 1, 2, 3].map((i) => (
          <P.Path key={i} d={`M${20 + i * 14} 0 C ${60 + i * 14} ${40 + i * 6}, ${120 + i * 10} ${10 + i * 8}, 200 ${70 + i * 12}`} stroke={color} strokeWidth={2.2} opacity={0.32 - i * 0.05} />
        ));
      case 'dots':
        return Array.from({ length: 6 * 9 }, (_, i) => {
          const col = i % 9;
          const row = Math.floor(i / 9);
          const fade = Math.max(0.05, 0.42 - (row + (8 - col) * 0.6) * 0.045);
          return <P.Circle key={i} cx={52 + col * 17} cy={10 + row * 17} r={2.6} fill={color} opacity={fade} />;
        });
      case 'rings':
        return [26, 44, 62, 80].map((r, i) => <P.Circle key={r} cx={196} cy={4} r={r} stroke={color} strokeWidth={2} opacity={0.34 - i * 0.06} />);
      case 'leaf':
        return (
          <Fragment>
            <P.Path d="M200 0 C 150 10, 118 46, 128 104 C 176 90, 200 52, 200 0 Z" fill={color} opacity={0.16} />
            <P.Path d="M200 0 C 168 34, 148 64, 128 104" stroke={color} strokeWidth={1.6} opacity={0.35} />
            <P.Path d="M170 0 C 130 8, 98 30, 100 64 C 140 58, 162 34, 170 0 Z" fill={color} opacity={0.1} />
            <P.Circle cx={92} cy={96} r={5} fill={color} opacity={0.22} />
          </Fragment>
        );
    }
  })();
  return (
    <P.View style={{ position: 'absolute', top: 0, right: 0, width, height }}>
      <P.Svg width={width} height={height} viewBox="0 0 200 124">
        {shapes}
      </P.Svg>
    </P.View>
  );
}

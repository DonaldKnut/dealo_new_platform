import { ImageResponse } from 'next/og';

const SIZES = new Set([192, 512]);

export function generateStaticParams() {
  return [{ size: '192' }, { size: '512' }];
}

export async function GET(request: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: raw } = await params;
  const size = SIZES.has(Number(raw)) ? Number(raw) : 192;
  const maskable = new URL(request.url).searchParams.has('maskable');
  // Maskable icons keep the mark inside the central 80% safe zone.
  const inset = maskable ? size * 0.2 : size * 0.12;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: maskable ? '#0f766e' : 'linear-gradient(145deg, #0f766e, #071f14)',
          borderRadius: maskable ? 0 : size * 0.22,
        }}
      >
        <div
          style={{
            width: size - inset * 2,
            height: size - inset * 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: size * 0.18,
            background: 'rgba(255,255,255,0.08)',
            border: `${Math.max(2, size * 0.012)}px solid rgba(168,255,112,0.55)`,
            color: '#a8ff70',
            fontSize: size * 0.48,
            fontWeight: 800,
            letterSpacing: -size * 0.02,
          }}
        >
          D
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}

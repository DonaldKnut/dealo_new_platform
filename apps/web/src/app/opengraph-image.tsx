import { ImageResponse } from 'next/og';

export const alt = 'Dealo — hire checked office staff and skilled trades in Nigeria and Africa';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: 'linear-gradient(140deg, #0b3324 0%, #071f14 55%, #0a2a1b 100%)',
          color: '#eaffdf',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: '#7cff4d',
              color: '#071f14',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 44,
              fontWeight: 800,
            }}
          >
            D
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 40, fontWeight: 800 }}>Dealo</span>
            <span style={{ fontSize: 20, color: '#9cbc9a', letterSpacing: 4 }}>TALENT NETWORK</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <span style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.05, maxWidth: 900 }}>
            Hire checked people. Fast.
          </span>
          <span style={{ fontSize: 30, color: '#b9d8b4', maxWidth: 920 }}>
            Office staff and skilled trades in Nigeria and across Africa. Shortlist in 48 hours.
          </span>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          {['AI + human checks', '90-day replacement', 'Lagos · Abuja · Africa'].map((label) => (
            <div
              key={label}
              style={{
                display: 'flex',
                padding: '12px 22px',
                borderRadius: 999,
                border: '2px solid rgba(124,255,77,0.45)',
                color: '#a8ff70',
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}

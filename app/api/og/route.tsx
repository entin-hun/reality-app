import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Paraméterek
    const title = searchParams.get('title') || 'Elite Fight Universe';
    const subtitle = searchParams.get('subtitle') || 'Új lehetőség a harcosoknak';
    const type = searchParams.get('type') || 'default';

    // EFU brand színek
    const brandRed = '#DC2626';
    const brandDark = '#0A0A0A';
    const brandGold = '#D4AF37';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: brandDark,
            backgroundImage: `
              linear-gradient(135deg, ${brandDark} 0%, #1a1a1a 50%, ${brandDark} 100%),
              radial-gradient(circle at 20% 50%, rgba(220, 38, 38, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(212, 175, 55, 0.1) 0%, transparent 50%)
            `,
            padding: '60px',
          }}
        >
          {/* Háttér hexagon minta */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.05,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpolygon points='50 5 95 27.5 95 72.5 50 95 5 72.5 5 27.5' fill='none' stroke='%23DC2626' stroke-width='2'/%3E%3C/svg%3E")`,
              backgroundSize: '100px 100px',
            }}
          />

          {/* Tartalom */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              maxWidth: '1000px',
            }}
          >
            {/* EFU Logo szöveg */}
            <div
              style={{
                fontSize: '72px',
                fontWeight: 900,
                color: 'white',
                letterSpacing: '-2px',
                marginBottom: '20px',
                textTransform: 'uppercase',
                textShadow: `0 0 40px ${brandRed}`,
              }}
            >
              EFU
            </div>

            {/* Cím */}
            <div
              style={{
                fontSize: type === 'fighter' ? '56px' : '64px',
                fontWeight: 900,
                color: 'white',
                textAlign: 'center',
                lineHeight: 1.1,
                marginBottom: '30px',
                textTransform: 'uppercase',
                letterSpacing: '-1px',
              }}
            >
              {title}
            </div>

            {/* Alcím */}
            {subtitle && (
              <div
                style={{
                  fontSize: '32px',
                  color: '#9CA3AF',
                  textAlign: 'center',
                  lineHeight: 1.4,
                  maxWidth: '800px',
                }}
              >
                {subtitle}
              </div>
            )}

            {/* Típus badge */}
            {type !== 'default' && (
              <div
                style={{
                  marginTop: '40px',
                  padding: '12px 32px',
                  backgroundColor: `${brandRed}20`,
                  border: `2px solid ${brandRed}`,
                  borderRadius: '9999px',
                  fontSize: '24px',
                  fontWeight: 700,
                  color: brandRed,
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                }}
              >
                {type === 'fighter' && 'Harcos'}
                {type === 'event' && 'Esemény'}
                {type === 'reality' && 'Reality'}
                {type === 'news' && 'Hír'}
              </div>
            )}
          </div>

          {/* Alsó sáv */}
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              left: '60px',
              right: '60px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '20px',
              color: '#6B7280',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: brandRed,
                }}
              />
              <span>elitefightuniverse.com</span>
            </div>
            <div style={{ color: brandGold, fontWeight: 600 }}>
              #EFU
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.error('OG image generation error:', e);
    return new Response(`Failed to generate image: ${e.message}`, {
      status: 500,
    });
  }
}

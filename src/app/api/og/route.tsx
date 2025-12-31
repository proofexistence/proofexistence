import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const title = searchParams.get('title') || 'Proof of Existence';
    const date = searchParams.get('date') || '2026';
    const id = searchParams.get('id');

    return new ImageResponse(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'black',
          backgroundImage:
            'radial-gradient(circle at 25% 25%, #2a2a2a 0%, #000 50%)',
          color: 'white',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Background Glow */}
        <div
          style={{
            position: 'absolute',
            top: '-200px',
            left: '-200px',
            width: '600px',
            height: '600px',
            background: 'rgba(168, 85, 247, 0.2)',
            filter: 'blur(100px)',
            borderRadius: '50%',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          {/* Logo / Icon */}
          <div
            style={{
              fontSize: 60,
              marginBottom: 20,
              background: 'linear-gradient(to bottom right, #a855f7, #ec4899)',
              backgroundClip: 'text',
              color: 'transparent',
              fontWeight: 900,
            }}
          >
            POE 2026
          </div>

          <div
            style={{
              fontSize: 80,
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: 10,
              padding: '0 40px',
              lineHeight: 1.1,
              textShadow: '0 0 40px rgba(255,255,255,0.3)',
            }}
          >
            {title}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginTop: 20,
              fontSize: 30,
              color: '#888',
            }}
          >
            {date} {id ? `• #${id.slice(0, 8)}` : ''}
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 20,
            color: '#444',
          }}
        >
          proofexistence.com
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: unknown) {
    console.log(`${(e as Error).message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Fetch session data for dynamic OG images
async function getSessionData(id: string) {
  try {
    // Use absolute URL for edge runtime
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || 'https://www.proofexistence.com';
    const res = await fetch(`${baseUrl}/api/sessions/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    // If we have an ID or image param, try to get session data
    if (id || searchParams.get('image')) {
      let session = null;

      // Priority: Construct from params if title is provided (avoids fetch)
      if (searchParams.get('title')) {
        session = {
          id: id || 'preview',
          createdAt: searchParams.get('date') || new Date().toISOString(),
          title: searchParams.get('title'),
          user: {
            name: searchParams.get('author') || 'Anonymous',
            username: searchParams.get('author'), // Fallback
          },
          duration: searchParams.get('duration'),
          message: searchParams.get('message'),
          previewUrl: searchParams.get('image'),
          status: searchParams.get('status'),
        };
      } else if (id) {
        // Fallback: Fetch if only ID is provided
        session = await getSessionData(id);
      }

      if (session) {
        let date = 'Unknown Date';
        try {
          date = new Date(session.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
        } catch (e) {
          console.error('[OG] Date parsing error:', e);
        }

        const displayTitle =
          session.title ||
          `Proof #${String(session.id || 'unknown').slice(0, 8)}`;
        const authorName =
          session.user?.name || session.user?.username || 'Anonymous';
        const duration = session.duration ? `${session.duration}s` : '';
        const message = session.message || '';
        const previewUrl = session.previewUrl;

        return new ImageResponse(
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              backgroundColor: '#000',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Background - Trail Preview or Gradient */}
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt=""
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: 0.6,
                }}
              />
            ) : (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background:
                    'radial-gradient(circle at 30% 40%, #1a1a2e 0%, #000 60%)',
                }}
              />
            )}

            {/* Overlay Gradient */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background:
                  'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 60%, rgba(0,0,0,0.95) 100%)',
              }}
            />

            {/* Purple Glow */}
            <div
              style={{
                position: 'absolute',
                top: '-100px',
                left: '-100px',
                width: '400px',
                height: '400px',
                background: 'rgba(168, 85, 247, 0.15)',
                filter: 'blur(80px)',
                borderRadius: '50%',
              }}
            />

            {/* Content */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                width: '100%',
                height: '100%',
                padding: '60px',
                position: 'relative',
              }}
            >
              {/* Top Right - POE Logo */}
              <div
                style={{
                  position: 'absolute',
                  top: '40px',
                  right: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: 900,
                    background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                    backgroundClip: 'text',
                    color: 'transparent',
                    fontFamily: 'sans-serif',
                  }}
                >
                  POE 2026
                </div>
              </div>

              {/* Status Badge */}
              {session.status === 'MINTED' && (
                <div
                  style={{
                    position: 'absolute',
                    top: '40px',
                    left: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    background: 'rgba(168, 85, 247, 0.2)',
                    borderRadius: '20px',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                  }}
                >
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#22c55e',
                    }}
                  />
                  <span
                    style={{
                      color: '#d8b4fe',
                      fontSize: '16px',
                      fontWeight: 600,
                    }}
                  >
                    NFT MINTED
                  </span>
                </div>
              )}

              {/* Bottom Content */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                {/* Title */}
                <div
                  style={{
                    fontSize: '56px',
                    fontWeight: 'bold',
                    color: 'white',
                    lineHeight: 1.1,
                    textShadow: '0 4px 20px rgba(0,0,0,0.5)',
                    maxWidth: '900px',
                  }}
                >
                  {displayTitle}
                </div>

                {/* Message */}
                {message && (
                  <div
                    style={{
                      fontSize: '24px',
                      color: 'rgba(216, 180, 254, 0.9)',
                      fontStyle: 'italic',
                      maxWidth: '800px',
                      lineHeight: 1.4,
                    }}
                  >
                    &ldquo;{message}&rdquo;
                  </div>
                )}

                {/* Meta Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '24px',
                    marginTop: '8px',
                  }}
                >
                  {/* Author */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <span
                      style={{
                        color: 'white',
                        fontSize: '22px',
                        fontWeight: 500,
                      }}
                    >
                      by {authorName}
                    </span>
                  </div>

                  <span
                    style={{ color: 'rgba(255,255,255,0.3)', fontSize: '22px' }}
                  >
                    •
                  </span>

                  {/* Date */}
                  <span
                    style={{ color: 'rgba(255,255,255,0.7)', fontSize: '22px' }}
                  >
                    {date}
                  </span>

                  {duration && (
                    <>
                      <span
                        style={{
                          color: 'rgba(255,255,255,0.3)',
                          fontSize: '22px',
                        }}
                      >
                        •
                      </span>
                      <span
                        style={{
                          color: 'rgba(255,255,255,0.7)',
                          fontSize: '22px',
                        }}
                      >
                        {duration}
                      </span>
                    </>
                  )}
                </div>

                {/* URL */}
                <div
                  style={{
                    fontSize: '18px',
                    color: 'rgba(255,255,255,0.4)',
                    marginTop: '12px',
                    fontFamily: 'monospace',
                  }}
                >
                  proofexistence.com
                </div>
              </div>
            </div>
          </div>,
          {
            width: 1200,
            height: 630,
          }
        );
      }
    }

    // Fallback: Generic POE image
    const title = searchParams.get('title') || 'Proof of Existence';
    const date = searchParams.get('date') || '2026';

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
            'radial-gradient(circle at 25% 25%, #1a1a2e 0%, #000 50%)',
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
          {/* Logo */}
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
              fontSize: 72,
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
              fontSize: 28,
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
  } catch (error) {
    console.error('[OG Route] Error generating image:', error);
    return new Response(
      `Failed to generate the image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      {
        status: 500,
      }
    );
  }
}

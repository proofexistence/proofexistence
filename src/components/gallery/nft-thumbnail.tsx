'use client';

import { useState, useEffect } from 'react';

interface NFTThumbnailProps {
  ipfsHash: string;
  alt: string;
}

export function NFTThumbnail({ ipfsHash, alt }: NFTThumbnailProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchImage = async () => {
      try {
        // Fetch metadata from Irys gateway
        const metadataUrl = `https://gateway.irys.xyz/${ipfsHash}`;
        const res = await fetch(metadataUrl, { next: { revalidate: 86400 } }); // Cache 1 day
        if (!res.ok) return;

        const data = await res.json();
        if (data.image && mounted) {
          setSrc(
            data.image
              .replace('ar://', 'https://gateway.irys.xyz/')
              .replace('https://arweave.net/', 'https://gateway.irys.xyz/')
          );
        }
      } catch {
        // Ignore errors
      }
    };

    fetchImage();
    return () => {
      mounted = false;
    };
  }, [ipfsHash]);

  if (!src) {
    // Placeholder while loading or error
    return <div className="absolute inset-0 bg-white/5 animate-pulse" />;
  }

  return (
    <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110">
      {/* Use standard img tag for external URLs to avoid Next.js Image config requirement for every gateway */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );
}

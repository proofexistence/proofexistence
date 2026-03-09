'use client';

import { useState, useEffect } from 'react';

interface NFTThumbnailProps {
  ipfsHash: string;
  alt: string;
}

/**
 * Extract Arweave transaction ID from various URL formats
 */
function extractTxId(url: string): string | null {
  // Already a bare txId
  if (/^[a-zA-Z0-9_-]{43}$/.test(url)) return url;
  // ar://txId
  if (url.startsWith('ar://')) return url.slice(5);
  // https://gateway.example.com/txId
  const match = url.match(/\/([a-zA-Z0-9_-]{43})$/);
  return match ? match[1] : null;
}

export function NFTThumbnail({ ipfsHash, alt }: NFTThumbnailProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchImage = async () => {
      try {
        // Fetch metadata through server-side proxy (avoids client DNS issues with Arweave gateways)
        const res = await fetch(`/api/arweave/${ipfsHash}`);
        if (!res.ok) return;

        const data = await res.json();
        if (data.image && mounted) {
          // Extract txId from image URL and proxy it too
          const imageTxId = extractTxId(data.image);
          if (imageTxId) {
            setSrc(`/api/arweave/${imageTxId}`);
          } else {
            setSrc(data.image);
          }
        }
      } catch {
        // Failed to fetch metadata
      }
    };

    fetchImage();
    return () => {
      mounted = false;
    };
  }, [ipfsHash]);

  if (!src) {
    return <div className="absolute inset-0 bg-white/5 animate-pulse" />;
  }

  return (
    <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110">
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

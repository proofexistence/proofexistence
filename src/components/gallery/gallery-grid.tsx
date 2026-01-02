import { ProofCard } from './proof-card';

interface GalleryGridProps {
  proofs: {
    id: string;
    createdAt: string;
    status: string;
    ipfsHash: string | null;
    title?: string | null;
    message?: string | null;
    views?: number;
    likes?: number;
    userName?: string | null;
    walletAddress?: string | null;
    previewUrl?: string | null;
    hidden?: number;
  }[];
  isOwner?: boolean;
  onVisibilityChange?: () => void;
}

export function GalleryGrid({
  proofs,
  isOwner,
  onVisibilityChange,
}: GalleryGridProps) {
  if (proofs.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-white/40">No proofs found yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {proofs.map((proof) => (
        <ProofCard
          key={proof.id}
          id={proof.id}
          createdAt={new Date(proof.createdAt)}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status={proof.status as any}
          ipfsHash={proof.ipfsHash}
          previewUrl={proof.previewUrl}
          title={proof.title}
          message={proof.message}
          views={proof.views}
          likes={proof.likes}
          userName={proof.userName}
          walletAddress={proof.walletAddress}
          isOwner={isOwner}
          hidden={proof.hidden}
          onVisibilityChange={onVisibilityChange}
        />
      ))}
    </div>
  );
}

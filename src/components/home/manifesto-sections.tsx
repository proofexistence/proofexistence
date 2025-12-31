'use client';

import { motion } from 'framer-motion';

// Hook to check if element is in view (simplified for brevity, or use whileInView)

const TextSection = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20%' }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className={`min-h-[60vh] flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto ${className}`}
    >
      {children}
    </motion.div>
  );
};

const Highlight = ({ children }: { children: React.ReactNode }) => (
  <span className="text-white font-medium drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
    {children}
  </span>
);

export const ManifestoScroll = () => {
  return (
    <div className="flex flex-col w-full relative z-10">
      {/* 1. The History */}
      <TextSection>
        <h2 className="text-3xl md:text-5xl font-thin leading-tight text-zinc-300">
          History was once a luxury for the <Highlight>few</Highlight>.
        </h2>
        <p className="mt-8 text-lg md:text-xl text-zinc-500 font-light max-w-2xl">
          Kings in stone. Conquerors in epics. Poets in ink.
          <br />
          They were written into the blockchain of their time.
        </p>
      </TextSection>

      {/* 2. The Ghost */}
      <TextSection>
        <h2 className="text-3xl md:text-5xl font-thin leading-tight text-zinc-300">
          But what about <Highlight>you</Highlight>?
        </h2>
        <p className="mt-8 text-lg md:text-xl text-zinc-500 font-light max-w-2xl">
          In the digital noise, we are ghosts. <br />A server crashes, a
          platform dies, and our footprints vanish into the void.
        </p>
      </TextSection>

      {/* 3. The Solution / Epic */}
      <TextSection className="min-h-[80vh]">
        <h2 className="text-4xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white via-zinc-200 to-zinc-600 pb-2">
          Proof of Existence
          <br />
          is the modern Epic.
        </h2>
        <p className="mt-8 text-xl md:text-2xl text-zinc-400 font-light max-w-3xl leading-relaxed">
          An immutable ledger where your trace—no matter how small—is carved
          into the block, <Highlight>forever</Highlight>.
        </p>
        <div className="w-px h-24 bg-gradient-to-b from-purple-500/0 via-purple-500/50 to-purple-500/0 mt-12" />
      </TextSection>
    </div>
  );
};

export const manifestoSections = {
  ManifestoScroll,
};

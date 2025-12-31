'use client';

import { useState, useMemo } from 'react';
import { Search, X, User, Database } from 'lucide-react'; // Assuming lucide-react is available
import { CosmosTrail } from './types';

interface CosmosSearchProps {
  trails: CosmosTrail[];
  onSelect: (trail: CosmosTrail) => void;
  externalActive?: boolean;
  onToggle?: (active: boolean) => void;
}

export function CosmosSearch({
  trails,
  onSelect,
  externalActive,
  onToggle,
}: CosmosSearchProps) {
  const [query, setQuery] = useState('');
  const [internalActive, setInternalActive] = useState(false);

  const isControlled = typeof externalActive !== 'undefined';
  const active = isControlled ? externalActive : internalActive;

  const setActive = (newState: boolean) => {
    if (isControlled && onToggle) {
      onToggle(newState);
    } else {
      setInternalActive(newState);
    }
  };

  const filteredTrails = useMemo(() => {
    if (!query || query.length < 2) return [];

    // Deduplicate users: we only want to find THE user, then let them cycle their stars
    // Actually, maybe listing individual stars is fine?
    // Let's list individual stars but prioritize showing the user info.

    const lowerQuery = query.toLowerCase();
    return trails
      .filter(
        (t) =>
          (t.userName && t.userName.toLowerCase().includes(lowerQuery)) ||
          (t.walletAddress &&
            t.walletAddress.toLowerCase().includes(lowerQuery)) ||
          (t.title && t.title.toLowerCase().includes(lowerQuery))
      )
      .slice(0, 5); // Limit to 5 results
  }, [trails, query]);

  if (!active) {
    return (
      <button
        onClick={() => setActive(true)}
        className="p-2.5 bg-black/10 hover:bg-black/20 backdrop-blur-md border border-white/10 rounded-full text-white/70 transition-all hover:scale-105 active:scale-95 touch-manipulation hover:border-white/20 shadow-lg shadow-black/20"
        aria-label="Search Cosmos"
      >
        <Search className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-[calc(100vw-2rem)] md:w-full md:max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-200 origin-top-left">
      <div className="relative group">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-white/40 group-focus-within:text-cyan-400 transition-colors" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stars, users..."
          className="w-full bg-black/80 border border-white/10 focus:border-cyan-500/50 rounded-xl py-3 pl-10 pr-10 text-base md:text-sm text-white placeholder:text-white/20 outline-none backdrop-blur-md shadow-2xl shadow-black/50 transition-all"
          autoFocus
        />
        <button
          onClick={() => {
            setActive(false);
            setQuery('');
          }}
          className="absolute inset-y-0 right-3 flex items-center text-white/40 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {query.length >= 2 && (
        <div className="bg-black/90 border border-white/10 rounded-xl overflow-hidden backdrop-blur-xl shadow-2xl flex flex-col">
          {filteredTrails.length === 0 ? (
            <div className="p-4 text-center text-white/30 text-xs">
              No signals found in the void.
            </div>
          ) : (
            filteredTrails.map((trail) => (
              <button
                key={trail.id}
                onClick={() => {
                  onSelect(trail);
                  setQuery(''); // Clear query but keep active? Or close?
                  // active state might need to be managed by parent if we want to hide it
                }}
                className="flex items-start gap-3 p-3 text-left hover:bg-white/5 transition-colors border-b last:border-0 border-white/5 group"
              >
                <div className="mt-1 p-1.5 rounded-lg bg-white/5 group-hover:bg-cyan-500/20 group-hover:text-cyan-400 text-white/40 transition-colors">
                  {trail.userName ? (
                    <User className="w-3 h-3" />
                  ) : (
                    <Database className="w-3 h-3" />
                  )}
                </div>
                <div>
                  <div className="text-white text-sm font-medium leading-none mb-1 group-hover:text-cyan-100 transition-colors">
                    {trail.title || 'Untitled Time'}
                  </div>
                  <div className="text-white/40 text-[10px] font-mono">
                    {trail.userName ||
                      (trail.walletAddress
                        ? `${trail.walletAddress.slice(0, 6)}...`
                        : 'Unknown')}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

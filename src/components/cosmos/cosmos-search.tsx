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
        className="flex items-center gap-2 px-4 py-2.5 bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/10 rounded-full text-white/60 hover:text-white/80 transition-all active:scale-95 touch-manipulation hover:border-white/20 shadow-lg shadow-black/30"
        aria-label="Search Cosmos"
      >
        <Search className="w-4 h-4" />
        <span className="text-sm hidden sm:inline">Search</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full md:w-80 animate-in fade-in duration-150">
      <div className="relative group">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-white/40 group-focus-within:text-cyan-400 transition-colors" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stars, users..."
          className="w-full bg-black/60 backdrop-blur-xl border border-white/20 focus:border-cyan-500/50 rounded-full py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-white/30 outline-none shadow-xl shadow-black/40 transition-all"
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
        <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
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
                  setQuery('');
                }}
                className="flex items-center gap-3 w-full p-3 text-left hover:bg-white/5 active:bg-white/10 transition-colors border-b last:border-0 border-white/5 group"
              >
                <div className="p-2 rounded-full bg-white/5 group-hover:bg-cyan-500/20 text-white/40 group-hover:text-cyan-400 transition-colors">
                  {trail.userName ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Database className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate group-hover:text-cyan-100 transition-colors">
                    {trail.title || 'Untitled Time'}
                  </div>
                  <div className="text-white/40 text-xs font-mono truncate">
                    {trail.userName ||
                      (trail.walletAddress
                        ? `${trail.walletAddress.slice(0, 6)}...${trail.walletAddress.slice(-4)}`
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

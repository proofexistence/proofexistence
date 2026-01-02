'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { GalleryGrid } from '@/components/gallery/gallery-grid';
import { PageHeader } from '@/components/layout/page-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, Loader2 } from 'lucide-react';

interface Proof {
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
}

interface ExploreClientProps {
  initialProofs: Proof[];
  initialTotal: number;
}

export function ExploreClient({
  initialProofs,
  initialTotal,
}: ExploreClientProps) {
  const [proofs, setProofs] = useState<Proof[]>(initialProofs);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [timeframe, setTimeframe] = useState('all');

  const observerTarget = useRef<HTMLDivElement>(null);

  // Fetch proofs with current filters
  const fetchProofs = useCallback(
    async (pageNum: number, reset = false) => {
      if (loading) return;

      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: '20',
          ...(search && { search }),
          ...(status !== 'all' && { status }),
          ...(sortBy && { sortBy }),
          ...(timeframe !== 'all' && { timeframe }),
        });

        const response = await fetch(`/api/explore?${params}`);

        if (!response.ok) {
          throw new Error('Failed to fetch proofs');
        }

        const data = await response.json();
        const newProofs = data.proofs ?? [];

        if (reset) {
          setProofs(newProofs);
        } else {
          setProofs((prev) => [...prev, ...newProofs]);
        }

        setTotal(data.pagination?.total ?? 0);
        setHasMore(data.pagination?.hasMore ?? false);
        setPage(pageNum);
      } catch (error) {
        console.error('Error fetching proofs:', error);
      } finally {
        setLoading(false);
      }
    },
    [search, status, sortBy, timeframe, loading]
  );

  // Handle filter changes - reset to page 1
  useEffect(() => {
    setPage(1);
    fetchProofs(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, sortBy, timeframe]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          fetchProofs(page + 1, false);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, page, fetchProofs]);

  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  return (
    <div className="min-h-screen bg-transparent pt-48 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <PageHeader
            title="Global Gallery"
            description="Witness the immutable traces of existence created by people around the world. Each proof is cryptographically verified and permanently stored."
            className="mb-0"
          />

          <div className="flex gap-4">
            <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10 mb-4 md:mb-0">
              <span className="block text-2xl font-bold text-white">
                {total.toLocaleString()}
              </span>
              <span className="text-xs text-zinc-500 uppercase tracking-wider">
                Total Proofs
              </span>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <Input
              type="text"
              placeholder="Search by title, message, or creator..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-12 bg-white/5 border-white/10 text-white placeholder:text-zinc-500 h-12"
            />
          </form>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-zinc-400" />
              <span className="text-sm text-zinc-400">Filters:</span>
            </div>

            {/* Status Filter */}
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="MINTED">Minted</SelectItem>
                <SelectItem value="SETTLED">Settled</SelectItem>
              </SelectContent>
            </Select>

            {/* Timeframe Filter */}
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort By */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="popular">Most Viewed</SelectItem>
                <SelectItem value="trending">Trending</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {(search ||
              status !== 'all' ||
              sortBy !== 'recent' ||
              timeframe !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setSearchInput('');
                  setStatus('all');
                  setSortBy('recent');
                  setTimeframe('all');
                }}
                className="text-zinc-400 hover:text-white"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Gallery Grid */}
        {loading && proofs.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-white/40" />
          </div>
        ) : (
          <>
            <GalleryGrid proofs={proofs} />

            {/* Infinite Scroll Trigger */}
            {hasMore && (
              <div ref={observerTarget} className="flex justify-center py-8">
                {loading && (
                  <Loader2 className="h-6 w-6 animate-spin text-white/40" />
                )}
              </div>
            )}

            {/* No More Results */}
            {!hasMore && proofs.length > 0 && (
              <div className="text-center py-8">
                <p className="text-white/40 text-sm">
                  You&apos;ve reached the end
                </p>
              </div>
            )}

            {/* No Results */}
            {proofs.length === 0 && !loading && (
              <div className="text-center py-20">
                <p className="text-white/40">
                  No proofs found. Try adjusting your filters.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

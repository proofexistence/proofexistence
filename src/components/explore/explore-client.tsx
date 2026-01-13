'use client';

import { useState, useEffect, useRef } from 'react';
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
import { useExplore } from '@/hooks/use-explore';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('explore');

  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [timeframe, setTimeframe] = useState('all');

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useExplore({
      search,
      status,
      sortBy,
      timeframe,
    });

  const proofs = data?.pages.flatMap((page) => page.proofs) || initialProofs;
  const total = data?.pages[0]?.pagination.total ?? initialTotal;

  const observerTarget = useRef<HTMLDivElement>(null);

  // Removed fetchProofs and filter effect - handled by react-query

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
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
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
            title={t('title')}
            description={t('description')}
            className="mb-0"
          />

          <div className="flex gap-4">
            <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10 mb-4 md:mb-0">
              <span className="block text-2xl font-bold text-white">
                {total.toLocaleString()}
              </span>
              <span className="text-xs text-zinc-500 uppercase tracking-wider">
                {t('totalProofs')}
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
              placeholder={t('searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-12 bg-white/5 border-white/10 text-white placeholder:text-zinc-500 h-12"
            />
          </form>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-zinc-400" />
              <span className="text-sm text-zinc-400">{t('filters')}</span>
            </div>

            {/* Status Filter */}
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder={t('allStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatus')}</SelectItem>
                <SelectItem value="MINTED">{t('minted')}</SelectItem>
                <SelectItem value="SETTLED">{t('settled')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Timeframe Filter */}
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder={t('allTime')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allTime')}</SelectItem>
                <SelectItem value="24h">{t('last24h')}</SelectItem>
                <SelectItem value="7d">{t('last7d')}</SelectItem>
                <SelectItem value="30d">{t('last30d')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort By */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder={t('mostRecent')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">{t('mostRecent')}</SelectItem>
                <SelectItem value="popular">{t('mostViewed')}</SelectItem>
                <SelectItem value="trending">{t('trending')}</SelectItem>
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
                {t('clearFilters')}
              </Button>
            )}
          </div>
        </div>

        {/* Gallery Grid */}
        {isLoading && proofs.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-white/40" />
          </div>
        ) : (
          <>
            <GalleryGrid proofs={proofs} />

            {/* Infinite Scroll Trigger */}
            {hasNextPage && (
              <div ref={observerTarget} className="flex justify-center py-8">
                {isFetchingNextPage && (
                  <Loader2 className="h-6 w-6 animate-spin text-white/40" />
                )}
              </div>
            )}

            {/* No More Results */}
            {!hasNextPage && proofs.length > 0 && (
              <div className="text-center py-8">
                <p className="text-white/40 text-sm">{t('reachedEnd')}</p>
              </div>
            )}

            {/* No Results */}
            {proofs.length === 0 && !isLoading && (
              <div className="text-center py-20">
                <p className="text-white/40">{t('noResults')}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

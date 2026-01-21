'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

import {
  TIME_GRANULARITIES,
  formatDateByGranularity,
  type TimeGranularity,
} from './types';

interface TimelineControlsProps {
  currentDate: Date;
  granularity: TimeGranularity;
  onDateChange: (direction: 'prev' | 'next') => void;
  onDateSelect: (date: Date) => void;
  onGranularityChange: (granularity: TimeGranularity) => void;
  trailCount: number;
  isLoading?: boolean;
}

export function TimelineControls({
  currentDate,
  granularity,
  onDateChange,
  onDateSelect,
  onGranularityChange,
  trailCount,
  isLoading,
}: TimelineControlsProps) {
  const t = useTranslations('col');
  const locale = useLocale();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => ({
    year: currentDate.getFullYear(),
    month: currentDate.getMonth(),
  }));
  const calendarRef = useRef<HTMLDivElement>(null);

  // Don't allow navigating to future dates
  const now = new Date();
  const canGoNext = currentDate < now;

  // Close calendar on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setIsCalendarOpen(false);
      }
    };
    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCalendarOpen]);

  // Reset view month to current date when calendar opens
  const openCalendar = () => {
    setViewMonth({
      year: currentDate.getFullYear(),
      month: currentDate.getMonth(),
    });
    setIsCalendarOpen(true);
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const formatMonthYear = (year: number, month: number) => {
    return new Date(year, month, 1).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
    });
  };

  const handleDateClick = (day: number) => {
    const selectedDate = new Date(viewMonth.year, viewMonth.month, day);
    if (selectedDate <= now) {
      onDateSelect(selectedDate);
      setIsCalendarOpen(false);
    }
  };

  const renderCalendar = () => {
    const { year, month } = viewMonth;
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    const today = new Date();
    const isCurrentMonth = year === currentDate.getFullYear() && month === currentDate.getMonth();
    const selectedDay = isCurrentMonth ? currentDate.getDate() : null;

    return (
      <div className="grid grid-cols-7 gap-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <div key={day} className="text-center text-[10px] text-zinc-500 py-1">
            {day}
          </div>
        ))}
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="w-7 h-7" />;
          }

          const date = new Date(year, month, day);
          const isFuture = date > today;
          const isSelected = day === selectedDay;

          return (
            <button
              key={`day-${day}`}
              onClick={() => handleDateClick(day)}
              disabled={isFuture}
              className={`
                w-7 h-7 text-xs rounded-full flex items-center justify-center transition-colors
                ${isSelected
                  ? 'bg-purple-500 text-white'
                  : isFuture
                    ? 'text-zinc-600 cursor-not-allowed'
                    : 'text-white hover:bg-white/20 cursor-pointer'
                }
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Date navigation */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => onDateChange('prev')}
          disabled={isLoading}
          className="p-2 text-zinc-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Date display with calendar */}
        <div className="relative" ref={calendarRef}>
          <button
            onClick={() => isCalendarOpen ? setIsCalendarOpen(false) : openCalendar()}
            className="text-center min-w-[160px] hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="text-white text-sm font-light tracking-wide flex items-center justify-center gap-2">
              {formatDateByGranularity(currentDate, granularity, locale)}
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div className="text-zinc-500 text-[10px] font-mono">
              {isLoading ? t('loading') : t('trailCount', { count: trailCount })}
            </div>
          </button>

          {/* Calendar popup */}
          {isCalendarOpen && (
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl z-50 min-w-[240px]">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => setViewMonth((prev) => ({
                    year: prev.month === 0 ? prev.year - 1 : prev.year,
                    month: prev.month === 0 ? 11 : prev.month - 1,
                  }))}
                  className="p-1 text-zinc-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-white text-sm font-medium">
                  {formatMonthYear(viewMonth.year, viewMonth.month)}
                </span>
                <button
                  onClick={() => setViewMonth((prev) => ({
                    year: prev.month === 11 ? prev.year + 1 : prev.year,
                    month: prev.month === 11 ? 0 : prev.month + 1,
                  }))}
                  className="p-1 text-zinc-400 hover:text-white transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Calendar grid */}
              {renderCalendar()}
            </div>
          )}
        </div>

        <button
          onClick={() => onDateChange('next')}
          disabled={!canGoNext || isLoading}
          className="p-2 text-zinc-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Granularity selector */}
      <div className="flex items-center gap-1">
        {TIME_GRANULARITIES.map((g) => (
          <button
            key={g}
            onClick={() => onGranularityChange(g)}
            disabled={isLoading}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              granularity === g
                ? 'bg-purple-500 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            {t(`granularity.${g}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DatePickerProps {
  selectedDate: string;
  availableDates: string[];
  onDateSelect: (date: string) => void;
  children?: ReactNode;
}

export function DatePicker({ selectedDate, availableDates, onDateSelect, children }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date(selectedDate + 'T00:00:00Z');
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
  });
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Reset view month to selected date when picker opens
  const openPicker = () => {
    const d = new Date(selectedDate + 'T00:00:00Z');
    setViewMonth({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
    setIsOpen(true);
  };

  const availableDateSet = new Set(availableDates);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(Date.UTC(year, month, 1)).getUTCDay();
  };

  const formatMonthYear = (year: number, month: number) => {
    return new Date(Date.UTC(year, month, 1)).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    });
  };

  const prevMonth = () => {
    setViewMonth((prev) => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { ...prev, month: prev.month - 1 };
    });
  };

  const nextMonth = () => {
    setViewMonth((prev) => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { ...prev, month: prev.month + 1 };
    });
  };

  const renderCalendar = () => {
    const { year, month } = viewMonth;
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days: (number | null)[] = [];

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Days of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

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

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isAvailable = availableDateSet.has(dateStr);
          const isSelected = dateStr === selectedDate;

          return (
            <button
              key={dateStr}
              onClick={() => {
                if (isAvailable) {
                  onDateSelect(dateStr);
                  setIsOpen(false);
                }
              }}
              disabled={!isAvailable}
              className={`
                w-7 h-7 text-xs rounded-full flex items-center justify-center transition-colors
                ${isSelected
                  ? 'bg-purple-500 text-white'
                  : isAvailable
                    ? 'text-white hover:bg-white/20 cursor-pointer'
                    : 'text-zinc-600 cursor-not-allowed'
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
    <div className="relative" ref={popoverRef}>
      {children ? (
        <div onClick={() => isOpen ? setIsOpen(false) : openPicker()}>
          {children}
        </div>
      ) : (
        <button
          onClick={() => isOpen ? setIsOpen(false) : openPicker()}
          className="p-2 text-zinc-400 hover:text-white transition-colors"
          title="Select date"
        >
          <Calendar className="w-4 h-4" />
        </button>
      )}

      {isOpen && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl z-50 min-w-[240px]">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={prevMonth}
              className="p-1 text-zinc-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-white text-sm font-medium">
              {formatMonthYear(viewMonth.year, viewMonth.month)}
            </span>
            <button
              onClick={nextMonth}
              className="p-1 text-zinc-400 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Calendar grid */}
          {renderCalendar()}

          {/* Legend */}
          <div className="mt-2 pt-2 border-t border-zinc-700 flex items-center gap-3 text-[10px]">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-zinc-400">Selected</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-white/50" />
              <span className="text-zinc-400">Available</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

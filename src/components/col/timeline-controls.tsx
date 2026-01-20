'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TIME_RANGES, type TimeRange } from './types';

interface TimelineControlsProps {
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  trailCount: number;
  isLoading?: boolean;
}

export function TimelineControls({
  timeRange,
  onTimeRangeChange,
  trailCount,
  isLoading,
}: TimelineControlsProps) {
  return (
    <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3">
      {/* Time Range Selector */}
      <Select
        value={timeRange}
        onValueChange={(v) => onTimeRangeChange(v as TimeRange)}
      >
        <SelectTrigger className="w-[100px] bg-black/50 backdrop-blur-sm border-white/10 text-white text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-white/10">
          {TIME_RANGES.map(({ value, labelZh }) => (
            <SelectItem
              key={value}
              value={value}
              className="text-white hover:bg-white/10 focus:bg-white/10"
            >
              {labelZh}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Trail count */}
      <div className="text-white/40 text-xs bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
        {isLoading ? '載入中...' : `${trailCount} 個軌跡`}
      </div>
    </div>
  );
}

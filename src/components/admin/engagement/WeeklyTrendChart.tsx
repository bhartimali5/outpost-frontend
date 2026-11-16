import type { WeekCount } from '@/api/endpoints/admin/engagement';

interface WeeklyTrendChartProps {
  /** Mondays to show, oldest first. Weeks missing from `data` are drawn as zero. */
  weeks: string[];
  data: WeekCount[];
}

/**
 * Weekly views as plain bars (no chart library). Each bar is labelled for screen readers.
 */
export function WeeklyTrendChart({ weeks, data }: WeeklyTrendChartProps) {
  const countByWeek = new Map(data.map((d) => [d.week, d.count]));
  const counts = weeks.map((week) => countByWeek.get(week) ?? 0);
  const max = Math.max(...counts, 1);

  return (
    <div role="img" aria-label="Views per week" className="flex h-48 items-end gap-3">
      {weeks.map((week, i) => {
        const count = counts[i];
        return (
          <div
            key={week}
            data-testid="trend-bar"
            aria-label={`Week of ${week}: ${count} views`}
            className="flex h-full flex-1 flex-col items-center justify-end"
          >
            <span className="mb-1 text-xs tabular-nums text-gray-600">{count.toLocaleString()}</span>
            <div
              className="w-full rounded-t bg-indigo-500"
              style={{ height: `${(count / max) * 100}%`, minHeight: count > 0 ? 4 : 0 }}
            />
            <span className="mt-2 text-xs text-gray-500">{week.slice(5)}</span>
          </div>
        );
      })}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { TopContentTable } from '../../components/admin/engagement/TopContentTable';
import { WeeklyTrendChart } from '../../components/admin/engagement/WeeklyTrendChart';
import { BreakdownCard } from '../../components/admin/engagement/BreakdownCard';
import {
  adminEngagementApi,
  type EngagementContentType,
} from '../../api/endpoints/admin/engagement';
import {
  defaultRange,
  lastWeekStarts,
  todayInIst,
  validateRange,
} from '../../lib/engagementDates';

type ContentTypeFilter = EngagementContentType | '';

/**
 * Admin engagement dashboard (OP-085).
 *
 * The date range and content type drive the tables and breakdowns. The weekly trend always
 * covers the last 8 weeks, so it is a separate request that ignores the date range (it
 * still follows the content type filter). Everything shown is aggregate: names of content
 * and counts, never founder data.
 */
export default function AdminEngagementPage() {
  const today = useMemo(() => todayInIst(), []);
  const weekStarts = useMemo(() => lastWeekStarts(today), [today]);

  const initial = useMemo(() => defaultRange(today), [today]);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [contentType, setContentType] = useState<ContentTypeFilter>('');

  const rangeError = validateRange(from, to);
  const typeParam = contentType || undefined;

  const summary = useQuery({
    queryKey: ['admin', 'engagement', 'summary', typeParam, from, to],
    queryFn: () => adminEngagementApi.getSummary({ contentType: typeParam, from, to }),
    enabled: !rangeError,
  });

  const trend = useQuery({
    queryKey: ['admin', 'engagement', 'trend', typeParam, weekStarts[0], today],
    queryFn: () =>
      adminEngagementApi.getSummary({ contentType: typeParam, from: weekStarts[0], to: today }),
  });

  const data = summary.data;
  const isEmpty =
    !!data &&
    data.topByViews.length === 0 &&
    data.topByClicks.length === 0 &&
    data.viewsByWeek.length === 0 &&
    data.bySector.length === 0 &&
    data.byStage.length === 0;

  return (
    <AdminLayout>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Engagement</h1>
          <p className="mt-2 text-gray-600">
            What founders view and click. Reports are cached for up to 5 minutes.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap items-end gap-4 rounded-lg bg-white p-4 shadow">
          <label className="text-sm text-gray-700">
            <span className="mb-1 block font-medium">From</span>
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-gray-700">
            <span className="mb-1 block font-medium">To</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-gray-700">
            <span className="mb-1 block font-medium">Content type</span>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as ContentTypeFilter)}
              className="rounded border border-gray-300 px-3 py-2"
            >
              <option value="">All content</option>
              <option value="GRANT">Grants</option>
              <option value="CHALLENGE">Challenges</option>
              <option value="MENTOR">Mentors</option>
            </select>
          </label>
        </div>

        {rangeError && (
          <p role="alert" className="mb-6 rounded bg-red-50 p-3 text-sm text-red-700">
            {rangeError}
          </p>
        )}

        <section className="mb-6 rounded-lg bg-white p-6 shadow" aria-label="Weekly trend">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Views per week (last 8 weeks)</h2>
          {trend.isLoading ? (
            <LoadingSpinner />
          ) : trend.isError ? (
            <p role="alert" className="text-sm text-red-700">
              Could not load the weekly trend.
            </p>
          ) : (
            <WeeklyTrendChart weeks={weekStarts} data={trend.data?.viewsByWeek ?? []} />
          )}
        </section>

        {summary.isLoading && !rangeError && (
          <div className="py-12 text-center">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {summary.isError && !rangeError && (
          <div role="alert" className="rounded bg-red-50 p-4 text-red-700">
            <p>Could not load engagement data.</p>
            <button onClick={() => summary.refetch()} className="mt-2 font-medium underline">
              Try again
            </button>
          </div>
        )}

        {!rangeError && isEmpty && (
          <div className="rounded-lg bg-white shadow">
            <EmptyState
              title="No engagement data for this range"
              description="Try a wider date range or a different content type."
            />
          </div>
        )}

        {!rangeError && data && !isEmpty && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <TopContentTable title="Top 10 by views" rows={data.topByViews} />
              <TopContentTable title="Top 10 by clicks" rows={data.topByClicks} />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <BreakdownCard
                title="Views by sector"
                items={data.bySector.map((s) => ({ label: s.sector, count: s.count }))}
              />
              <BreakdownCard
                title="Views by stage"
                items={data.byStage.map((s) => ({ label: s.stage, count: s.count }))}
              />
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

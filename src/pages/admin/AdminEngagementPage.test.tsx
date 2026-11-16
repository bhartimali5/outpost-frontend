import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminEngagementPage from './AdminEngagementPage';
import { adminEngagementApi } from '@/api/endpoints/admin/engagement';
import type { EngagementSummary } from '@/api/endpoints/admin/engagement';

vi.mock('@/api/endpoints/admin/engagement', () => ({
  adminEngagementApi: { getSummary: vi.fn() },
}));

// AdminLayout reads the logged-in user from the auth context
vi.mock('@/contexts', () => ({
  useAuth: () => ({
    user: { role: 'ADMIN', founderName: 'Admin User', email: 'admin@example.com' },
    logout: vi.fn(),
  }),
}));

const getSummary = vi.mocked(adminEngagementApi.getSummary);

// "Now" is Monday 2026-11-16 09:30 IST, so:
//   default range  = 2026-10-17 .. 2026-11-16
//   trend range    = 2026-09-28 .. 2026-11-16 (8 weeks, Monday to Monday)
const NOW = new Date('2026-11-16T04:00:00Z');
const TREND_FROM = '2026-09-28';
const TODAY = '2026-11-16';

const GRANT_ID = '11111111-1111-1111-1111-111111111111';
const CHALLENGE_ID = '22222222-2222-2222-2222-222222222222';
const GONE_ID = '33333333-3333-3333-3333-333333333333';

const summaryData: EngagementSummary = {
  topByViews: [
    { contentId: GRANT_ID, contentType: 'GRANT', contentName: 'Startup India Seed Fund', views: 120, clicks: 15 },
    { contentId: GONE_ID, contentType: 'GRANT', contentName: null, views: 40, clicks: 2 },
  ],
  topByClicks: [
    { contentId: CHALLENGE_ID, contentType: 'CHALLENGE', contentName: 'Smart Logistics Challenge', views: 30, clicks: 25 },
  ],
  viewsByWeek: [],
  viewsByMonth: [],
  bySector: [
    { sector: 'Fintech', count: 90 },
    { sector: 'Healthtech', count: 45 },
  ],
  byStage: [{ stage: 'Growth', count: 70 }],
};

const trendData: EngagementSummary = {
  ...summaryData,
  viewsByWeek: [
    { week: '2026-11-09', count: 4 },
    { week: '2026-10-12', count: 10 },
  ],
};

const emptyData: EngagementSummary = {
  topByViews: [],
  topByClicks: [],
  viewsByWeek: [],
  viewsByMonth: [],
  bySector: [],
  byStage: [],
};

function isTrendRequest(params?: { from?: string; to?: string }) {
  return params?.from === TREND_FROM && params?.to === TODAY;
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AdminEngagementPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('AdminEngagementPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] }); // only Date, so react-query timers keep working
    vi.setSystemTime(NOW);
    getSummary.mockReset();
    getSummary.mockImplementation(async (params) =>
      isTrendRequest(params) ? trendData : summaryData
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('requests the last 30 days for the tables and the last 8 weeks for the trend', async () => {
    renderPage();

    await screen.findByText('Startup India Seed Fund');

    expect(getSummary).toHaveBeenCalledWith({
      contentType: undefined,
      from: '2026-10-17',
      to: '2026-11-16',
    });
    expect(getSummary).toHaveBeenCalledWith({
      contentType: undefined,
      from: TREND_FROM,
      to: TODAY,
    });
    expect(screen.getByLabelText('From')).toHaveValue('2026-10-17');
    expect(screen.getByLabelText('To')).toHaveValue('2026-11-16');
  });

  it('shows content names linked to their detail pages, with views and clicks', async () => {
    renderPage();

    const viewsTable = await screen.findByRole('region', { name: 'Top 10 by views' });
    const link = within(viewsTable).getByRole('link', { name: 'Startup India Seed Fund' });
    expect(link).toHaveAttribute('href', `/grants/${GRANT_ID}`);
    expect(within(viewsTable).getByText('120')).toBeInTheDocument();
    expect(within(viewsTable).getByText('15')).toBeInTheDocument();

    const clicksTable = screen.getByRole('region', { name: 'Top 10 by clicks' });
    expect(
      within(clicksTable).getByRole('link', { name: 'Smart Logistics Challenge' })
    ).toHaveAttribute('href', `/challenges/${CHALLENGE_ID}`);
  });

  it('shows deleted content without a link', async () => {
    renderPage();

    const viewsTable = await screen.findByRole('region', { name: 'Top 10 by views' });
    expect(within(viewsTable).getByText('Deleted item')).toBeInTheDocument();
    expect(within(viewsTable).getAllByRole('link')).toHaveLength(1);
  });

  it('draws 8 weekly bars, filling weeks with no data with zero', async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByTestId('trend-bar')).toHaveLength(8));
    expect(screen.getByLabelText('Week of 2026-11-09: 4 views')).toBeInTheDocument();
    expect(screen.getByLabelText('Week of 2026-10-12: 10 views')).toBeInTheDocument();
    expect(screen.getByLabelText('Week of 2026-11-02: 0 views')).toBeInTheDocument();
    expect(screen.getByLabelText('Week of 2026-11-16: 0 views')).toBeInTheDocument();
  });

  it('shows the sector and stage breakdowns', async () => {
    renderPage();

    const sectors = await screen.findByRole('region', { name: 'Views by sector' });
    expect(within(sectors).getByText('Fintech')).toBeInTheDocument();
    expect(within(sectors).getByText('Healthtech')).toBeInTheDocument();
    const stages = screen.getByRole('region', { name: 'Views by stage' });
    expect(within(stages).getByText('Growth')).toBeInTheDocument();
  });

  it('shows an empty state when there is no data for the range', async () => {
    getSummary.mockImplementation(async (params) =>
      isTrendRequest(params) ? trendData : emptyData
    );
    renderPage();

    expect(await screen.findByText('No engagement data for this range')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Top 10 by views' })).not.toBeInTheDocument();
  });

  it('sends the content type filter with both requests', async () => {
    renderPage();
    await screen.findByText('Startup India Seed Fund');

    fireEvent.change(screen.getByLabelText('Content type'), { target: { value: 'MENTOR' } });

    await waitFor(() => {
      expect(getSummary).toHaveBeenCalledWith({
        contentType: 'MENTOR',
        from: '2026-10-17',
        to: '2026-11-16',
      });
      expect(getSummary).toHaveBeenCalledWith({
        contentType: 'MENTOR',
        from: TREND_FROM,
        to: TODAY,
      });
    });
  });

  it('requests the new range when a date changes, leaving the trend range alone', async () => {
    renderPage();
    await screen.findByText('Startup India Seed Fund');

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-11-01' } });

    await waitFor(() =>
      expect(getSummary).toHaveBeenCalledWith({
        contentType: undefined,
        from: '2026-11-01',
        to: '2026-11-16',
      })
    );
    const trendCalls = getSummary.mock.calls.filter(([p]) => isTrendRequest(p));
    expect(trendCalls).toHaveLength(1);
  });

  it('shows an error and does not request when the start is after the end', async () => {
    renderPage();
    await screen.findByText('Startup India Seed Fund');
    getSummary.mockClear();

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-11-20' } });

    expect(await screen.findByRole('alert')).toHaveTextContent(/on or before/i);
    expect(getSummary).not.toHaveBeenCalledWith(
      expect.objectContaining({ from: '2026-11-20' })
    );
  });

  it('shows an error with a retry when the summary fails', async () => {
    getSummary.mockImplementation(async (params) => {
      if (isTrendRequest(params)) return trendData;
      throw new Error('boom');
    });
    renderPage();

    expect(await screen.findByText('Could not load engagement data.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

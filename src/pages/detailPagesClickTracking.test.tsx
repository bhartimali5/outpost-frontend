import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import GrantDetailPage from './GrantDetailPage';
import ChallengeDetailPage from './ChallengeDetailPage';
import MentorDetailPage from './MentorDetailPage';
import { engagementApi } from '@/api/endpoints/engagement';
import { grantsApi } from '@/api/endpoints/grants';
import { challengesApi } from '@/api/endpoints/challenges';
import { mentorsApi } from '@/api/endpoints/mentors';

/**
 * Clicking the external link on a grant, challenge or mentor detail page reports one click to
 * the engagement API, for logged-in founders only. The link still opens as before.
 */

const mockUseAuth = vi.fn();
vi.mock('@/contexts', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/components/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/api/endpoints/engagement', () => ({ engagementApi: { recordClick: vi.fn() } }));
vi.mock('@/api/endpoints/grants', () => ({ grantsApi: { getGrantById: vi.fn() } }));
vi.mock('@/api/endpoints/challenges', () => ({ challengesApi: { getChallengeById: vi.fn() } }));
vi.mock('@/api/endpoints/mentors', () => ({ mentorsApi: { getMentorById: vi.fn() } }));

const recordClick = vi.mocked(engagementApi.recordClick);

const grant = {
  id: 'grant-1', title: 'Startup India Seed Fund', summary: 'Seed funding', issuingBody: 'DPIIT',
  issuingBodyType: 'CENTRAL', type: 'GRANT', sourceUrl: 'https://example.com/seed', status: 'PUBLISHED',
} as const;

const challenge = {
  id: 'challenge-1', title: 'Smart Logistics Challenge', corporateName: 'Acme', status: 'OPEN',
  hasDetail: false, applyUrl: 'https://example.com/apply',
} as const;

const mentor = {
  id: 'mentor-1', name: 'Asha Rao', headline: 'Fintech advisor', bio: 'Ten years in payments',
  expertise: ['Payments'], status: 'APPROVED',
  bookingUrl: 'https://cal.com/asha', // the field name the backend really returns for mentors
} as const;

function renderAt(path: string, route: string, element: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={route} element={element} />
      </Routes>
    </MemoryRouter>
  );
}

describe('click tracking on detail pages', () => {
  beforeEach(() => {
    recordClick.mockReset();
    recordClick.mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { role: 'FOUNDER' } });
    vi.mocked(grantsApi.getGrantById).mockResolvedValue({ ...grant } as never);
    vi.mocked(challengesApi.getChallengeById).mockResolvedValue({ ...challenge } as never);
    vi.mocked(mentorsApi.getMentorById).mockResolvedValue({ ...mentor } as never);
  });

  describe('grant', () => {
    const open = () => renderAt('/grants/grant-1', '/grants/:id', <GrantDetailPage />);

    it('reports a GRANT click when "Go to Source" is clicked', async () => {
      open();
      const link = await screen.findByRole('link', { name: /go to source/i });
      expect(link).toHaveAttribute('href', 'https://example.com/seed');

      fireEvent.click(link);

      expect(recordClick).toHaveBeenCalledTimes(1);
      expect(recordClick).toHaveBeenCalledWith('GRANT', 'grant-1');
    });

    it('reports nothing for an anonymous visitor', async () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });
      open();

      fireEvent.click(await screen.findByRole('link', { name: /go to source/i }));

      expect(recordClick).not.toHaveBeenCalled();
    });

    it('reports nothing when the grant is expired (the link is disabled)', async () => {
      vi.mocked(grantsApi.getGrantById).mockResolvedValue({ ...grant, status: 'EXPIRED' } as never);
      open();

      fireEvent.click(await screen.findByRole('link', { name: /go to source/i }));

      expect(recordClick).not.toHaveBeenCalled();
    });
  });

  describe('challenge', () => {
    const open = () => renderAt('/challenges/challenge-1', '/challenges/:id', <ChallengeDetailPage />);

    it('reports a CHALLENGE click when "Apply Now" is clicked', async () => {
      open();

      fireEvent.click(await screen.findByRole('link', { name: /apply now/i }));

      expect(recordClick).toHaveBeenCalledTimes(1);
      expect(recordClick).toHaveBeenCalledWith('CHALLENGE', 'challenge-1');
    });

    it('reports a CHALLENGE click when "View Full Details" is clicked', async () => {
      open();

      fireEvent.click(await screen.findByRole('link', { name: /view full details/i }));

      expect(recordClick).toHaveBeenCalledTimes(1);
      expect(recordClick).toHaveBeenCalledWith('CHALLENGE', 'challenge-1');
    });

    it('reports nothing when the challenge is closed (Apply Now is disabled)', async () => {
      vi.mocked(challengesApi.getChallengeById).mockResolvedValue({ ...challenge, status: 'CLOSED' } as never);
      open();

      fireEvent.click(await screen.findByRole('link', { name: /apply now/i }));

      expect(recordClick).not.toHaveBeenCalled();
    });

    it('reports nothing for an anonymous visitor', async () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });
      open();

      fireEvent.click(await screen.findByRole('link', { name: /apply now/i }));

      expect(recordClick).not.toHaveBeenCalled();
    });
  });

  describe('mentor', () => {
    const open = () => renderAt('/mentors/mentor-1', '/mentors/:id', <MentorDetailPage />);

    it('reports a MENTOR click when "Book a Session" is clicked', async () => {
      open();
      const link = await screen.findByRole('link', { name: /book a session/i });
      expect(link).toHaveAttribute('href', 'https://cal.com/asha');

      fireEvent.click(link);

      expect(recordClick).toHaveBeenCalledTimes(1);
      expect(recordClick).toHaveBeenCalledWith('MENTOR', 'mentor-1');
    });

    it('reports nothing for an anonymous visitor', async () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });
      open();

      fireEvent.click(await screen.findByRole('link', { name: /book a session/i }));

      expect(recordClick).not.toHaveBeenCalled();
    });
  });
});

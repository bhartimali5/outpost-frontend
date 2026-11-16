import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminMentorsPage from './AdminMentorsPage';
import { adminMentorsApi } from '@/api/endpoints/admin/mentors';

vi.mock('@/contexts', () => ({
  useAuth: () => ({ user: { role: 'ADMIN', founderName: 'Admin', email: 'admin@example.com' }, logout: vi.fn() }),
}));
vi.mock('@/api/endpoints/admin/mentors', () => ({
  adminMentorsApi: { listMentors: vi.fn(), approveMentor: vi.fn(), rejectMentor: vi.fn() },
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

describe('AdminMentorsPage booking link', () => {
  it('links to the mentor\'s cal.com page using the field the admin API returns (calcomUrl)', async () => {
    vi.mocked(adminMentorsApi.listMentors).mockResolvedValue({
      content: [
        {
          id: 'mentor-1', name: 'Asha Rao', headline: 'Fintech advisor', expertise: ['Payments'],
          status: 'PENDING', calcomUrl: 'https://cal.com/asha',
        },
      ],
      totalElements: 1,
    } as never);

    render(<MemoryRouter><AdminMentorsPage /></MemoryRouter>);

    const link = await screen.findByRole('link', { name: /cal\.com/i });
    expect(link).toHaveAttribute('href', 'https://cal.com/asha');
  });
});

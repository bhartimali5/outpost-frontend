import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminRoute } from './AdminRoute';

const mockUseAuth = vi.fn();
vi.mock('@/contexts', () => ({ useAuth: () => mockUseAuth() }));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/admin/engagement"
          element={
            <AdminRoute>
              <div>Engagement dashboard</div>
            </AdminRoute>
          }
        />
        <Route path="/discover" element={<div>Discover page</div>} />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AdminRoute', () => {
  beforeEach(() => mockUseAuth.mockReset());

  it('lets an admin through', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'ADMIN' }, isLoading: false });
    renderAt('/admin/engagement');
    expect(screen.getByText('Engagement dashboard')).toBeInTheDocument();
  });

  it('sends a founder to /discover', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'FOUNDER' }, isLoading: false });
    renderAt('/admin/engagement');
    expect(screen.getByText('Discover page')).toBeInTheDocument();
    expect(screen.queryByText('Engagement dashboard')).not.toBeInTheDocument();
  });

  it('sends an anonymous visitor to /login', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    renderAt('/admin/engagement');
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });
});

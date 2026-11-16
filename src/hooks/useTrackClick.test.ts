import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTrackClick } from './useTrackClick';

const mockUseAuth = vi.fn();
vi.mock('@/contexts', () => ({ useAuth: () => mockUseAuth() }));

// A plain recorder instead of vi.fn(): vi.fn() attaches its own handlers to any promise it
// returns, which would hide a missing .catch() in the hook.
const api = vi.hoisted(() => ({
  calls: [] as Array<[string, string]>,
  next: (): Promise<void> => Promise.resolve(),
}));
vi.mock('@/api/endpoints/engagement', () => ({
  engagementApi: {
    recordClick: (contentType: string, contentId: string) => {
      api.calls.push([contentType, contentId]);
      return api.next();
    },
  },
}));

describe('useTrackClick', () => {
  beforeEach(() => {
    api.calls.length = 0;
    api.next = () => Promise.resolve();
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
  });

  it('reports the click for a logged-in founder', () => {
    const { result } = renderHook(() => useTrackClick());

    result.current('GRANT', 'grant-1');

    expect(api.calls).toEqual([['GRANT', 'grant-1']]);
  });

  it('does nothing for an anonymous visitor (a 401 would redirect them to /login)', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false });
    const { result } = renderHook(() => useTrackClick());

    result.current('CHALLENGE', 'challenge-1');

    expect(api.calls).toEqual([]);
  });

  it('does nothing when there is no content id', () => {
    const { result } = renderHook(() => useTrackClick());

    result.current('MENTOR', undefined);

    expect(api.calls).toEqual([]);
  });

  it('swallows a failed request so the founder never sees an error', async () => {
    // A rejected promise that records whether the hook attached a rejection handler to it.
    // Without one, the failure would surface as an unhandled promise rejection.
    const failed = Promise.reject(new Error('network down'));
    let rejectionHandled = false;
    const originalThen = failed.then.bind(failed);
    failed.then = ((onFulfilled: unknown, onRejected: unknown) => {
      rejectionHandled = typeof onRejected === 'function';
      return originalThen(onFulfilled as never, onRejected as never);
    }) as typeof failed.then;
    api.next = () => failed;
    const { result } = renderHook(() => useTrackClick());

    expect(() => result.current('MENTOR', 'mentor-1')).not.toThrow();
    await new Promise((r) => setTimeout(r, 10));

    expect(api.calls).toEqual([['MENTOR', 'mentor-1']]);
    expect(rejectionHandled).toBe(true);
  });
});

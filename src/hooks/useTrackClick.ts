import { useCallback } from 'react';
import { useAuth } from '@/contexts';
import { engagementApi, type ClickedContentType } from '@/api/endpoints/engagement';

/**
 * useTrackClick - reports clicks on external links (grant source, challenge apply,
 * mentor booking) to the backend, for the admin engagement dashboard.
 *
 * Fire and forget:
 * - It never throws, never shows an error, and never delays the link: tracking is a side
 *   effect and must not get in the way of the founder.
 * - It does nothing for anonymous visitors. The endpoint needs a login, and the API client
 *   sends a visitor to /login when it gets a 401, which would pull them off the page right
 *   after they click "Apply".
 */
export function useTrackClick() {
  const { isAuthenticated } = useAuth();

  return useCallback(
    (contentType: ClickedContentType, contentId: string | undefined) => {
      if (!isAuthenticated || !contentId) return;
      engagementApi.recordClick(contentType, contentId).catch(() => {
        // intentionally ignored: a failed click report must not affect the founder
      });
    },
    [isAuthenticated]
  );
}

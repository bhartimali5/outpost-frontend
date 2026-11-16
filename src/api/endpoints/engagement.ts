import apiClient from '../client';

export type ClickedContentType = 'GRANT' | 'CHALLENGE' | 'MENTOR';

export const engagementApi = {
  /**
   * Report that the logged-in founder clicked an external link (source, apply or booking).
   * The backend records one CLICK event; there is no redirect, so the link opens as usual.
   * Returns 204 with no body. Founders only: anonymous callers get 401.
   */
  recordClick: async (contentType: ClickedContentType, contentId: string): Promise<void> => {
    await apiClient.post('/engagement/click', { contentType, contentId });
  },
};

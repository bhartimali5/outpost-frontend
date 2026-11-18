import apiClient from '../client';

export type NotificationFrequency = 'IMMEDIATE' | 'WEEKLY_DIGEST';

/** A founder's notification preferences (GET/PATCH /api/v1/me/notifications, OP-087). */
export interface NotificationPreferences {
  grantsEnabled: boolean;
  challengesEnabled: boolean;
  mentorsEnabled: boolean;
  frequency: NotificationFrequency;
  /** Overrides everything else: while true, nothing is sent. */
  unsubscribed: boolean;
}

export const notificationsApi = {
  /** Current preferences; founders who never saved any get the defaults. */
  getPreferences: async (): Promise<NotificationPreferences> => {
    const response = await apiClient.get<NotificationPreferences>('/me/notifications');
    return response.data;
  },

  /**
   * Partial update: send only the fields that change. Note the backend rule: a request with
   * unsubscribed=true applies only the unsubscribe and ignores every other field in it.
   */
  updatePreferences: async (changes: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
    const response = await apiClient.patch<NotificationPreferences>('/me/notifications', changes);
    return response.data;
  },
};

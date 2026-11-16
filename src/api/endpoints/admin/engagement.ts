import apiClient from '../../client';

export type EngagementContentType = 'GRANT' | 'CHALLENGE' | 'MENTOR';

export interface TopContent {
  contentId: string;
  contentType: EngagementContentType;
  /** null when the item has been deleted or no longer exists */
  contentName: string | null;
  views: number;
  clicks: number;
}

export interface WeekCount {
  /** Monday of the week (IST), yyyy-MM-dd */
  week: string;
  count: number;
}

export interface MonthCount {
  /** yyyy-MM (IST) */
  month: string;
  count: number;
}

export interface SectorCount {
  sector: string;
  count: number;
}

export interface StageCount {
  stage: string;
  count: number;
}

export interface EngagementSummary {
  topByViews: TopContent[];
  topByClicks: TopContent[];
  viewsByWeek: WeekCount[];
  viewsByMonth: MonthCount[];
  bySector: SectorCount[];
  byStage: StageCount[];
}

export interface EngagementSummaryParams {
  contentType?: EngagementContentType;
  /** yyyy-MM-dd, IST. Backend default: 30 days before `to`. */
  from?: string;
  /** yyyy-MM-dd, IST, inclusive. Backend default: today. */
  to?: string;
}

export const adminEngagementApi = {
  /**
   * Admin engagement summary (OP-084). Aggregates only: no founder data is returned.
   * The backend caches each response for 5 minutes.
   */
  getSummary: async (params: EngagementSummaryParams = {}): Promise<EngagementSummary> => {
    const response = await apiClient.get<EngagementSummary>('/admin/engagement/summary', {
      params,
    });
    return response.data;
  },
};

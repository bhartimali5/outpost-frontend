import { Link } from 'react-router-dom';
import type { EngagementContentType, TopContent } from '@/api/endpoints/admin/engagement';

const DETAIL_PATH: Record<EngagementContentType, string> = {
  GRANT: '/grants',
  CHALLENGE: '/challenges',
  MENTOR: '/mentors',
};

const TYPE_LABEL: Record<EngagementContentType, string> = {
  GRANT: 'Grant',
  CHALLENGE: 'Challenge',
  MENTOR: 'Mentor',
};

interface TopContentTableProps {
  title: string;
  rows: TopContent[];
}

/**
 * Top content table: name (linked to the detail page), views, clicks.
 * Deleted content has no name and is shown without a link.
 */
export function TopContentTable({ title, rows }: TopContentTableProps) {
  return (
    <section className="rounded-lg bg-white p-6 shadow" aria-label={title}>
      <h2 className="mb-4 text-lg font-semibold text-gray-900">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">Nothing to show for this range.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="py-2 pr-4 font-medium">Content</th>
              <th className="py-2 pr-4 text-right font-medium">Views</th>
              <th className="py-2 text-right font-medium">Clicks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.contentType}-${row.contentId}`} className="border-b border-gray-100">
                <td className="py-2 pr-4">
                  {row.contentName ? (
                    <Link
                      to={`${DETAIL_PATH[row.contentType]}/${row.contentId}`}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {row.contentName}
                    </Link>
                  ) : (
                    <span className="italic text-gray-500">Deleted item</span>
                  )}
                  <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                    {TYPE_LABEL[row.contentType]}
                  </span>
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">{row.views.toLocaleString()}</td>
                <td className="py-2 text-right tabular-nums">{row.clicks.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

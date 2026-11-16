interface BreakdownCardProps {
  title: string;
  items: { label: string; count: number }[];
}

/** Audience breakdown (views by sector or stage) as labelled horizontal bars. */
export function BreakdownCard({ title, items }: BreakdownCardProps) {
  const max = Math.max(...items.map((i) => i.count), 1);

  return (
    <section className="rounded-lg bg-white p-6 shadow" aria-label={title}>
      <h2 className="mb-4 text-lg font-semibold text-gray-900">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">Nothing to show for this range.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.label}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-gray-700">{item.label}</span>
                <span className="tabular-nums text-gray-600">{item.count.toLocaleString()}</span>
              </div>
              <div className="h-2 rounded bg-gray-100">
                <div
                  className="h-2 rounded bg-indigo-500"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

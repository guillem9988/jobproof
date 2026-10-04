export function Skeleton({ lines = 3, label }: { lines?: number; label: string }) {
  return (
    <div className="card skeleton-card" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton" style={{ width: `${92 - i * 14}%` }} />
      ))}
    </div>
  );
}

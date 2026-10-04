import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="card empty-state">
      <span className="icon-box">{icon}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}

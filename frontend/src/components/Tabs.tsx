import type { KeyboardEvent, ReactNode } from "react";

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: ReactNode;
}

export const tabId = (prefix: string, id: string) => `${prefix}-tab-${id}`;
export const panelId = (prefix: string, id: string) => `${prefix}-panel-${id}`;

/** Accessible tablist with roving tabindex and arrow/Home/End keyboard support. */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  prefix,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  prefix: string;
}) {
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const focused = items.findIndex((x) => tabId(prefix, x.id) === (e.target as HTMLElement).id);
    const i = focused >= 0 ? focused : items.findIndex((x) => x.id === value);
    let next = i;
    if (e.key === "ArrowRight") next = (i + 1) % items.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else return;
    e.preventDefault();
    onChange(items[next].id);
    document.getElementById(tabId(prefix, items[next].id))?.focus();
  }
  return (
    <div className="tab-group" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {items.map((item) => (
        <button
          key={item.id}
          id={tabId(prefix, item.id)}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          aria-controls={panelId(prefix, item.id)}
          tabIndex={value === item.id ? 0 : -1}
          className={`tab-button ${value === item.id ? "active" : ""}`}
          onClick={() => onChange(item.id)}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}

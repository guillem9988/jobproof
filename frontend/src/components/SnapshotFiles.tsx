import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { one } from "../api";
import { useApp } from "../app-context";

export function SnapshotFiles({ id }: { id: string }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["snapshotFiles", id],
    enabled: open,
    queryFn: () =>
      one<{
        files: { id: string; path: string; line_count: number; type: string }[];
      }>("/snapshots/" + id),
  });
  return (
    <div>
      <button aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? t.hideFilesInventory : t.showFilesInventory}
      </button>
      {open && (
        <ul>
          {query.data?.files.map((f) => (
            <li key={f.id}>
              {f.path} · {f.line_count} {t.lines} · {f.type}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { useApp } from "../app-context";
import { HistoryList } from "../components/HistoryList";
import { Skeleton } from "../components/Skeleton";
import { useHistory } from "../hooks/queries";

export function HistoryPage() {
  const { t, openReport } = useApp();
  const history = useHistory();
  return (
    <>
      <div className="eyebrow">{t.historyEyebrow}</div>
      <h1>{t.historyTitle}</h1>
      <p className="intro">{t.historyDesc}</p>
      {history.isLoading ? (
        <Skeleton label={t.loadingLabel} lines={4} />
      ) : (
        <HistoryList rows={history.data ?? []} open={(id) => openReport(id)} />
      )}
    </>
  );
}

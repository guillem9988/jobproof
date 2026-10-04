import { Info } from "lucide-react";
import { useApp } from "../app-context";

export function HostedNotice() {
  const { t } = useApp();
  return (
    <div className="notice hosted-notice" role="note">
      <Info size={18} aria-hidden="true" />
      <div>
        <strong>{t.hostedNoticeTitle}</strong>
        <p>{t.hostedNoticeBody}</p>
      </div>
    </div>
  );
}

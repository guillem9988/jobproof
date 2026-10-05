import { Info, KeyRound } from "lucide-react";
import { useApp } from "../app-context";

/** Public demo without workspaces: nothing can be imported or configured. */
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

/** Public deployment where visitors bring their own key. Explains privacy and points to Settings. */
export function ByokNotice({ onSettings }: { onSettings: () => void }) {
  const { t, canUseAi, trialRemaining } = useApp();
  return (
    <div className="notice hosted-notice" role="note">
      <KeyRound size={18} aria-hidden="true" />
      <div>
        <strong>{t.hostedByokTitle}</strong>
        <p>{t.hostedByokBody}</p>
        {trialRemaining > 0 && <p>{t.trialLeft.replace("{n}", String(trialRemaining))}</p>}
        {!canUseAi && (
          <button type="button" className="button-sm primary" onClick={onSettings}>
            {t.needKeyButton}
          </button>
        )}
      </div>
    </div>
  );
}

/** Shown next to actions that need a model when the visitor has no key and no free trial left. */
export function NeedKeyNotice({ onSettings }: { onSettings: () => void }) {
  const { t } = useApp();
  return (
    <div className="notice hosted-notice" role="alert">
      <KeyRound size={18} aria-hidden="true" />
      <div>
        <strong>{t.needKeyTitle}</strong>
        <p>{t.needKeyDesc}</p>
        <button type="button" className="button-sm primary" onClick={onSettings}>
          {t.needKeyButton}
        </button>
      </div>
    </div>
  );
}

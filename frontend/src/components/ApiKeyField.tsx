import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useApp } from "../app-context";

export function ApiKeyField({
  label,
  configured,
  preview,
  badgeSuffix,
  description,
  helper,
  placeholder,
  value,
  onChange,
  link,
  testLabel,
  testing,
  onTest,
}: {
  label: string;
  configured: boolean;
  preview?: string;
  badgeSuffix?: string;
  description?: string;
  helper?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  link: { href: string; label: string };
  testLabel: string;
  testing: boolean;
  onTest: () => void;
}) {
  const { t } = useApp();
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className="key-field">
      <div className="key-field-head">
        <label htmlFor={id}>{label}</label>
        {configured ? (
          <span className="pill supported">
            ✓ {t.keyConfiguredBadge}
            {badgeSuffix ? ` ${badgeSuffix}` : ""}: {preview}
          </span>
        ) : (
          <span className="pill not_evidenced">{t.keyNotConfiguredBadge}</span>
        )}
      </div>
      {description && <p className="quiet key-field-desc">{description}</p>}
      <div className="key-field-input">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete="off"
          spellCheck={false}
          placeholder={configured ? "••••••••••••••••••••••••••••" : placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="key-toggle"
          aria-label={`${t.toggleKeyVisibility}: ${label}`}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {helper && !value && <p className="quiet key-field-helper">ℹ️ {helper}</p>}
      <div className="key-field-foot">
        <a href={link.href} target="_blank" rel="noreferrer" className="quiet">
          {link.label}
        </a>
        <button
          type="button"
          className="button-sm"
          disabled={testing || (!value && !configured)}
          onClick={onTest}
        >
          {testing ? t.testingConnection : testLabel}
        </button>
      </div>
    </div>
  );
}

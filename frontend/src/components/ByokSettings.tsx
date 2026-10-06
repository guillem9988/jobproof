import { useId, useState } from "react";
import { Check, Eye, EyeOff, KeyRound, Trash2, X } from "lucide-react";
import { forgetAiKey, saveAi, useAi, type AiProvider } from "../ai";
import { one, request } from "../api";
import { useApp } from "../app-context";
import { PROVIDER_MODELS, getDefaultModelForProvider, getModelTagBadge } from "../models";
import { qc } from "../queryClient";
import type { SettingsTestResult } from "../types";

const KEY_LINKS: Record<AiProvider, string> = {
  gemini: "https://aistudio.google.com/app/apikey",
  anthropic: "https://console.anthropic.com/settings/keys",
  openai: "https://platform.openai.com/api-keys",
};

/** Settings on a public deployment: the visitor brings their own key, which only lives in this tab. */
export function ByokSettings() {
  const { t, busy, trialRemaining, setJob, setSelected, setError } = useApp();
  const active = useAi();
  const providerId = useId();
  const modelId = useId();
  const keyId = useId();
  const [provider, setProvider] = useState<AiProvider>(active?.provider ?? "gemini");
  const [model, setModel] = useState(
    active?.model || getDefaultModelForProvider(active?.provider ?? "gemini"),
  );
  const [key, setKey] = useState("");
  const [visible, setVisible] = useState(false);
  const [test, setTest] = useState<{ testing: boolean; result: SettingsTestResult | null }>({
    testing: false,
    result: null,
  });
  const [notice, setNotice] = useState("");

  const candidate = key.trim();

  async function testKey() {
    setTest({ testing: true, result: null });
    try {
      const result = await one<SettingsTestResult>("/settings/test", { provider, api_key: candidate, model });
      setTest({ testing: false, result });
    } catch (err) {
      setTest({
        testing: false,
        result: { success: false, message: err instanceof Error ? err.message : String(err), latency_ms: 0 },
      });
    }
  }

  function submitKey(e: React.FormEvent) {
    e.preventDefault();
    if (!candidate) return;
    saveAi({ provider, model, key: candidate });
    setKey("");
    setNotice(t.keySaved);
  }

  async function deleteData() {
    try {
      await request("/workspace/delete", {});
      setJob(null);
      setSelected([]);
      await qc.invalidateQueries();
      setNotice(t.deleteWorkspaceDone);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <div className="eyebrow">{t.hostedBadge}</div>
      <h1>{t.yourAiKeyTitle}</h1>
      <p className="intro">{t.yourAiKeyIntro}</p>

      <div className="notice hosted-notice" role="note">
        <KeyRound size={18} aria-hidden="true" />
        <div>
          <strong>{t.keyPrivacyTitle}</strong>
          <ul className="plain-list">
            <li>{t.keyPrivacy1}</li>
            <li>{t.keyPrivacy2}</li>
            <li>{t.keyPrivacy3}</li>
          </ul>
        </div>
      </div>

      <div role="status" aria-live="polite">
        {notice && (
          <div className="success-banner">
            <span className="inline-row">
              <Check size={18} />
              {notice}
            </span>
          </div>
        )}
        {test.result && (
          <div className={test.result.success ? "success-banner" : "error"}>
            <span className="inline-row">
              {test.result.success ? <Check size={18} /> : <X size={18} />}
              {test.result.message}
              {test.result.latency_ms > 0 && ` (${test.result.latency_ms}ms)`}
            </span>
          </div>
        )}
      </div>

      <form className="card form" onSubmit={submitKey}>
        <div className="inline-row between wrap">
          <h2>{t.aiProviderSection}</h2>
          {active ? (
            <span className="pill supported">
              ✓ {t.keyActive}: {active.provider}
            </span>
          ) : trialRemaining > 0 ? (
            <span className="pill">{t.trialBadge}</span>
          ) : (
            <span className="pill not_evidenced">{t.keyMissing}</span>
          )}
        </div>
        {trialRemaining > 0 && !active && (
          <p className="quiet">{t.trialLeft.replace("{n}", String(trialRemaining))}</p>
        )}

        <label htmlFor={providerId}>{t.aiProviderSelect}</label>
        <select
          id={providerId}
          value={provider}
          onChange={(e) => {
            const p = e.target.value as AiProvider;
            setProvider(p);
            setModel(getDefaultModelForProvider(p));
            setTest({ testing: false, result: null });
          }}
        >
          <option value="gemini">{t.geminiOption}</option>
          <option value="anthropic">{t.anthropicOption}</option>
          <option value="openai">{t.openaiOption}</option>
        </select>

        <label htmlFor={modelId}>{t.modelSelectorLabel}</label>
        <select id={modelId} value={model} onChange={(e) => setModel(e.target.value)}>
          {PROVIDER_MODELS[provider].map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} — {getModelTagBadge(m.tag, t)}
            </option>
          ))}
        </select>

        <div className="key-field">
          <div className="key-field-head">
            <label htmlFor={keyId}>
              {provider === "gemini"
                ? t.geminiApiKeyLabel
                : provider === "anthropic"
                  ? t.anthropicApiKeyLabel
                  : t.openaiApiKeyLabel}
            </label>
          </div>
          <div className="key-field-input">
            <input
              id={keyId}
              type={visible ? "text" : "password"}
              autoComplete="off"
              spellCheck={false}
              placeholder={
                provider === "gemini"
                  ? "AIzaSy..."
                  : provider === "anthropic"
                    ? "sk-ant-api03-..."
                    : "sk-proj-..."
              }
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
            <button
              type="button"
              className="key-toggle"
              aria-label={t.toggleKeyVisibility}
              aria-pressed={visible}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="key-field-foot">
            <a href={KEY_LINKS[provider]} target="_blank" rel="noreferrer" className="quiet">
              {provider === "gemini"
                ? t.getFreeGeminiKey
                : provider === "anthropic"
                  ? t.getAnthropicKeyLink
                  : t.getOpenaiKeyLink}
            </a>
            <button
              type="button"
              className="button-sm"
              disabled={test.testing || !candidate}
              onClick={testKey}
            >
              {test.testing ? t.testingConnection : t.testConnection}
            </button>
          </div>
        </div>

        <div className="inline-row wrap form-actions">
          <button type="submit" className="primary" disabled={busy || !candidate}>
            <Check size={16} />
            {t.useThisKey}
          </button>
          <button type="button" onClick={() => forgetAiKey()} disabled={!active}>
            {t.forgetKey}
          </button>
        </div>
      </form>

      <section className="card">
        <h2>{t.deleteWorkspaceTitle}</h2>
        <p>{t.deleteWorkspaceDesc}</p>
        <button type="button" onClick={deleteData}>
          <Trash2 size={16} />
          {t.deleteWorkspaceButton}
        </button>
      </section>
    </>
  );
}

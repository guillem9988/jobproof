import { useEffect, useId, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { one } from "../api";
import { useApp } from "../app-context";
import { ApiKeyField } from "../components/ApiKeyField";
import { useAppSettings } from "../hooks/queries";
import {
  PROVIDER_MODELS,
  getDefaultModelForProvider,
  getModelTagBadge,
  type Provider,
} from "../models";
import { qc } from "../queryClient";
import type { AppSettings, SettingsTestResult } from "../types";

type KeyName = "gemini" | "anthropic" | "openai" | "github";
const emptyKeys: Record<KeyName, string> = { gemini: "", anthropic: "", openai: "", github: "" };

export function SettingsPage() {
  const { t, lang, busy, act } = useApp();
  const appSettings = useAppSettings();
  const s = appSettings.data;
  const providerId = useId();
  const modelId = useId();
  const customModelId = useId();

  const [provider, setProvider] = useState<Provider>("gemini");
  const [model, setModel] = useState("");
  const [customModel, setCustomModel] = useState(false);
  const [keys, setKeys] = useState(emptyKeys);
  const [testStatus, setTestStatus] = useState<{ testing: boolean; result: SettingsTestResult | null }>({
    testing: false,
    result: null,
  });
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(savedTimer.current), []);

  useEffect(() => {
    if (!s) return;
    const p = (s.llm_provider as Provider) || "gemini";
    const current = (s.llm_model || "").trim() || getDefaultModelForProvider(p);
    setProvider(p);
    setModel(current);
    setCustomModel(!PROVIDER_MODELS[p].some((m) => m.id === current));
  }, [s]);

  const setKey = (name: KeyName) => (value: string) => setKeys((k) => ({ ...k, [name]: value }));
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["appSettings"] });
    await qc.invalidateQueries({ queryKey: ["health"] });
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await act(async () => {
      const payload: Record<string, string> = {
        llm_provider: provider,
        llm_model: model.trim() || getDefaultModelForProvider(provider),
      };
      if (keys.gemini) payload.gemini_api_key = keys.gemini;
      if (keys.anthropic) payload.anthropic_api_key = keys.anthropic;
      if (keys.openai) payload.openai_api_key = keys.openai;
      if (keys.github) payload.github_token = keys.github;
      await one<AppSettings>("/settings", payload);
      await refresh();
      setKeys(emptyKeys);
      setSaved(true);
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 3000);
    });
  }

  async function testConnection(name: KeyName) {
    setTestStatus({ testing: true, result: null });
    try {
      const fallbackModel = name === "github" ? "" : getDefaultModelForProvider(name);
      const result = await one<SettingsTestResult>("/settings/test", {
        provider: name,
        api_key: keys[name] || undefined,
        model: model.trim() || fallbackModel,
      });
      setTestStatus({ testing: false, result });
    } catch (err) {
      setTestStatus({
        testing: false,
        result: {
          success: false,
          message: err instanceof Error ? err.message : "Error testing connection",
          latency_ms: 0,
        },
      });
    }
  }

  async function clearKeys() {
    await act(async () => {
      await one<AppSettings>("/settings", {
        gemini_api_key: "",
        anthropic_api_key: "",
        openai_api_key: "",
        github_token: "",
      });
      await refresh();
      setKeys(emptyKeys);
      setTestStatus({ testing: false, result: null });
    });
  }

  const nothingConfigured =
    !s?.gemini_api_key_configured &&
    !s?.anthropic_api_key_configured &&
    !s?.openai_api_key_configured &&
    !s?.github_token_configured;
  const result = testStatus.result;

  return (
    <>
      <div className="eyebrow">{t.settingsEyebrow}</div>
      <h1>{t.settingsTitle}</h1>
      <p className="intro">{t.settingsIntro}</p>

      {saved && (
        <div className="success-banner" role="status">
          <span className="inline-row">
            <Check size={18} />
            {t.settingsSaved}
          </span>
          <button type="button" className="banner-close" aria-label={t.dismiss} onClick={() => setSaved(false)}>
            <X size={16} />
          </button>
        </div>
      )}
      {result && (
        <div className={result.success ? "success-banner" : "error"} role="alert">
          <span className="inline-row">
            {result.success ? <Check size={18} /> : <X size={18} />}
            {result.message}
            {result.latency_ms > 0 && ` (${result.latency_ms}ms)`}
          </span>
          <button
            type="button"
            className="banner-close"
            aria-label={t.dismiss}
            onClick={() => setTestStatus({ testing: false, result: null })}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <form className="card form" onSubmit={save}>
        <h2>{t.aiProviderSection}</h2>
        <label htmlFor={providerId}>{t.aiProviderSelect}</label>
        <select
          id={providerId}
          value={provider}
          onChange={(e) => {
            const p = e.target.value as Provider;
            setProvider(p);
            setModel(getDefaultModelForProvider(p));
            setCustomModel(false);
          }}
        >
          <option value="gemini">{t.geminiOption}</option>
          <option value="anthropic">{t.anthropicOption}</option>
          <option value="openai">{t.openaiOption}</option>
        </select>

        <div className="settings-block">
          <label htmlFor={modelId}>{t.modelSelectorLabel}</label>
          <select
            id={modelId}
            value={customModel ? "__custom__" : model}
            onChange={(e) => {
              if (e.target.value === "__custom__") {
                setCustomModel(true);
              } else {
                setCustomModel(false);
                setModel(e.target.value);
              }
            }}
          >
            <optgroup label={t.modelPresetsLabel}>
              {PROVIDER_MODELS[provider].map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {getModelTagBadge(m.tag, t)} ({m.id})
                </option>
              ))}
            </optgroup>
            <option value="__custom__">{t.customModelOption}</option>
          </select>

          <div className="model-grid">
            {PROVIDER_MODELS[provider].map((m) => {
              const isSelected = !customModel && model === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={isSelected}
                  className={`model-card${isSelected ? " selected" : ""}`}
                  onClick={() => {
                    setModel(m.id);
                    setCustomModel(false);
                  }}
                >
                  <span className="model-card-head">
                    <span className="model-card-name">{m.name}</span>
                    <span
                      className={`pill pill-sm ${
                        m.tag === "flagship"
                          ? "supported"
                          : m.tag === "fast"
                            ? "partially_supported"
                            : "not_evidenced"
                      }`}
                    >
                      {getModelTagBadge(m.tag, t)}
                    </span>
                  </span>
                  <span className="quiet">{m.desc[lang] || m.desc.en}</span>
                </button>
              );
            })}
          </div>

          {customModel && (
            <div className="custom-model">
              <label htmlFor={customModelId}>{t.customModelLabel}</label>
              <input
                id={customModelId}
                type="text"
                className="mono"
                placeholder={t.customModelPlaceholder}
                value={model}
                onChange={(e) => setModel(e.target.value)}
                autoFocus
              />
              <span className="quiet">{t.customModelHelp}</span>
            </div>
          )}
        </div>

        <ApiKeyField
          label={t.geminiApiKeyLabel}
          configured={!!s?.gemini_api_key_configured}
          preview={s?.gemini_api_key_preview}
          badgeSuffix={s?.gemini_is_server_default ? `(${t.keyServerDefaultBadge})` : `(${t.keyCustomBadge})`}
          helper={s?.gemini_is_server_default ? t.serverDefaultHelper : undefined}
          placeholder="AIzaSy..."
          value={keys.gemini}
          onChange={setKey("gemini")}
          link={{ href: "https://aistudio.google.com/app/apikey", label: t.getGeminiKeyLink }}
          testLabel={`${t.testConnection} (Gemini)`}
          testing={testStatus.testing}
          onTest={() => testConnection("gemini")}
        />
        <ApiKeyField
          label={t.anthropicApiKeyLabel}
          configured={!!s?.anthropic_api_key_configured}
          preview={s?.anthropic_api_key_preview}
          placeholder="sk-ant-api03-..."
          value={keys.anthropic}
          onChange={setKey("anthropic")}
          link={{ href: "https://console.anthropic.com/settings/keys", label: t.getAnthropicKeyLink }}
          testLabel={`${t.testConnection} (Anthropic)`}
          testing={testStatus.testing}
          onTest={() => testConnection("anthropic")}
        />
        <ApiKeyField
          label={t.openaiApiKeyLabel}
          configured={!!s?.openai_api_key_configured}
          preview={s?.openai_api_key_preview}
          placeholder="sk-proj-..."
          value={keys.openai}
          onChange={setKey("openai")}
          link={{ href: "https://platform.openai.com/api-keys", label: t.getOpenaiKeyLink }}
          testLabel={`${t.testConnection} (OpenAI)`}
          testing={testStatus.testing}
          onTest={() => testConnection("openai")}
        />
        <div className="settings-divider">
          <ApiKeyField
            label={t.githubTokenLabel}
            description={t.githubTokenDesc}
            configured={!!s?.github_token_configured}
            preview={s?.github_token_preview}
            placeholder="ghp_..."
            value={keys.github}
            onChange={setKey("github")}
            link={{ href: "https://github.com/settings/tokens", label: t.getGithubTokenLink }}
            testLabel={`${t.testConnection} (GitHub)`}
            testing={testStatus.testing}
            onTest={() => testConnection("github")}
          />
        </div>

        <div className="inline-row wrap form-actions">
          <button type="submit" className="primary" disabled={busy}>
            <Check size={16} />
            {t.saveSettings}
          </button>
          <button type="button" onClick={clearKeys} disabled={busy || nothingConfigured}>
            {t.clearKeys}
          </button>
        </div>
      </form>

      <div className="notice">
        <p>{t.securityNote}</p>
      </div>
    </>
  );
}

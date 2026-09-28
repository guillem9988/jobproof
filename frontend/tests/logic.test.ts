import { describe, it, expect } from "vitest";
import { counts } from "../src/api";
import { translations, getStatusLabels, type Lang, type Translations } from "../src/i18n";

describe("evidence summary", () => {
  it("counts all four states without inventing a percentage", () => {
    expect(
      counts([
        { status: "partial" },
        { status: "supported" },
        { status: "partial" },
      ]),
    ).toEqual([
      { status: "supported", count: 1 },
      { status: "partial", count: 2 },
      { status: "not_evidenced", count: 0 },
      { status: "not_verifiable_from_code", count: 0 },
    ]);
  });
});

describe("i18n translations", () => {
  const languages: Lang[] = ["ca", "en", "es"];

  it("has non-empty string values for all keys across all supported languages", () => {
    const enKeys = Object.keys(translations.en) as (keyof Translations)[];
    expect(enKeys.length).toBeGreaterThan(60);

    for (const lang of languages) {
      const dict = translations[lang];
      for (const key of enKeys) {
        expect(dict[key], `Missing or empty key '${key}' in language '${lang}'`).toBeDefined();
        expect(typeof dict[key]).toBe("string");
        expect(dict[key].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("provides localized status labels for all four states", () => {
    const caLabels = getStatusLabels(translations.ca);
    expect(caLabels.supported).toBe("Demostrat");
    expect(caLabels.partial).toBe("Parcial");
    expect(caLabels.not_evidenced).toBe("Sense evidència");
    expect(caLabels.not_verifiable_from_code).toBe("No verificable per codi");

    const esLabels = getStatusLabels(translations.es);
    expect(esLabels.supported).toBe("Demostrado");
    expect(esLabels.partial).toBe("Parcial");
    expect(esLabels.not_evidenced).toBe("Sin evidencia");
    expect(esLabels.not_verifiable_from_code).toBe("No verificable por código");

    const enLabels = getStatusLabels(translations.en);
    expect(enLabels.supported).toBe("Supported");
    expect(enLabels.partial).toBe("Partial");
    expect(enLabels.not_evidenced).toBe("Not evidenced");
    expect(enLabels.not_verifiable_from_code).toBe("Not verifiable from code");
  });
});


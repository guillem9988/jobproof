import type { Translations } from "./i18n";

export type Provider = "gemini" | "anthropic" | "openai";

const copy = {
  brand: "JobProof",
  tagline: "Make your experience explainable.",
  subtitle:
    "Connect a job’s requirements to evidence in your projects. Know what you can support, and what needs an honest conversation.",
};

export interface ModelPreset {
  id: string;
  name: string;
  tag: "flagship" | "balanced" | "fast" | "reasoning" | "max_power" | "agentic";
  desc: {
    ca: string;
    en: string;
    es: string;
  };
}

export const PROVIDER_MODELS: Record<Provider, ModelPreset[]> = {
  gemini: [
    {
      id: "gemini-3.8-flash",
      name: "Gemini 3.8 Flash",
      tag: "flagship",
      desc: {
        ca: "Darrera generació d'alta eficiència i precisió per a anàlisi de codi.",
        en: "Latest generation high-efficiency model, optimized for code analysis.",
        es: "Última generación de alta eficiencia y precisión para análisis de código.",
      },
    },
    {
      id: "gemini-3.8-flash-lite",
      name: "Gemini 3.8 Flash-Lite",
      tag: "fast",
      desc: {
        ca: "Model lleuger optimitzat per a velocitat màxima i consum mínim de quota.",
        en: "Lightweight model optimized for maximum speed and minimal quota usage.",
        es: "Modelo ligero optimizado para máxima velocidad y consumo mínimo de cuota.",
      },
    },
    {
      id: "gemini-3.7-flash",
      name: "Gemini 3.7 Flash",
      tag: "agentic",
      desc: {
        ca: "Optimitzat per a fluxos agentic i comprensió profunda de projectes.",
        en: "Optimized for agentic workflows and deep project understanding.",
        es: "Optimizado para flujos agentic y comprensión profunda de proyectos.",
      },
    },
    {
      id: "gemini-3.1-pro",
      name: "Gemini 3.1 Pro",
      tag: "reasoning",
      desc: {
        ca: "Màxim raonament per a auditories de repositoris complexos i arquitectura.",
        en: "Maximum reasoning capacity for complex repositories and architecture audits.",
        es: "Máximo razonamiento para auditorías de repositorios complejos y arquitectura.",
      },
    },
  ],
  openai: [
    {
      id: "gpt-6-sol",
      name: "GPT-6 Sol",
      tag: "flagship",
      desc: {
        ca: "Darrera generació d'OpenAI, equilibri òptim de velocitat i capacitat tècnica.",
        en: "Latest OpenAI generation, optimal balance of speed and technical capacity.",
        es: "Última generación de OpenAI, equilibrio óptimo de velocidad y capacidad técnica.",
      },
    },
    {
      id: "gpt-6-astra",
      name: "GPT-6 Astra",
      tag: "max_power",
      desc: {
        ca: "Frontier model insígnia per a tasques d'enginyeria, raonament i multimodalitat.",
        en: "Frontier flagship model for engineering, reasoning, and multimodality.",
        es: "Frontier model insignia para tareas de ingeniería, razonamiento y multimodalidad.",
      },
    },
    {
      id: "gpt-6-luna",
      name: "GPT-6 Luna",
      tag: "fast",
      desc: {
        ca: "Model àgil i ultra econòmic dissenyat per a respostes d'alta velocitat.",
        en: "Agile, economical model designed for high-speed responses.",
        es: "Modelo ágil y ultra económico diseñado para respuestas de alta velocidad.",
      },
    },
  ],
  anthropic: [
    {
      id: "claude-sonnet-5-5",
      name: "Claude Sonnet 5.5",
      tag: "flagship",
      desc: {
        ca: "Darrera generació 5.5 d'Anthropic, líder en anàlisi de codi i arquitectura.",
        en: "Anthropic's latest 5.5 generation, leader in code analysis and architecture.",
        es: "Última generación 5.5 de Anthropic, líder en análisis de código y arquitectura.",
      },
    },
    {
      id: "claude-opus-5-5",
      name: "Claude Opus 5.5",
      tag: "max_power",
      desc: {
        ca: "Model SOTA d'alta capacitat per a lògica i raonament exigent.",
        en: "SOTA high-capacity model for demanding logic and reasoning.",
        es: "Modelo SOTA de alta capacidad para lógica y razonamiento exigente.",
      },
    },
    {
      id: "claude-fable-5-1",
      name: "Claude Fable 5.1",
      tag: "reasoning",
      desc: {
        ca: "Raonament avançat per a tasques d'enginyeria de programari i auditoria.",
        en: "Advanced reasoning for software engineering and code auditing tasks.",
        es: "Razonamiento avanzado para tareas de ingeniería de software y auditoría.",
      },
    },
    {
      id: "claude-haiku-4-5",
      name: "Claude Haiku 4.5",
      tag: "fast",
      desc: {
        ca: "Execució ultraràpida i baix cost per a tasques d'alt volum.",
        en: "Ultra-fast execution and low cost for high-throughput tasks.",
        es: "Ejecución ultrarrápida y bajo coste para tareas de alto volumen.",
      },
    },
  ],
};

export function getModelTagBadge(tag: ModelPreset["tag"], t: Translations): string {
  switch (tag) {
    case "flagship":
      return t.modelBadgeFlagship;
    case "balanced":
      return t.modelBadgeBalanced;
    case "fast":
      return t.modelBadgeFast;
    case "reasoning":
      return t.modelBadgeReasoning;
    case "max_power":
      return t.modelBadgeMaxPower;
    case "agentic":
      return t.modelBadgeAgentic;
  }
}

export function getDefaultModelForProvider(p: Provider): string {
  return PROVIDER_MODELS[p][0].id;
}


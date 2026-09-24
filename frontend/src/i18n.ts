export type Lang = "ca" | "en" | "es";

export interface Translations {
  brand: string;
  tagline: string;
  subtitle: string;
  navProjects: string;
  navHistory: string;
  navNewAnalysis: string;
  tryDemo: string;
  demoBadge: string;
  demoTitle: string;
  demoDesc: string;
  aiConfigured: string;
  aiNotConfigured: string;
  allConclusions: string;
  allPriorities: string;
  allCategories: string;
  allProjects: string;
  searchFilter: string;
  searchPlaceholder: string;
  statusSupported: string;
  statusPartial: string;
  statusNotEvidenced: string;
  statusNotVerifiable: string;
  copyMarkdown: string;
  copied: string;
  markdown: string;
  json: string;
  evidenceReport: string;
  fixtureDemo: string;
  reviewConclusion: string;
  saveReview: string;
  effectiveConclusion: string;
  reasonLabel: string;
  reasonPlaceholder: string;
  interviewPrepTitle: string;
  interviewQuestions: string;
  technicalPoints: string;
  actionableRecommendations: string;
  honestLimitations: string;
  personalPrompts: string;
  citations: string;
  lines: string;
  openGithubCommit: string;
  closeEvidence: string;
  exactCitationVerified: string;
}

export const translations: Record<Lang, Translations> = {
  ca: {
    brand: "JobProof",
    tagline: "Fes que la teva experiència sigui explicable.",
    subtitle:
      "Connecta els requisits d'una oferta amb evidències als teus projectes. Descobreix què pots demostrar i què necessita una conversa honesta.",
    navProjects: "Projectes",
    navHistory: "Historial",
    navNewAnalysis: "Nova anàlisi",
    tryDemo: "Provar demo de fixtures",
    demoBadge: "SENSE CONFIGURACIÓ",
    demoTitle: "Mira com són les evidències reals.",
    demoDesc:
      "Explora dos projectes ficticis i una oferta de feina. Inclou coincidències clares, mancances i afirmacions que el codi no pot demostrar.",
    aiConfigured: "Proveïdor d'IA configurat",
    aiNotConfigured: "L'anàlisi real necessita una clau de Gemini o Anthropic al servidor.",
    allConclusions: "Totes les conclusions",
    allPriorities: "Totes les prioritats",
    allCategories: "Totes les categories",
    allProjects: "Tots els projectes",
    searchFilter: "Cercar text",
    searchPlaceholder: "Filtra per paraula clau o tecnologia (ex: python, docker)...",
    statusSupported: "Demostrat",
    statusPartial: "Parcial",
    statusNotEvidenced: "Sense evidència",
    statusNotVerifiable: "No verificable per codi",
    copyMarkdown: "Copiar Markdown",
    copied: "Copiat!",
    markdown: "Descarregar Markdown",
    json: "Descarregar JSON",
    evidenceReport: "INFORME D'EVIDÈNCIES",
    fixtureDemo: "DEMO DE FIXTURES",
    reviewConclusion: "Revisar conclusió",
    saveReview: "Desar revisió humana",
    effectiveConclusion: "Conclusió efectiva",
    reasonLabel: "Motiu de la revisió",
    reasonPlaceholder: "Explica per què canvies aquesta conclusió...",
    interviewPrepTitle: "Preparació de l'entrevista",
    interviewQuestions: "Preguntes tècniques que et poden fer",
    technicalPoints: "Punts clau que hauries de saber explicar",
    actionableRecommendations: "Recomanacions de millora",
    honestLimitations: "Limitacions per comentar honestament",
    personalPrompts: "Preguntes per concretar la teva aportació",
    citations: "Cites d'evidència",
    lines: "línies",
    openGithubCommit: "Obrir commit fixat a GitHub",
    closeEvidence: "Tancar evidència",
    exactCitationVerified: "Cita exacta verificada",
  },
  en: {
    brand: "JobProof",
    tagline: "Make your experience explainable.",
    subtitle:
      "Connect a job’s requirements to evidence in your projects. Know what you can support, and what needs an honest conversation.",
    navProjects: "Projects",
    navHistory: "History",
    navNewAnalysis: "New analysis",
    tryDemo: "Try fixture demo",
    demoBadge: "NO SETUP NEEDED",
    demoTitle: "See what evidence looks like.",
    demoDesc:
      "Explore two fictional projects and a job posting. Includes clear matches, gaps, and claims that code cannot prove.",
    aiConfigured: "AI provider configured",
    aiNotConfigured: "Real analysis needs an Anthropic or Gemini API key on the server.",
    allConclusions: "All conclusions",
    allPriorities: "All priorities",
    allCategories: "All categories",
    allProjects: "All projects",
    searchFilter: "Search text",
    searchPlaceholder: "Filter by keyword (e.g. python, docker)...",
    statusSupported: "Supported",
    statusPartial: "Partial",
    statusNotEvidenced: "Not evidenced",
    statusNotVerifiable: "Not verifiable from code",
    copyMarkdown: "Copy Markdown",
    copied: "Copied!",
    markdown: "Download Markdown",
    json: "Download JSON",
    evidenceReport: "EVIDENCE REPORT",
    fixtureDemo: "FIXTURE DEMO",
    reviewConclusion: "Review conclusion",
    saveReview: "Save human review",
    effectiveConclusion: "Effective conclusion",
    reasonLabel: "Reason",
    reasonPlaceholder: "Explain why you are changing this conclusion...",
    interviewPrepTitle: "Interview preparation",
    interviewQuestions: "Questions you should expect",
    technicalPoints: "Technical points to explain",
    actionableRecommendations: "Actionable recommendations",
    honestLimitations: "Honest limitations to state",
    personalPrompts: "Prompts to complete personal details",
    citations: "Evidence citations",
    lines: "lines",
    openGithubCommit: "Open fixed GitHub commit",
    closeEvidence: "Close evidence",
    exactCitationVerified: "Exact citation verified",
  },
  es: {
    brand: "JobProof",
    tagline: "Haz que tu experiencia sea explicable.",
    subtitle:
      "Conecta los requisitos de una oferta con evidencias en tus proyectos. Descubre qué puedes demostrar y qué necesita una conversación honesta.",
    navProjects: "Proyectos",
    navHistory: "Historial",
    navNewAnalysis: "Nuevo análisis",
    tryDemo: "Probar demo de fixtures",
    demoBadge: "SIN CONFIGURACIÓN",
    demoTitle: "Mira cómo son las evidencias reales.",
    demoDesc:
      "Explora dos proyectos ficticios y una oferta de empleo. Incluye coincidencias claras, carencias y afirmaciones que el código no puede demostrar.",
    aiConfigured: "Proveedor de IA configurado",
    aiNotConfigured: "El análisis real necesita una clave de Gemini o Anthropic en el servidor.",
    allConclusions: "Todas las conclusiones",
    allPriorities: "Todas las prioridades",
    allCategories: "Todas las categorías",
    allProjects: "Todos los proyectos",
    searchFilter: "Buscar texto",
    searchPlaceholder: "Filtrar por palabra clave o tecnología (ej: python, docker)...",
    statusSupported: "Demostrado",
    statusPartial: "Parcial",
    statusNotEvidenced: "Sin evidencia",
    statusNotVerifiable: "No verificable por código",
    copyMarkdown: "Copiar Markdown",
    copied: "¡Copiado!",
    markdown: "Descargar Markdown",
    json: "Descargar JSON",
    evidenceReport: "INFORME DE EVIDENCIAS",
    fixtureDemo: "DEMO DE FIXTURES",
    reviewConclusion: "Revisar conclusión",
    saveReview: "Guardar revisión humana",
    effectiveConclusion: "Conclusión efectiva",
    reasonLabel: "Motivo de la revisión",
    reasonPlaceholder: "Explica por qué cambias esta conclusión...",
    interviewPrepTitle: "Preparación de la entrevista",
    interviewQuestions: "Preguntas técnicas que te pueden hacer",
    technicalPoints: "Puntos clave que deberías saber explicar",
    actionableRecommendations: "Recomendaciones de mejora",
    honestLimitations: "Limitaciones para comentar honestamente",
    personalPrompts: "Preguntas para concretar tu aportación",
    citations: "Citas de evidencia",
    lines: "líneas",
    openGithubCommit: "Abrir commit fijado en GitHub",
    closeEvidence: "Cerrar evidencia",
    exactCitationVerified: "Cita exacta verificada",
  },
};

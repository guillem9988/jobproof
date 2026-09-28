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
  citationVerified: string;
  // Local project
  sourceTypeGithub: string;
  sourceTypeLocal: string;
  localPathLabel: string;
  localPathPlaceholder: string;
  importLocalDir: string;
  badgeLocalFolder: string;
  badgePublicRepo: string;
  // Tabs in Report
  tabEvidence: string;
  tabResumeBullets: string;
  tabInterviewMode: string;
  // Resume Bullets
  resumeBulletsTitle: string;
  resumeBulletsDesc: string;
  copyAllBullets: string;
  copiedAllBullets: string;
  noEvidenceBullets: string;
  // Interview Simulator
  interviewSimTitle: string;
  interviewSimDesc: string;
  questionOf: string;
  timerStart: string;
  timerPause: string;
  timerReset: string;
  draftYourAnswer: string;
  draftPlaceholder: string;
  revealAnswer: string;
  hideAnswer: string;
  prevQuestion: string;
  nextQuestion: string;
  // Theme
  themeToggleDark: string;
  themeToggleLight: string;
  // Additional comprehensive UI labels
  priorityRequired: string;
  priorityPreferred: string;
  priorityUnspecified: string;
  statusLabel: string;
  priorityLabel: string;
  categoryLabel: string;
  projectLabel: string;
  requirementsAndEvidence: string;
  noMatchingConclusions: string;
  nextSteps: string;
  nextStepsDesc: string;
  expected: string;
  reportProvenance: string;
  logicalCalls: string;
  inputTokens: string;
  outputTokens: string;
  commitLabel: string;
  footerDisclaimer: string;
  removeEvidence: string;
  addEvidenceFromSnapshot: string;
  noAdditionalEvidence: string;
  humanReviewed: string;
  invalidCitationsRejected: string;
  sourceEvidence: string;
  codeVerificationNotice: string;
  localFixtureNoGithub: string;
  progressBuildingReport: string;
  progressPreparingTask: string;
  progressNotice: string;
  cancelTask: string;
  retryExplicitly: string;
  historyTitle: string;
  historyEyebrow: string;
  historyDesc: string;
  emptyHistoryTitle: string;
  emptyHistoryDesc: string;
  recentAnalyses: string;
  viewHistory: string;
  jobReviewTitle: string;
  jobStartTitle: string;
  jobReviewIntro: string;
  jobStartIntro: string;
  jobTitleLabel: string;
  companyLabel: string;
  referenceUrlLabel: string;
  languageLabel: string;
  jobPostingLabel: string;
  savePosting: string;
  resumePosting: string;
  extractRequirements: string;
  extractAgain: string;
  includeInAnalysis: string;
  requirementLabel: string;
  verifiableFromCode: string;
  codeEvidence: string;
  limited: string;
  externalEvidenceNeeded: string;
  addManualRequirement: string;
  selectProjectSnapshots: string;
  selectProjectDesc: string;
  saveReviewedRequirements: string;
  analyzeEvidence: string;
  maxRequirementsNote: string;
  yourProjects: string;
  projectsEyebrow: string;
  projectsIntro: string;
  projectNameOptional: string;
  branchOrCommitOptional: string;
  yourContribution: string;
  importRepository: string;
  personalContributionNotDeclared: string;
  importNewSnapshot: string;
  files: string;
  filesExcluded: string;
  bytesImported: string;
  allEligibleImported: string;
  partialImport: string;
  showFilesInventory: string;
  hideFilesInventory: string;
  decisionsTradeoffs: string;
  badgePrivateLocal: string;
  backendUnreachable: string;
  deterministicFixtures: string;
  homeCardStartTitle: string;
  homeCardStartDesc: string;
  principle1Title: string;
  principle1Desc: string;
  principle2Title: string;
  principle2Desc: string;
  principle3Title: string;
  principle3Desc: string;
  badgeFixture: string;
  fixtureDemoNotice: string;
  realAnalysisNotice: string;
  originalPostingSummary: string;
  manuallyAddedNoCitation: string;
  postingExcerptPrefix: string;
  characterPrefix: string;
  analysisPartialNotice: string;
  takeItIntoInterview: string;
  noInterviewQuestions: string;
  ofRequirements: string;
  projectsCount: string;
  yourWorkYourEvidence: string;
  applicationWorkspace: string;
  waitingForTaskStatus: string;
  navSettings: string;
  settingsTitle: string;
  settingsEyebrow: string;
  settingsIntro: string;
  aiProviderSection: string;
  aiProviderSelect: string;
  geminiOption: string;
  anthropicOption: string;
  openaiOption: string;
  modelLabel: string;
  geminiApiKeyLabel: string;
  anthropicApiKeyLabel: string;
  openaiApiKeyLabel: string;
  githubTokenLabel: string;
  githubTokenDesc: string;
  keyConfiguredBadge: string;
  keyNotConfiguredBadge: string;
  saveSettings: string;
  settingsSaved: string;
  testConnection: string;
  testingConnection: string;
  clearKeys: string;
  getGeminiKeyLink: string;
  getAnthropicKeyLink: string;
  getOpenaiKeyLink: string;
  getGithubTokenLink: string;
  activeBadge: string;
  openSettingsButton: string;
  securityNote: string;
  // Cover Letter
  tabCoverLetter: string;
  coverLetterTitle: string;
  coverLetterDesc: string;
  generateCoverLetter: string;
  regenerateCoverLetter: string;
  generatingCoverLetter: string;
  copyCoverLetter: string;
  copiedCoverLetter: string;
  downloadCoverLetter: string;
  toneLabel: string;
  toneBalanced: string;
  toneTechnical: string;
  toneConcise: string;
  evidenceHighlighted: string;
  coverLetterHonestyNotice: string;
  // Interactive Mock Interview
  interviewModeCards: string;
  interviewModeChat: string;
  startInterviewChat: string;
  interviewChatIntro: string;
  candidateInputPlaceholder: string;
  sendAnswer: string;
  interviewerRole: string;
  candidateRole: string;
  feedbackFromInterviewer: string;
  resetInterview: string;
  interviewCompletedBadge: string;
  interviewThinking: string;
  githubUrlPlaceholder: string;
  customExcludesLabel: string;
  customExcludesPlaceholder: string;
  privateRepoTokenNotice: string;
  fetchJobFromUrl: string;
  fetchJobButton: string;
  fetchingJobUrl: string;
  fetchJobUrlPlaceholder: string;
  uploadJobFile: string;
  fileLoadedSuccess: string;
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
    citationVerified: "cita verificada",
    // Local project
    sourceTypeGithub: "Repositori públic de GitHub",
    sourceTypeLocal: "Carpeta local (directori)",
    localPathLabel: "Ruta de la carpeta local",
    localPathPlaceholder: "/Users/el-teu-usuari/projectes/el-meu-projecte",
    importLocalDir: "Importar carpeta local",
    badgeLocalFolder: "Carpeta local",
    badgePublicRepo: "Repositori públic",
    // Tabs in Report
    tabEvidence: "Evidències i Auditoria",
    tabResumeBullets: "Punts pel Currículum (CV)",
    tabInterviewMode: "Simulador d'Entrevista",
    // Resume Bullets
    resumeBulletsTitle: "Punts de CV basats estrictament en evidències",
    resumeBulletsDesc: "Afirma únicament el que està demostrat pel teu codi. Cada punt cita els fitxers i línies exactes sense inventar afirmacions de producció.",
    copyAllBullets: "Copiar tots els punts",
    copiedAllBullets: "Punts copiats!",
    noEvidenceBullets: "No hi ha cap requisit amb estat Demostrat o Parcial amb evidències verificades.",
    // Interview Simulator
    interviewSimTitle: "Mode d'entrenament per entrevistes tècniques",
    interviewSimDesc: "Practica les teves respostes amb cronòmetre abans de revelar els punts clau, decisions d'arquitectura i cites de codi.",
    questionOf: "Pregunta",
    timerStart: "Iniciar cronòmetre",
    timerPause: "Pausar",
    timerReset: "Reiniciar",
    draftYourAnswer: "Escriu la teva resposta / esquema mental:",
    draftPlaceholder: "Com explicaries aquesta implementació, el compromís arquitectònic i les teves decisions...",
    revealAnswer: "Revelar punts clau i citacions de codi",
    hideAnswer: "Amagar detalls",
    prevQuestion: "Anterior",
    nextQuestion: "Següent",
    // Theme
    themeToggleDark: "Mode fosc",
    themeToggleLight: "Mode clar",
    // Additional UI labels
    priorityRequired: "Requerit",
    priorityPreferred: "Preferible",
    priorityUnspecified: "Sense especificar",
    statusLabel: "Estat",
    priorityLabel: "Prioritat",
    categoryLabel: "Categoria",
    projectLabel: "Projecte",
    requirementsAndEvidence: "Requisits i evidències",
    noMatchingConclusions: "Cap conclusió coincideix amb aquests filtres.",
    nextSteps: "Passos següents",
    nextStepsDesc: "Generat a partir de l'anàlisi original. Revisa aquests suggeriments després de la teva valoració.",
    expected: "Esperat:",
    reportProvenance: "Procedència de l'informe",
    logicalCalls: "crides lògiques",
    inputTokens: "tokens d'entrada",
    outputTokens: "tokens de sortida",
    commitLabel: "Commit",
    footerDisclaimer: "JobProof · L'evidència recolza una conversa honesta. No certifica competència professional.",
    removeEvidence: "Eliminar evidència:",
    addEvidenceFromSnapshot: "Afegir evidència d'un fragment analitzat",
    noAdditionalEvidence: "Sense evidència addicional",
    humanReviewed: "Revisat per una persona · Original:",
    invalidCitationsRejected: "cites no vàlides rebutjades.",
    sourceEvidence: "EVIDÈNCIA DEL CODI FONT",
    codeVerificationNotice: "La presència del text està verificada. La rellevància i correcció requereixen criteri professional. El codi importat mai s'ha executat.",
    localFixtureNoGithub: "Projecte local · Sense enllaç a GitHub",
    progressBuildingReport: "Generant el teu informe d'evidències",
    progressPreparingTask: "Preparant tasca",
    progressNotice: "El progrés reflecteix les etapes completades. Pots recarregar aquesta pàgina amb seguretat.",
    cancelTask: "Cancel·lar tasca",
    retryExplicitly: "Tornar i reintentar",
    historyTitle: "Historial d'anàlisis",
    historyEyebrow: "LA TEVA TRAÇABILITAT",
    historyDesc: "Cada informe conserva els seus requisits, versions del codi i conclusions originals.",
    emptyHistoryTitle: "El teu primer informe comença aquí.",
    emptyHistoryDesc: "Prova la demo o afegeix una oferta de feina per començar.",
    recentAnalyses: "Anàlisis recents",
    viewHistory: "Veure historial",
    jobReviewTitle: "Revisa els requisits",
    jobStartTitle: "Comença amb la posició",
    jobReviewIntro: "Conserva prioritats i alternatives. Tria quins requisits vols analitzar.",
    jobStartIntro: "Enganxa l'oferta de feina original en català, anglès o castellà.",
    jobTitleLabel: "Títol de la posició",
    companyLabel: "Empresa (opcional)",
    referenceUrlLabel: "URL de referència (opcional, mai visitada)",
    languageLabel: "Idioma",
    jobPostingLabel: "Text de l'oferta de feina",
    savePosting: "Desar oferta",
    resumePosting: "Reprendre",
    extractRequirements: "Extreure requisits",
    extractAgain: "Extreure de nou",
    includeInAnalysis: "Incloure a l'anàlisi",
    requirementLabel: "Requisit",
    verifiableFromCode: "Verificable per codi",
    codeEvidence: "Evidència al codi",
    limited: "Limitada",
    externalEvidenceNeeded: "Cal evidència externa",
    addManualRequirement: "Afegir requisit manual",
    selectProjectSnapshots: "Selecciona versions dels projectes",
    selectProjectDesc: "Fins a tres projectes. Una versió per projecte.",
    saveReviewedRequirements: "Desar requisits revisats",
    analyzeEvidence: "Analitzar evidències",
    maxRequirementsNote: "requisits seleccionats · màxim 15",
    yourProjects: "Els teus projectes",
    projectsEyebrow: "MATERIAL DE FONT",
    projectsIntro: "Importa un repositori públic o carpeta local. El codi importat mai s'executa.",
    projectNameOptional: "Nom del projecte (opcional)",
    branchOrCommitOptional: "Branca o commit (opcional)",
    yourContribution: "La teva contribució (auto-declarada, no verificada)",
    importRepository: "Importar repositori",
    personalContributionNotDeclared: "Contribució personal no declarada.",
    importNewSnapshot: "Importar nova versió",
    files: "fitxers",
    filesExcluded: "fitxers exclosos.",
    bytesImported: "bytes importats.",
    allEligibleImported: "Tots els fitxers aptes importats",
    partialImport: "Importació parcial",
    showFilesInventory: "Mostrar inventari de fitxers importats",
    hideFilesInventory: "Amagar inventari de fitxers importats",
    decisionsTradeoffs: "Decisions i compromisos d'arquitectura",
    badgePrivateLocal: "Privat · Local",
    backendUnreachable: "No es pot connectar amb el backend. Inicia l'API local al port 8000 i recarrega.",
    deterministicFixtures: "Fixtures deterministes · Sense crides externes",
    homeCardStartTitle: "Prepara una candidatura més sòlida",
    homeCardStartDesc: "Comença amb una oferta de feina i fins a tres projectes. Revisa cada conclusió contrastant-la amb la seva font original.",
    principle1Title: "01 · Fonamentat en fonts",
    principle1Desc: "Cada prova enllaça a un fitxer i línies exactes.",
    principle2Title: "02 · Honest amb les mancances",
    principle2Desc: "La manca d'evidència mai no significa manca de competència.",
    principle3Title: "03 · Tu tens el control",
    principle3Desc: "Corregeix conclusions conservant-ne la traçabilitat original.",
    badgeFixture: "Fixture",
    fixtureDemoNotice: "DEMO DE FIXTURES — Els resultats provenen de regles deterministes. Els requisits editats podrien no tenir una regla coincident.",
    realAnalysisNotice: "L'anàlisi real envia l'oferta i fragments seleccionats i anonimizats del teu repositori al proveïdor d'IA configurat. Les claus no surten del servidor.",
    originalPostingSummary: "Oferta original",
    manuallyAddedNoCitation: "Afegit manualment · sense cita a l'oferta",
    postingExcerptPrefix: "Fragment de l'oferta:",
    characterPrefix: "caràcter",
    analysisPartialNotice: "Anàlisi parcial. Els resultats incomplets no constitueixen un informe definitiu.",
    takeItIntoInterview: "PORTA-HO A L'ENTREVISTA",
    noInterviewQuestions: "No s'han generat preguntes d'entrevista per a aquest informe.",
    ofRequirements: "de",
    projectsCount: "projectes",
    yourWorkYourEvidence: "LA TEVA FEINA. LES TEVES EVIDÈNCIES.",
    applicationWorkspace: "ESPAI DE CANDIDATURA",
    waitingForTaskStatus: "Esperant l'estat de la tasca",
    navSettings: "Configuració",
    settingsTitle: "Configuració del proveïdor d'IA i API",
    settingsEyebrow: "PREFERÈNCIES LOCALS",
    settingsIntro: "Configura les claus d'API per utilitzar intel·ligència artificial real (Google Gemini o Anthropic Claude) o augmentar els límits de GitHub. Totes les claus es desen de forma local al teu servidor i mai no s'envien a servidors externs no autoritzats.",
    aiProviderSection: "Proveïdor d'IA per a l'anàlisi real",
    aiProviderSelect: "Proveïdor d'IA",
    geminiOption: "Gemini API",
    anthropicOption: "Anthropic",
    openaiOption: "OpenAI",
    modelLabel: "Model d'IA",
    geminiApiKeyLabel: "Gemini API Key",
    anthropicApiKeyLabel: "Anthropic API Key",
    openaiApiKeyLabel: "OpenAI API Key",
    githubTokenLabel: "GitHub Personal Access Token (opcional)",
    githubTokenDesc: "Augmenta el límit de peticions públiques de GitHub de 60/hora a 5.000/hora i permet repositoris privats.",
    keyConfiguredBadge: "Configurada",
    keyNotConfiguredBadge: "Sense configurar",
    saveSettings: "Desar configuració",
    settingsSaved: "Configuració desada correctament!",
    testConnection: "Provar connexió",
    testingConnection: "Provant connexió...",
    clearKeys: "Netejar claus",
    getGeminiKeyLink: "Obtenir clau de Gemini API →",
    getAnthropicKeyLink: "Obtenir clau d'Anthropic →",
    getOpenaiKeyLink: "Obtenir clau d'OpenAI →",
    getGithubTokenLink: "Crear un GitHub Personal Access Token →",
    activeBadge: "Actiu",
    openSettingsButton: "Configurar claus d'IA",
    securityNote: "Privacitat garantida: les claus s'emmagatzemen a la teva base de dades SQLite local (jobproof.db) i al fitxer .env. Només s'utilitzen per fer peticions directes a l'API del proveïdor seleccionat quan analitzes una oferta.",
    tabCoverLetter: "Carta de presentació",
    coverLetterTitle: "Carta de presentació honesta",
    coverLetterDesc: "Carta basada en evidències reals que cita els teus fitxers de codi i reconeix les limitacions comprovades.",
    generateCoverLetter: "Generar carta de presentació",
    regenerateCoverLetter: "Tornar a generar",
    generatingCoverLetter: "Generant carta...",
    copyCoverLetter: "Copiar carta",
    copiedCoverLetter: "Copiat!",
    downloadCoverLetter: "Descarregar (.md)",
    toneLabel: "To de redacció",
    toneBalanced: "Equilibrat i professional",
    toneTechnical: "Tècnic i detallat",
    toneConcise: "Concís i directe",
    evidenceHighlighted: "Evidències clau destacades en aquesta carta:",
    coverLetterHonestyNotice: "Aquesta carta només afirma allò verificat al teu codi. Revisa-la i personalitza-la abans d'enviar-la.",
    interviewModeCards: "Targetes de preguntes",
    interviewModeChat: "Simulacre interactiu amb IA",
    startInterviewChat: "Començar simulacre d'entrevista",
    interviewChatIntro: "Practica responent preguntes en viu d'un entrevistador tècnic basades en la teva auditoria de codi.",
    candidateInputPlaceholder: "Escriu la teva resposta explicant el teu enfocament tècnic...",
    sendAnswer: "Enviar resposta",
    interviewerRole: "Entrevistador tècnic",
    candidateRole: "Tu (Candidat)",
    feedbackFromInterviewer: "Avaluació de la teva resposta",
    resetInterview: "Reiniciar entrevista",
    interviewCompletedBadge: "Simulacre completat",
    interviewThinking: "L'entrevistador està avaluant...",
    githubUrlPlaceholder: "https://github.com/usuari/repo o usuari/repo",
    customExcludesLabel: "Exclusions personalitzades (separades per coma)",
    customExcludesPlaceholder: "docs, fixtures, temp, assets",
    privateRepoTokenNotice: "Token de GitHub configurat: pots importar repositoris privats!",
    fetchJobFromUrl: "Importar oferta des d'una URL",
    fetchJobButton: "Extreure text",
    fetchingJobUrl: "Extreient text de l'oferta...",
    fetchJobUrlPlaceholder: "https://exemple.cat/ofertes/desenvolupador",
    uploadJobFile: "Carregar fitxer d'oferta (.txt, .md)",
    fileLoadedSuccess: "Fitxer d'oferta carregat correctament!",
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
    citationVerified: "citation verified",
    // Local project
    sourceTypeGithub: "Public GitHub repository",
    sourceTypeLocal: "Local directory (folder)",
    localPathLabel: "Local directory path",
    localPathPlaceholder: "/Users/your-name/projects/my-repo",
    importLocalDir: "Import local directory",
    badgeLocalFolder: "Local folder",
    badgePublicRepo: "Public repository",
    // Tabs in Report
    tabEvidence: "Evidence & Audit",
    tabResumeBullets: "Resume Bullets",
    tabInterviewMode: "Interview Practice Mode",
    // Resume Bullets
    resumeBulletsTitle: "Evidence-Backed Resume Bullets",
    resumeBulletsDesc: "Claim only what is proven in your codebase. Each bullet cites exact files and line ranges with no hallucinated production or tenure claims.",
    copyAllBullets: "Copy All Bullets",
    copiedAllBullets: "Bullets Copied!",
    noEvidenceBullets: "No requirements currently marked as Supported or Partial with verified evidence.",
    // Interview Simulator
    interviewSimTitle: "Technical Interview Practice Mode",
    interviewSimDesc: "Practice answering questions with a timer before revealing technical talking points, design decisions, and cited code excerpts.",
    questionOf: "Question",
    timerStart: "Start Timer",
    timerPause: "Pause",
    timerReset: "Reset",
    draftYourAnswer: "Draft your answer / mental outline:",
    draftPlaceholder: "How would you explain your implementation, architectural trade-offs, and decisions...",
    revealAnswer: "Reveal talking points & code citations",
    hideAnswer: "Hide details",
    prevQuestion: "Previous",
    nextQuestion: "Next",
    // Theme
    themeToggleDark: "Dark mode",
    themeToggleLight: "Light mode",
    // Additional UI labels
    priorityRequired: "Required",
    priorityPreferred: "Preferred",
    priorityUnspecified: "Unspecified",
    statusLabel: "Status",
    priorityLabel: "Priority",
    categoryLabel: "Category",
    projectLabel: "Project",
    requirementsAndEvidence: "Requirements & evidence",
    noMatchingConclusions: "No conclusions match these filters.",
    nextSteps: "Next steps",
    nextStepsDesc: "Generated from the original analysis. Reconsider these suggestions after a human review.",
    expected: "Expected:",
    reportProvenance: "Report provenance",
    logicalCalls: "logical calls",
    inputTokens: "input tokens",
    outputTokens: "output tokens",
    commitLabel: "Commit",
    footerDisclaimer: "JobProof · Evidence supports a conversation. It does not certify professional competence.",
    removeEvidence: "Remove evidence:",
    addEvidenceFromSnapshot: "Add evidence from an analyzed snapshot",
    noAdditionalEvidence: "No additional evidence",
    humanReviewed: "Human reviewed · Original:",
    invalidCitationsRejected: "invalid citations rejected.",
    sourceEvidence: "SOURCE EVIDENCE",
    codeVerificationNotice: "Text presence is verified. Relevance and correctness still require judgment. Imported code was not run.",
    localFixtureNoGithub: "Local fixture · No GitHub source",
    progressBuildingReport: "Building your evidence report",
    progressPreparingTask: "Preparing task",
    progressNotice: "Progress reflects completed stages. You can reload this page safely.",
    cancelTask: "Cancel task",
    retryExplicitly: "Return and retry explicitly",
    historyTitle: "Analysis history",
    historyEyebrow: "YOUR RESEARCH TRAIL",
    historyDesc: "Each report keeps its requirements, source snapshots and original conclusions.",
    emptyHistoryTitle: "Your first report starts here.",
    emptyHistoryDesc: "Try the demo or add a job posting to begin.",
    recentAnalyses: "Recent analyses",
    viewHistory: "View history",
    jobReviewTitle: "Review the requirements",
    jobStartTitle: "Start with the role",
    jobReviewIntro: "Keep alternatives and priorities intact. Select the requirements you want to examine.",
    jobStartIntro: "Paste the original job posting in English, Catalan, or Spanish.",
    jobTitleLabel: "Job title",
    companyLabel: "Company (optional)",
    referenceUrlLabel: "Reference URL (optional, never visited)",
    languageLabel: "Language",
    jobPostingLabel: "Job posting",
    savePosting: "Save posting",
    resumePosting: "Resume",
    extractRequirements: "Extract requirements",
    extractAgain: "Extract again",
    includeInAnalysis: "Include in analysis",
    requirementLabel: "Requirement",
    verifiableFromCode: "Verifiable from code",
    codeEvidence: "Code evidence",
    limited: "Limited",
    externalEvidenceNeeded: "External evidence needed",
    addManualRequirement: "Add manual requirement",
    selectProjectSnapshots: "Select project snapshots",
    selectProjectDesc: "Up to three projects. One snapshot per project.",
    saveReviewedRequirements: "Save reviewed requirements",
    analyzeEvidence: "Analyze evidence",
    maxRequirementsNote: "requirements selected · max 15",
    yourProjects: "Your projects",
    projectsEyebrow: "SOURCE MATERIAL",
    projectsIntro: "Import a public repository at a fixed commit. Imported code is never executed.",
    projectNameOptional: "Project name (optional)",
    branchOrCommitOptional: "Branch or commit (optional)",
    yourContribution: "Your contribution (self-declared, unverified)",
    importRepository: "Import repository",
    personalContributionNotDeclared: "Personal contribution not declared.",
    importNewSnapshot: "Import new snapshot",
    files: "files",
    filesExcluded: "files excluded.",
    bytesImported: "bytes imported.",
    allEligibleImported: "All eligible fixture/tree files imported",
    partialImport: "Partial import",
    showFilesInventory: "Show imported file inventory",
    hideFilesInventory: "Hide imported file inventory",
    decisionsTradeoffs: "Decisions & Trade-offs",
    badgePrivateLocal: "Private · Local",
    backendUnreachable: "Cannot reach the backend. Start the local API on port 8000, then reload.",
    deterministicFixtures: "Deterministic fixtures · No external calls",
    homeCardStartTitle: "Prepare a stronger application",
    homeCardStartDesc: "Start with a job posting and up to three projects. Review every conclusion against its source.",
    principle1Title: "01 · Grounded in sources",
    principle1Desc: "Every proof links to a file and exact lines.",
    principle2Title: "02 · Honest about gaps",
    principle2Desc: "Missing evidence never means missing ability.",
    principle3Title: "03 · Yours to review",
    principle3Desc: "Correct conclusions while preserving their origin.",
    badgeFixture: "Fixture",
    fixtureDemoNotice: "FIXTURE DEMO — Results come from deterministic fixture rules. Edited requirements may not have a matching rule.",
    realAnalysisNotice: "Real analysis sends the posting and selected, redacted repository excerpts to the configured AI provider. Keys stay on the server.",
    originalPostingSummary: "Original posting",
    manuallyAddedNoCitation: "Manually added · no posting citation",
    postingExcerptPrefix: "Posting excerpt:",
    characterPrefix: "character",
    analysisPartialNotice: "Analysis partial. Partial results are not a complete report.",
    takeItIntoInterview: "TAKE IT INTO THE INTERVIEW",
    noInterviewQuestions: "No interview questions were generated for this report.",
    ofRequirements: "of",
    projectsCount: "projects",
    yourWorkYourEvidence: "YOUR WORK. YOUR EVIDENCE.",
    applicationWorkspace: "APPLICATION WORKSPACE",
    waitingForTaskStatus: "Waiting for task status",
    navSettings: "Settings",
    settingsTitle: "AI Provider & API Settings",
    settingsEyebrow: "LOCAL PREFERENCES",
    settingsIntro: "Configure API keys to use real AI analysis (Google Gemini or Anthropic Claude) or increase GitHub rate limits. All keys are stored locally on your server and are never sent to unauthorized third parties.",
    aiProviderSection: "Active AI Provider",
    aiProviderSelect: "AI Provider",
    geminiOption: "Gemini API",
    anthropicOption: "Anthropic",
    openaiOption: "OpenAI",
    modelLabel: "AI Model",
    geminiApiKeyLabel: "Gemini API Key",
    anthropicApiKeyLabel: "Anthropic API Key",
    openaiApiKeyLabel: "OpenAI API Key",
    githubTokenLabel: "GitHub Personal Access Token (optional)",
    githubTokenDesc: "Increases GitHub public rate limit from 60/hour to 5,000/hour and enables private repositories.",
    keyConfiguredBadge: "Configured",
    keyNotConfiguredBadge: "Not configured",
    saveSettings: "Save settings",
    settingsSaved: "Settings saved successfully!",
    testConnection: "Test connection",
    testingConnection: "Testing connection...",
    clearKeys: "Clear keys",
    getGeminiKeyLink: "Get Gemini API key →",
    getAnthropicKeyLink: "Get Anthropic API key →",
    getOpenaiKeyLink: "Get OpenAI API key →",
    getGithubTokenLink: "Create a GitHub Personal Access Token →",
    activeBadge: "Active",
    openSettingsButton: "Configure AI keys",
    securityNote: "Privacy guarantee: keys are stored in your local SQLite database (jobproof.db) and .env file. They are only used to make direct API calls to your selected provider when running an analysis.",
    tabCoverLetter: "Cover Letter",
    coverLetterTitle: "Honest Evidence Cover Letter",
    coverLetterDesc: "Evidence-grounded letter citing real repository files and acknowledging verified boundaries.",
    generateCoverLetter: "Generate Cover Letter",
    regenerateCoverLetter: "Regenerate",
    generatingCoverLetter: "Generating letter...",
    copyCoverLetter: "Copy Letter",
    copiedCoverLetter: "Copied!",
    downloadCoverLetter: "Download (.md)",
    toneLabel: "Writing tone",
    toneBalanced: "Balanced & Professional",
    toneTechnical: "Technical & Deep",
    toneConcise: "Concise & Direct",
    evidenceHighlighted: "Key evidence highlighted in this letter:",
    coverLetterHonestyNotice: "This letter only claims what is verified in your code. Review and customize before sending.",
    interviewModeCards: "Question Cards",
    interviewModeChat: "Interactive AI Mock Interview",
    startInterviewChat: "Start Mock Interview",
    interviewChatIntro: "Practice answering live questions from a technical interviewer based on your code audit.",
    candidateInputPlaceholder: "Type your answer explaining your technical approach...",
    sendAnswer: "Send Answer",
    interviewerRole: "Technical Interviewer",
    candidateRole: "You (Candidate)",
    feedbackFromInterviewer: "Feedback on your answer",
    resetInterview: "Reset Interview",
    interviewCompletedBadge: "Interview Complete",
    interviewThinking: "Interviewer is evaluating...",
    githubUrlPlaceholder: "https://github.com/owner/repo or owner/repo",
    customExcludesLabel: "Custom exclusions (comma-separated)",
    customExcludesPlaceholder: "docs, fixtures, temp, assets",
    privateRepoTokenNotice: "GitHub Token configured: you can import private repositories!",
    fetchJobFromUrl: "Import posting from URL",
    fetchJobButton: "Extract text",
    fetchingJobUrl: "Extracting job text...",
    fetchJobUrlPlaceholder: "https://example.com/careers/developer",
    uploadJobFile: "Upload job posting file (.txt, .md)",
    fileLoadedSuccess: "Job posting file loaded successfully!",
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
    citationVerified: "cita verificada",
    // Local project
    sourceTypeGithub: "Repositorio público de GitHub",
    sourceTypeLocal: "Carpeta local (directorio)",
    localPathLabel: "Ruta de la carpeta local",
    localPathPlaceholder: "/Users/tu-usuario/proyectos/mi-proyecto",
    importLocalDir: "Importar carpeta local",
    badgeLocalFolder: "Carpeta local",
    badgePublicRepo: "Repositorio público",
    // Tabs in Report
    tabEvidence: "Evidencias y Auditoría",
    tabResumeBullets: "Puntos para el Currículum (CV)",
    tabInterviewMode: "Simulador de Entrevista",
    // Resume Bullets
    resumeBulletsTitle: "Puntos de CV basados estrictamente en evidencias",
    resumeBulletsDesc: "Afirma únicamente lo demostrado en tu código. Cada punto cita archivos y líneas exactas sin inventar años de experiencia ni producción.",
    copyAllBullets: "Copiar todos los puntos",
    copiedAllBullets: "¡Puntos copiados!",
    noEvidenceBullets: "No hay requisitos con estado Demostrado o Parcial con evidencias verificadas.",
    // Interview Simulator
    interviewSimTitle: "Modo de entrenamiento para entrevistas técnicas",
    interviewSimDesc: "Practica tus respuestas con cronómetro antes de revelar los puntos clave, decisiones de arquitectura y citas de código.",
    questionOf: "Pregunta",
    timerStart: "Iniciar cronómetro",
    timerPause: "Pausar",
    timerReset: "Reiniciar",
    draftYourAnswer: "Escribe tu respuesta / esquema mental:",
    draftPlaceholder: "¿Cómo explicarías esta implementación, decisiones y compromisos técnicos...",
    revealAnswer: "Revelar puntos clave y citas de código",
    hideAnswer: "Ocultar detalles",
    prevQuestion: "Anterior",
    nextQuestion: "Siguiente",
    // Theme
    themeToggleDark: "Modo oscuro",
    themeToggleLight: "Modo claro",
    // Additional UI labels
    priorityRequired: "Requerido",
    priorityPreferred: "Preferible",
    priorityUnspecified: "Sin especificar",
    statusLabel: "Estado",
    priorityLabel: "Prioridad",
    categoryLabel: "Categoría",
    projectLabel: "Proyecto",
    requirementsAndEvidence: "Requisitos y evidencias",
    noMatchingConclusions: "Ninguna conclusión coincide con estos filtros.",
    nextSteps: "Siguientes pasos",
    nextStepsDesc: "Generado a partir del análisis original. Reconsidera estas sugerencias tras una revisión humana.",
    expected: "Esperado:",
    reportProvenance: "Procedencia del informe",
    logicalCalls: "llamadas lógicas",
    inputTokens: "tokens de entrada",
    outputTokens: "tokens de salida",
    commitLabel: "Commit",
    footerDisclaimer: "JobProof · La evidencia apoya una conversación honesta. No certifica competencia profesional.",
    removeEvidence: "Eliminar evidencia:",
    addEvidenceFromSnapshot: "Añadir evidencia de un fragmento analizado",
    noAdditionalEvidence: "Sin evidencia adicional",
    humanReviewed: "Revisado por una persona · Original:",
    invalidCitationsRejected: "citas no válidas rechazadas.",
    sourceEvidence: "EVIDENCIA DEL CÓDIGO FUENTE",
    codeVerificationNotice: "La presencia del texto está verificada. La relevancia y corrección requieren criterio profesional. El código importado no se ha ejecutado.",
    localFixtureNoGithub: "Proyecto local · Sin enlace a GitHub",
    progressBuildingReport: "Generando tu informe de evidencias",
    progressPreparingTask: "Preparando tarea",
    progressNotice: "El progreso refleja las etapas completadas. Puedes recargar esta página de forma segura.",
    cancelTask: "Cancelar tarea",
    retryExplicitly: "Volver y reintentar",
    historyTitle: "Historial de análisis",
    historyEyebrow: "TU RASTRO DE INVESTIGACIÓN",
    historyDesc: "Cada informe conserva sus requisitos, versiones de código y conclusiones originales.",
    emptyHistoryTitle: "Tu primer informe comienza aquí.",
    emptyHistoryDesc: "Prueba la demo o añade una oferta de empleo para comenzar.",
    recentAnalyses: "Análisis recientes",
    viewHistory: "Ver historial",
    jobReviewTitle: "Revisa los requisitos",
    jobStartTitle: "Comienza con la posición",
    jobReviewIntro: "Conserva prioridades y alternativas. Elige qué requisitos quieres analizar.",
    jobStartIntro: "Pega la oferta de empleo original en catalán, inglés o español.",
    jobTitleLabel: "Título de la posición",
    companyLabel: "Empresa (opcional)",
    referenceUrlLabel: "URL de referencia (opcional, nunca visitada)",
    languageLabel: "Idioma",
    jobPostingLabel: "Texto de la oferta de empleo",
    savePosting: "Guardar oferta",
    resumePosting: "Reanudar",
    extractRequirements: "Extraer requisitos",
    extractAgain: "Extraer de nuevo",
    includeInAnalysis: "Incluir en el análisis",
    requirementLabel: "Requisito",
    verifiableFromCode: "Verificable por código",
    codeEvidence: "Evidencia en código",
    limited: "Limitada",
    externalEvidenceNeeded: "Se requiere evidencia externa",
    addManualRequirement: "Añadir requisito manual",
    selectProjectSnapshots: "Selecciona versiones de los proyectos",
    selectProjectDesc: "Hasta tres proyectos. Una versión por proyecto.",
    saveReviewedRequirements: "Guardar requisitos revisados",
    analyzeEvidence: "Analizar evidencias",
    maxRequirementsNote: "requisitos seleccionados · máximo 15",
    yourProjects: "Tus proyectos",
    projectsEyebrow: "MATERIAL DE ORIGEN",
    projectsIntro: "Importa un repositorio público o carpeta local. El código importado nunca se ejecuta.",
    projectNameOptional: "Nombre del proyecto (opcional)",
    branchOrCommitOptional: "Rama o commit (opcional)",
    yourContribution: "Tu contribución (autodeclarada, no verificada)",
    importRepository: "Importar repositorio",
    personalContributionNotDeclared: "Contribución personal no declarada.",
    importNewSnapshot: "Importar nueva versión",
    files: "archivos",
    filesExcluded: "archivos excluidos.",
    bytesImported: "bytes importados.",
    allEligibleImported: "Todos los archivos válidos importados",
    partialImport: "Importación parcial",
    showFilesInventory: "Mostrar inventario de archivos importados",
    hideFilesInventory: "Ocultar inventario de archivos importados",
    decisionsTradeoffs: "Decisiones y compromisos técnicos",
    badgePrivateLocal: "Privado · Local",
    backendUnreachable: "No se puede conectar con el backend. Inicia la API local en el puerto 8000 y recarga.",
    deterministicFixtures: "Fixtures deterministas · Sin llamadas externas",
    homeCardStartTitle: "Prepara una candidatura más sólida",
    homeCardStartDesc: "Empieza con una oferta de empleo y hasta tres proyectos. Revisa cada conclusión contrastándola con su fuente original.",
    principle1Title: "01 · Fundamentado en fuentes",
    principle1Desc: "Cada prueba enlaza a un archivo y líneas exactas.",
    principle2Title: "02 · Honesto con las carencias",
    principle2Desc: "La falta de evidencia nunca significa falta de competencia.",
    principle3Title: "03 · Tú tienes el control",
    principle3Desc: "Corrige conclusiones conservando su origen.",
    badgeFixture: "Fixture",
    fixtureDemoNotice: "DEMO DE FIXTURES — Los resultados provienen de reglas deterministas. Los requisitos editados podrían no tener una regla coincidente.",
    realAnalysisNotice: "El análisis real envía la oferta y fragmentos seleccionados y anonimizados de tu repositorio al proveedor de IA configurado. Las claves permanecen en el servidor.",
    originalPostingSummary: "Oferta original",
    manuallyAddedNoCitation: "Añadido manualmente · sin cita en la oferta",
    postingExcerptPrefix: "Fragmento de la oferta:",
    characterPrefix: "carácter",
    analysisPartialNotice: "Análisis parcial. Los resultados incompletos no constituyen un informe definitivo.",
    takeItIntoInterview: "LLÉVALO A LA ENTREVISTA",
    noInterviewQuestions: "No se generaron preguntas de entrevista para este informe.",
    ofRequirements: "de",
    projectsCount: "proyectos",
    yourWorkYourEvidence: "TU TRABAJO. TUS EVIDENCIAS.",
    applicationWorkspace: "ESPACIO DE CANDIDATURA",
    waitingForTaskStatus: "Esperando el estado de la tarea",
    navSettings: "Configuración",
    settingsTitle: "Configuración del proveedor de IA y API",
    settingsEyebrow: "PREFERENCIAS LOCALES",
    settingsIntro: "Configura las claves de API para utilizar inteligencia artificial real (Google Gemini o Anthropic Claude) o aumentar los límites de GitHub. Todas las claves se almacenan localmente en tu servidor y nunca se envían a terceros no autorizados.",
    aiProviderSection: "Proveedor de IA para análisis real",
    aiProviderSelect: "Proveedor de IA",
    geminiOption: "Gemini API",
    anthropicOption: "Anthropic",
    openaiOption: "OpenAI",
    modelLabel: "Modelo de IA",
    geminiApiKeyLabel: "Gemini API Key",
    anthropicApiKeyLabel: "Anthropic API Key",
    openaiApiKeyLabel: "OpenAI API Key",
    githubTokenLabel: "GitHub Personal Access Token (opcional)",
    githubTokenDesc: "Aumenta el límite de solicitudes públicas de GitHub de 60/hora a 5.000/hora y permite repositorios privados.",
    keyConfiguredBadge: "Configurada",
    keyNotConfiguredBadge: "Sin configurar",
    saveSettings: "Guardar configuración",
    settingsSaved: "¡Configuración guardada correctamente!",
    testConnection: "Probar conexión",
    testingConnection: "Probando conexión...",
    clearKeys: "Limpiar claves",
    getGeminiKeyLink: "Obtener clave de Gemini API →",
    getAnthropicKeyLink: "Obtener clave de Anthropic →",
    getOpenaiKeyLink: "Obtener clave de OpenAI →",
    getGithubTokenLink: "Crear un GitHub Personal Access Token →",
    activeBadge: "Activo",
    openSettingsButton: "Configurar claves de IA",
    securityNote: "Privacidad garantizada: las claves se almacenan en tu base de datos SQLite local (jobproof.db) y en el archivo .env. Solo se utilizan para hacer llamadas directas a la API del proveedor seleccionado al analizar una oferta.",
    tabCoverLetter: "Carta de presentación",
    coverLetterTitle: "Carta de presentación honesta",
    coverLetterDesc: "Carta basada en evidencias reales que cita tus archivos de código y reconoce las limitaciones comprobadas.",
    generateCoverLetter: "Generar carta de presentación",
    regenerateCoverLetter: "Regenerar",
    generatingCoverLetter: "Generando carta...",
    copyCoverLetter: "Copiar carta",
    copiedCoverLetter: "¡Copiado!",
    downloadCoverLetter: "Descargar (.md)",
    toneLabel: "Tono de redacción",
    toneBalanced: "Equilibrado y profesional",
    toneTechnical: "Técnico y detallado",
    toneConcise: "Conciso y directo",
    evidenceHighlighted: "Evidencias clave destacadas en esta carta:",
    coverLetterHonestyNotice: "Esta carta solo afirma lo verificado en tu código. Revísala y personalízala antes de enviarla.",
    interviewModeCards: "Tarjetas de preguntas",
    interviewModeChat: "Simulacro interactivo con IA",
    startInterviewChat: "Comenzar simulacro de entrevista",
    interviewChatIntro: "Practica respondiendo preguntas en vivo de un entrevistador técnico basadas en tu auditoría de código.",
    candidateInputPlaceholder: "Escribe tu respuesta explicando tu enfoque técnico...",
    sendAnswer: "Enviar respuesta",
    interviewerRole: "Entrevistador técnico",
    candidateRole: "Tú (Candidato)",
    feedbackFromInterviewer: "Evaluación de tu respuesta",
    resetInterview: "Reiniciar entrevista",
    interviewCompletedBadge: "Simulacro completado",
    interviewThinking: "El entrevistador está evaluando...",
    githubUrlPlaceholder: "https://github.com/usuario/repo o usuario/repo",
    customExcludesLabel: "Exclusiones personalizadas (separadas por coma)",
    customExcludesPlaceholder: "docs, fixtures, temp, assets",
    privateRepoTokenNotice: "Token de GitHub configurado: ¡puedes importar repositorios privados!",
    fetchJobFromUrl: "Importar oferta desde una URL",
    fetchJobButton: "Extraer texto",
    fetchingJobUrl: "Extrayendo texto de la oferta...",
    fetchJobUrlPlaceholder: "https://ejemplo.com/empleo/desarrollador",
    uploadJobFile: "Cargar archivo de oferta (.txt, .md)",
    fileLoadedSuccess: "¡Archivo de oferta cargado correctamente!",
  },
};

export function getStatusLabels(t: Translations): Record<string, string> {
  return {
    supported: t.statusSupported,
    partial: t.statusPartial,
    not_evidenced: t.statusNotEvidenced,
    not_verifiable_from_code: t.statusNotVerifiable,
  };
}

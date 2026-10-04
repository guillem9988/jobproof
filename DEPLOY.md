# Guia de desplegament de JobProof (100% Gratuït · 0,00 €)

> **Important:** JobProof no té comptes d'usuari. Un desplegament públic **ha d'usar el mode hosted** (`HOSTED_MODE=true`), que només ofereix la demo amb dades d'exemple i desactiva importacions, configuració de claus i IA real. Sense aquest mode, qualsevol visitant podria llegir fitxers del servidor, gastar la teva quota d'IA i sobreescriure les claus. Mira la secció [Mode hosted](#mode-hosted-demo-pública) i [`docs/security.md`](docs/security.md).

Aquesta guia explica com publicar **JobProof** a internet **sense pagar absolutament res** (0 € de servidor i 0 € d'intel·ligència artificial).

---

## El pla 100% Gratuït (Hosting 0 € + IA 0 €)

Per tenir JobProof funcionant completament de franc necessites dues coses:
1. **Hosting gratuït (0 €):** Utilitzar **Render.com** (o **Hugging Face Spaces**) per allotjar l'aplicació.
2. **IA gratuïta (0 €):** Obtenir una clau gratuïta de **Google Gemini API** a [Google AI Studio](https://aistudio.google.com/).

---

## Pas 1: Aconseguir la clau d'IA gratuïta (Google Gemini · 0 €)

1. Entra a [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Inicia sessió amb el teu compte de Google.
3. Fes clic a **Create API key**.
4. Copia la clau generada (comença per `AIzaSy...`).
   > El nivell gratuït (*Free Tier*) de Gemini permet fins a 15 peticions per minut sense haver de posar cap targeta de crèdit.

---

## Pas 2: Desplegar a Render.com (Opció Recomanada · 0 €)

JobProof ja inclou la configuració [`render.yaml`](render.yaml) amb el pla gratuït (`plan: free`) i un [`Dockerfile`](Dockerfile) que empaqueta tant el frontend (React) com el backend (FastAPI + SQLite).

### Passos:
1. Si encara no ho has fet, assegura't que el teu repositori a GitHub és públic (o connecta el teu compte de GitHub a Render).
2. Entra a [Render.com](https://render.com) i crea un compte gratuït.
3. Al panell principal, fes clic a **New +** > **Blueprint**.
4. Connecta el teu repositori de GitHub (`https://github.com/guillem9988/jobproof`).
5. Render llegirà automàticament el fitxer `render.yaml` i detectarà el servei web gratuït.
6. A l'apartat de variables d'entorn:
   - `GEMINI_API_KEY`: enganxa la clau gratuïta de Google que has copiat al Pas 1.
7. Fes clic a **Apply**.
8. En 3-5 minuts tindràs la teva URL pública i segura amb HTTPS (p. ex. `https://jobproof.onrender.com`).

*Nota sobre el pla Free de Render:* Si no rep visites en 15 minuts, el servei entra en repòs. La primera vegada que algú hi accedeix després d'un període d'inactivitat, pot trigar uns 30 segons a despertar-se. Un cop despert, respon a l'instant.

---

## Opció Alternativa 100% Gratuïta: Hugging Face Spaces (Docker)

Si vols un servei que no s'adormi mai i amb 16 GB de RAM de franc:
1. Entra a [Hugging Face](https://huggingface.co/) i crea un compte gratuït.
2. Vés a **Spaces** > **Create new Space**.
3. Selecciona com a SDK: **Docker** (Blank).
4. Connecta el teu repositori de GitHub o puja el codi.
5. A **Settings** > **Variables and secrets**, afegeix el secret:
   - Nom: `GEMINI_API_KEY`
   - Valor: la teva clau de Gemini.
6. Hugging Face compilarà el teu Dockerfile i et donarà una URL pública `https://huggingface.co/spaces/...` 100% gratuïta per sempre.

---

## I Vercel? Per què no Vercel per a tot el projecte?

Vercel és fantàstic i gratuït per a aplicacions web estàtiques (com el frontend de React), però JobProof necessita:
- Un servidor Python (FastAPI) persistent.
- Una base de dades local SQLite (`jobproof.db`).
- Descarregar i analitzar repositoris en segon pla.

Les funcions serverless gratuïtes de Vercel són efímeres (la base de dades SQLite s'esborraria contínuament) i tenen límits curts de temps d'execució.

Per tant, utilitzar el **Dockerfile tot-en-un a Render o Hugging Face Spaces** és la solució més neta, senzilla i 100% gratuïta.

---

## Mode hosted (demo pública)

Per publicar una demo pública (Render + Vercel):

1. **Render (backend):** a *Environment* afegeix
   - `HOSTED_MODE` = `true`
   - `ALLOWED_ORIGINS` = l'URL del teu frontend, p. ex. `https://jobproof-web.vercel.app` (no `*`)
   - `DATABASE_URL` = `sqlite:////tmp/jobproof-hosted.db` (base de dades nova; al pla gratuït és efímera)
   - **No** hi posis `GEMINI_API_KEY`, `ANTHROPIC_API_KEY` ni `GITHUB_TOKEN`: en mode hosted s'ignoren i no cal que siguin al servidor.
2. **Vercel (frontend):** no cal cap canvi; el proxy `/api` de `frontend/vercel.json` apunta al backend de Render.
3. Comprova-ho: `GET /api/v1/health` ha de retornar `"hosted": true`, i `POST /api/v1/settings` ha de respondre 403.

Per fer servir JobProof amb els teus repositoris, ofertes i claus d'IA, executa'l en local.

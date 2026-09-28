# Guia de desplegament de JobProof (Deployment Guide)

Aquesta guia explica com publicar **JobProof** a internet de forma senzilla i gratuïta (o de baix cost).

---

## Opció 1: Desplegar a Render.com (Recomanada · Gratuïta)

Render és la plataforma més senzilla perquè JobProof ja inclou la configuració `render.yaml` i `Dockerfile`.

### Passos:
1. Registra't a [Render.com](https://render.com) (gratis).
2. Fes clic a **New +** > **Blueprint**.
3. Connecta el teu repositori de GitHub: `https://github.com/guillem9988/jobproof`.
4. Render detectarà automàticament el fitxer `render.yaml` i el `Dockerfile`.
5. A l'apartat d'Environment Variables, afegeix la teva clau d'IA:
   - `GEMINI_API_KEY`: la teva clau gratuïta de Google AI Studio (o `ANTHROPIC_API_KEY`).
6. Fes clic a **Apply**.
7. En pocs minuts, tindràs la teva URL pública: `https://jobproof.onrender.com`.

---

## Opció 2: Desplegar a Railway.app

1. Entra a [Railway.app](https://railway.app).
2. Fes clic a **New Project** > **Deploy from GitHub repo**.
3. Selecciona `guillem9988/jobproof`.
4. Railway detectarà el `Dockerfile` automàticament.
5. A la pestanya **Variables**, afegeix:
   - `GEMINI_API_KEY`: la teva clau d'IA.
   - `PORT`: 8000.
6. A la pestanya **Settings**, fes clic a **Generate Domain** per obtenir la teva URL pública.

---

## Opció 3: Executar amb Docker localment o en un VPS

Si vols provar el contenidor de producció a la teva màquina o en un servidor propi:

```bash
# 1. Construir la imatge Docker
docker build -t jobproof:latest .

# 2. Executar el contenidor
docker run -d \
  -p 8000:8000 \
  -e GEMINI_API_KEY="la-teva-clau" \
  --name jobproof \
  jobproof:latest

# 3. Obre el navegador a http://localhost:8000
```

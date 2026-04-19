# Deploy NetworkPulse (fully working stack)

You have **two parts**:

| Part | What it is | Good hosts |
|------|------------|------------|
| **Frontend** | Vite + React (`frontend/`) | Vercel, Netlify, Render **Static Site**, Cloudflare Pages |
| **Backend** | FastAPI + SQLite + JWT + WebSockets (`backend/`) | Render **Web Service**, Railway, Fly.io, VPS + Docker |

The browser talks to the backend over **`https://…/api/…`** and **`wss://…/api/ws/live`**.

---

## Important: live packet capture (Scapy)

| Where the API runs | Live Wi‑Fi / Ethernet capture |
|--------------------|--------------------------------|
| **Your Windows PC** (with Npcap, admin) | **Works** — full lab behavior |
| **Render / Railway / most clouds** | **Usually does not work** like your laptop: no Npcap, no raw Wi‑Fi adapter, often no permission to sniff. The app can still run **login, dashboard, UI, DB**; capture may error or show nothing. |

For a **fully working capture demo**, many teams run:

- **Backend on the lab PC** (or a machine with Npcap), and  
- **Frontend** on Vercel **with** `VITE_API_BASE_URL` pointing to that machine via **Tailscale**, **ngrok**, or a public IP.

For **everything in the cloud** without a PC: treat deploy as **“working UI + API”**; expect **capture** to be limited unless you use a **VPS with proper networking** (advanced).

---

## Recommended: Render (API) + Vercel (UI)

### 1) Deploy the backend on Render

1. [Render](https://render.com) → **New** → **Web Service**.
2. Connect your **Git** repo.
3. **Root Directory:** `backend`  
   (or `networkpulse-analyzer/backend` if the repo root is above the project folder — match where `requirements.txt` and `app/` live.)
4. **Runtime:**  
   - **Docker** (recommended): set **Dockerfile Path** to `Dockerfile`, **Docker Build Context** to the same folder as the Dockerfile (usually `backend`).  
   - **Native Python** alternative: **Build** `pip install -r requirements.txt`, **Start** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
5. **Environment variables:**

   | Key | Value |
   |-----|--------|
   | `SECRET_KEY` | Long random string (e.g. `openssl rand -hex 32`). **Required** for production JWT. |
   | `PORT` | Leave unset — Render injects it. |

   Optional: `DATABASE_URL` only if you later switch off SQLite (not required for first deploy).

6. **Create Web Service** and wait for a green deploy. Copy the URL, e.g. `https://networkpulse-api.onrender.com`.

7. **Health check:** open `https://YOUR-URL/docs` — you should see FastAPI Swagger.

### 2) Deploy the frontend on Vercel

1. [Vercel](https://vercel.com) → **Import** the same repo.
2. **Root Directory:** `frontend` (or `networkpulse-analyzer/frontend`).
3. **Environment variables:**

   | Key | Value |
   |-----|--------|
   | `VITE_API_BASE_URL` | `https://YOUR-RENDER-URL` — **no** trailing slash (same as Render URL, `https://…`). |

4. Deploy. Vite bakes this in at **build** time — if you change the API URL, **redeploy** the frontend.

5. Open your Vercel URL → **Sign up** → dashboard. API calls go to Render.

### 3) CORS

`backend` already allows `allow_origins=["*"]`. For stricter security later, restrict to your Vercel domain in `app/main.py`.

### 4) WebSockets

Render Web Services support **WebSockets**. The app uses **`/api/ws/live`**. If the socket fails, check Render logs and that the frontend `VITE_API_BASE_URL` matches the Render origin exactly (`https`, no typo).

---

## Same repo: Vercel “Services” (frontend + API in one project)

If you use root **`vercel.json`** with `experimentalServices`, you can deploy **both** in one Vercel project. Then **do not** set `VITE_API_BASE_URL` (same origin).

**Caveat:** the Python service may **fail to build** or **not support real capture** (Scapy/native deps). If builds fail, use **Render for the API** + **Vercel for the UI** as above.

---

## Docker on your own VPS (single server)

From the machine where you cloned the repo:

```bash
cd networkpulse-analyzer/backend
docker build -t networkpulse-api .
docker run -p 8000:8000 -e SECRET_KEY="$(openssl rand -hex 32)" networkpulse-api
```

Put **Nginx** or **Caddy** in front with **HTTPS** and proxy `/` to static `frontend/dist` and `/api` to port 8000 — or run only the API on the VPS and host the static UI on Vercel with `VITE_API_BASE_URL`.

---

## Checklist

- [ ] Backend reachable at `https://…/docs`
- [ ] `VITE_API_BASE_URL` on Vercel = that API origin (if UI and API are on different hosts)
- [ ] `SECRET_KEY` set on the server (not the default from `config.py`)
- [ ] After Git push, **redeploy** frontend when API URL changes
- [ ] For **real capture**: run API on **Windows + Npcap + admin**, or accept limited capture in the cloud

---

## Local “everything works” (development)

```bash
# Terminal 1 — backend (Windows: admin for capture)
cd backend && pip install -r requirements.txt && python run.py

# Terminal 2 — frontend
cd frontend && npm install && npm run dev
```

Open `http://127.0.0.1:5173` — **no** `VITE_API_BASE_URL` needed (Vite proxies `/api`).

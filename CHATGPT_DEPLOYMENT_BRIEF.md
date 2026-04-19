# NetworkPulse — Full project brief for deployment (paste into ChatGPT)

Use this document to deploy **NetworkPulse** correctly. It describes architecture, runtime behavior, environment variables, hosting options, and known limitations.

---

## 1. What the project is

**NetworkPulse** is a **network analyzer** with:

- **Backend:** Python **FastAPI** — JWT authentication, async **SQLite** (SQLAlchemy + aiosqlite), REST API, **WebSocket** for live updates, and **Scapy** for optional **live packet capture** in a background thread.
- **Frontend:** **Vite 6 + React 18 + TypeScript + Tailwind** — login/signup, dashboard with charts (Recharts), real-time packet table, BPF filters, CSV export.

**Repository layout (typical):**

```
networkpulse-analyzer/
  vercel.json              # Vercel experimental Services (frontend + FastAPI under /api)
  render.yaml              # Optional Render Blueprint (Docker API only)
  DEPLOY.md                # Human deployment notes
  backend/
    Dockerfile
    requirements.txt
    run.py                 # Local dev: uvicorn app.main:app, port 8000, reload
    app/
      main.py              # FastAPI app, routes, WebSocket, sniffer singleton
      config.py            # pydantic-settings: SECRET_KEY, DATABASE_URL, JWT
      database.py          # Async engine + session
      models.py            # User model
      auth.py              # bcrypt, JWT create/decode
      schemas.py           # Pydantic models
      sniffer.py           # PacketSniffer, Scapy (lazy-loaded), list_interfaces, health
  frontend/
    package.json           # "build": "tsc -b && vite build"
    vite.config.ts         # Dev proxy: /api -> http://127.0.0.1:8000 (ws: true)
    src/
      config.ts            # VITE_API_BASE_URL (optional)
      api.ts                 # apiFetch, wsUrl() for WebSocket
      hooks/useLivePackets.ts
```

**Important:** If the **Git repo root** is the parent folder (e.g. only `networkpulse-analyzer/` is pushed), paths like `render.yaml`’s `dockerfilePath: ./backend/Dockerfile` are relative to **that** root. If the repo root **is** `networkpulse-analyzer/`, paths are `./backend/Dockerfile` etc.

---

## 2. How it works (runtime)

### 2.1 Backend startup

1. **Uvicorn** loads `app.main:app`.
2. **Scapy is not imported at process start** (lazy import in `sniffer.py`) so the server can **bind to `$PORT` quickly** — required for **Render** and similar hosts that kill slow-starting processes.
3. On FastAPI **startup**: SQLite tables are created (`Base.metadata.create_all`), and a background **async task** `stats_tick()` runs every second to broadcast stats to WebSocket clients.

### 2.2 Authentication

- **Register:** `POST /api/auth/register` — creates user, returns JWT `access_token`.
- **Login:** `POST /api/auth/login` — returns JWT.
- **Protected routes:** `Authorization: Bearer <token>`.
- JWT settings come from **`SECRET_KEY`**, **`ALGORITHM`** (default HS256), **`ACCESS_TOKEN_EXPIRE_MINUTES`** (default 7 days in code).

### 2.3 Database

- Default: **`sqlite+aiosqlite:///./networkpulse.db`** (file next to CWD).
- Override with **`DATABASE_URL`** (must be async SQLite URL if unchanged code).
- On cloud PaaS, disk may be **ephemeral** — data can reset on redeploy unless you use persistent disk or migrate to Postgres (would require code changes).

### 2.4 Packet capture (Scapy)

- **`PacketSniffer`** runs **`sniff()`** in a **daemon thread** when user starts capture.
- **First use** of capture-related code triggers **Scapy import** (can take seconds on cold Linux).
- **Live capture** on **Windows** expects **Npcap** and often **Administrator**; on **Linux** typically needs **capabilities/sudo** for raw sockets.
- **Typical cloud VMs (Render, Railway, etc.)** do **not** provide the same environment as a user’s laptop — capture may **fail or return no useful traffic** even if the API runs. Treat cloud deploy as **“API + UI + auth work”**; **full capture demo** is realistic on **a machine you control** (e.g. local PC with Npcap).

### 2.5 WebSockets

- Endpoint: **`/api/ws/live`** (not `/ws/live`).
- Client connects with query param **`token=<JWT>`** (same token as REST).
- Messages: JSON — `hello` (initial packets + stats), `packet`, `stats`.

### 2.6 CORS

- Backend uses **`allow_origins=["*"]`** — fine for getting started; tighten to your frontend origin in production if needed.

---

## 3. API surface (all under `/api` prefix in this codebase)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/register` | No | Sign up |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/me` | Yes | Current user |
| GET | `/api/interfaces` | Yes | List interfaces (Scapy) |
| GET | `/api/capture/status` | Yes | Sniffer running, error, stats |
| GET | `/api/capture/health` | Yes | pcap/admin diagnostics |
| POST | `/api/capture/start` | Yes | Start capture (body: interface, bpf_filter, force) |
| POST | `/api/capture/stop` | Yes | Stop capture |
| GET | `/api/packets/recent` | Yes | Recent packets buffer |
| WS | `/api/ws/live?token=...` | JWT in query | Live stream |

**OpenAPI:** `GET /docs` on the API host.

---

## 4. Frontend ↔ backend wiring

### 4.1 Same origin (recommended for Vercel Services monorepo)

- Do **not** set `VITE_API_BASE_URL`.
- Browser calls **`/api/...`** and **`wss://.../api/ws/live`** on the **same host** as the SPA.

### 4.2 Split deploy (e.g. Vercel UI + Render API)

- Build frontend with **`VITE_API_BASE_URL=https://your-api-host.tld`** — **no trailing slash**.
- `api.ts` builds REST URLs as `base + path` and WebSocket as **`wss://`** when base is `https://`.

### 4.3 Local development

- Backend: `python run.py` → **http://127.0.0.1:8000**
- Frontend: `npm run dev` → Vite **proxies `/api`** to 8000 including **WebSockets**.

---

## 5. Environment variables

### Backend (Render / Docker / VPS)

| Variable | Required | Notes |
|----------|----------|--------|
| `SECRET_KEY` | **Yes in production** | Long random string; default in code is dev-only |
| `PORT` | **No** | **Render injects `PORT` automatically.** Do **not** set `PORT` to placeholder text (e.g. “Leave”) — must be numeric or omitted |
| `DATABASE_URL` | No | Default SQLite file path |
| `ALGORITHM` | No | Default HS256 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | Default 10080 in `.env.example` / 7d in code — verify `config.py` |

### Frontend (build-time, Vite)

| Variable | When |
|----------|------|
| `VITE_API_BASE_URL` | Only when UI and API are on **different** origins; omit for same-origin |

---

## 6. Production commands

### Render / Railway / generic Linux

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Working directory must be the folder containing the `app/` package (usually **`backend`**).

### Docker (included `backend/Dockerfile`)

- Installs **`libpcap0.8`** for Scapy on Debian slim.
- **`CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}`**

### Frontend static build

```bash
cd frontend && npm ci && npm run build
```

Output: **`frontend/dist/`** — serve with any static host or put behind reverse proxy.

---

## 7. Deployment patterns

### Pattern A — Render (API) + Vercel (UI) [common]

1. **Render:** Web Service, root **`backend`**, start command as above or **Dockerfile** from `backend/`.
2. Set **`SECRET_KEY`**. **Delete any custom `PORT`** env var.
3. Confirm **`https://<render-url>/docs`** loads.
4. **Vercel:** Project root **`frontend`**, set **`VITE_API_BASE_URL`** to Render URL, deploy.
5. Redeploy frontend if API URL changes.

### Pattern B — Vercel monorepo (`vercel.json` + `experimentalServices`)

- **`frontend`** service: Vite, route `/`.
- **`api`** service: FastAPI entry **`backend/app/main.py`**, route prefix **`/api`**.
- Caveat: Python + Scapy on Vercel Services may hit **build/runtime limits**; if it fails, use Pattern A.

### Pattern C — Docker on a VPS

- Build/run API container from `backend/Dockerfile`.
- Serve `frontend/dist` with Nginx/Caddy and optionally reverse-proxy **`/api`** to the container.

---

## 8. Failure modes you should know

1. **`PORT` set to invalid value** — Uvicorn error: `Invalid value for '--port': '...' is not a valid integer`. Remove custom `PORT` on Render.
2. **Deploy timeout / exit status 3** — Server didn’t listen in time; mitigated by **lazy Scapy import**. Ensure latest `sniffer.py` is deployed.
3. **WebSocket fails from HTTPS UI** — Must use **`wss://`** to API host; `VITE_API_BASE_URL` must match API origin exactly.
4. **Capture doesn’t work in cloud** — Expected limitation; not a routing bug.

---

## 9. Tech versions (approximate from `requirements.txt` / `package.json`)

- Python **3.11+** (Dockerfile uses 3.11-slim)
- FastAPI **0.115.x**, Uvicorn **0.32.x**, Scapy **2.6.1**
- Node **≥18**, Vite **6.x**, React **18.x**

---

## 10. Checklist for “correct” split deploy

- [ ] API serves **`/docs`** over HTTPS
- [ ] **`SECRET_KEY`** set on API
- [ ] No bogus **`PORT`** env on Render
- [ ] Frontend **`VITE_API_BASE_URL`** = API origin (no trailing slash), rebuild after changes
- [ ] Expect **capture** to be limited on shared cloud; full capture = self-hosted backend with Npcap/libpcap + privileges

---

*End of brief — suitable to paste into ChatGPT or another assistant for deployment planning.*

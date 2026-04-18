# Deploying NetworkPulse on Vercel (Services)

## Monorepo layout

The repo root contains **`vercel.json`** with **`experimentalServices`** so Vercel can deploy both:

| Service    | Folder      | Route prefix | Role        |
|-----------|-------------|--------------|-------------|
| `frontend` | `frontend/` | `/`          | Vite SPA    |
| `api`      | `backend/app/main.py` | `/api` | FastAPI     |

In the Vercel project, set the **framework / project type** to **Services** when prompted.

## Environment variables

- **Same Vercel project (Services: frontend + api):** do **not** set `VITE_API_BASE_URL`. The browser should call **`/api/...`** on the same origin (relative URLs). Setting it to your `*.vercel.app` URL is optional but unnecessary and can cause mistakes if the value is wrong.
- **UI on Vercel, API on another host** (Render, Railway, VPS): set **`VITE_API_BASE_URL`** to that API origin (no trailing slash), then **redeploy** the frontend so Vite embeds it at build time.

## WebSocket path

Live packets use **`/api/ws/live`** so traffic stays under the `/api` service prefix (required for Vercel Services routing).

## Backend limits on Vercel

The FastAPI service on Vercel is **serverless-oriented**. **Scapy / raw packet capture usually will not work** there (no Npcap, no long-lived sniffer). For a **production** capture lab, run the Python API on a **VPS or dedicated machine** and point `VITE_API_BASE_URL` at it.

If the Python build fails (e.g. native deps), deploy **only the frontend**: remove the `api` entry from `experimentalServices` in `vercel.json` and set `VITE_API_BASE_URL` to your external API.

## Local dev

Unchanged: `npm run dev` in `frontend/` proxies `/api` (HTTP + WebSocket) to `http://127.0.0.1:8000`.

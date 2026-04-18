# Deploying NetworkPulse on Vercel (Services)

## Monorepo layout

The repo root contains **`vercel.json`** with **`experimentalServices`** so Vercel can deploy both:

| Service    | Folder      | Route prefix | Role        |
|-----------|-------------|--------------|-------------|
| `frontend` | `frontend/` | `/`          | Vite SPA    |
| `api`      | `backend/app/main.py` | `/api` | FastAPI     |

In the Vercel project, set the **framework / project type** to **Services** when prompted.

## Environment variables

- **Same-domain deploy (recommended):** leave **`VITE_API_BASE_URL`** unset. The UI calls `/api/...` and **`wss://…/api/ws/live`** on the same host.
- **Split deploy (UI on Vercel, API elsewhere):** set `VITE_API_BASE_URL` to your API origin (see below).

## WebSocket path

Live packets use **`/api/ws/live`** so traffic stays under the `/api` service prefix (required for Vercel Services routing).

## Backend limits on Vercel

The FastAPI service on Vercel is **serverless-oriented**. **Scapy / raw packet capture usually will not work** there (no Npcap, no long-lived sniffer). For a **production** capture lab, run the Python API on a **VPS or dedicated machine** and point `VITE_API_BASE_URL` at it.

If the Python build fails (e.g. native deps), deploy **only the frontend**: remove the `api` entry from `experimentalServices` in `vercel.json` and set `VITE_API_BASE_URL` to your external API.

## Local dev

Unchanged: `npm run dev` in `frontend/` proxies `/api` (HTTP + WebSocket) to `http://127.0.0.1:8000`.

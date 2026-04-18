# Deploying NetworkPulse on Vercel

## What runs on Vercel

Only the **React (Vite) frontend** can be deployed on Vercel. The **FastAPI + Scapy** backend cannot run on Vercel: it needs a long-lived process, raw packet capture (Npcap), and often Administrator rights on Windows.

Host the API elsewhere, for example:

- A **VPS** (DigitalOcean, Linode, AWS EC2) with your Python stack
- **Railway**, **Render**, **Fly.io**, or **Google Cloud Run** (with limitations for capture)

Point the frontend at that API using the environment variable below.

## Frontend (this repo)

1. Push the project to GitHub/GitLab/Bitbucket.
2. In [Vercel](https://vercel.com) → **Add New Project** → import the repo.
3. Set **Root Directory** to `networkpulse-analyzer/frontend` (or `frontend` if the repo root is already `networkpulse-analyzer`).
4. **Environment variables** (Production / Preview):

   | Name | Example value |
   |------|----------------|
   | `VITE_API_BASE_URL` | `https://your-api.onrender.com` |

   Use the **origin only**: `https://host` with **no** trailing slash. No `/api` suffix — the app calls `/api/...` and `/ws/...` on that host.

5. Deploy. The build command is `npm run build`; output is `dist` (see `vercel.json`).

## Backend checklist (any host)

- Serve FastAPI with **HTTPS** in production so the browser can use **`wss://`** for WebSockets.
- **CORS**: allow your Vercel domain (or use `*` only for testing). The app sends `Authorization: Bearer` and calls `/api/*`, `/ws/live`.
- **WebSockets**: your reverse proxy (Nginx, Caddy, etc.) must support WebSocket **upgrade** for path `/ws/live`.

## Local dev (unchanged)

Leave `VITE_API_BASE_URL` unset. `npm run dev` uses the Vite proxy to `http://127.0.0.1:8000`.

Optional: create `frontend/.env.local` with:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

to hit a local API without the proxy.

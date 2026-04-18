# NetworkPulse — Smart Network Analyzer

Lab-ready **live packet capture** (Python **Scapy**), **FastAPI** backend with **JWT auth**, and a **React** real-time dashboard (WebSocket push, charts, BPF filters, CSV export, preloader, login/signup).

## Prerequisites

- **Python 3.11+**
- **Node.js 18+** (for the UI dev server)
- **Windows:** install [**Npcap**](https://npcap.com/) (with WinPcap API compatibility) so Scapy can capture. Run the API **as Administrator** for live capture.
- **Linux/macOS:** `libpcap` available; capture usually requires `sudo` / elevated rights.

## Quick start

### 1) Backend

```powershell
cd networkpulse-analyzer\backend
python -m pip install -r requirements.txt
python run.py
```

API: `http://127.0.0.1:8000` · OpenAPI docs: `http://127.0.0.1:8000/docs`

Optional: copy `.env.example` to `.env` and set `SECRET_KEY` for production-like deployments.

### 2) Frontend

```powershell
cd networkpulse-analyzer\frontend
npm install
npm run dev
```

UI: `http://127.0.0.1:5173` (proxies `/api` and `/ws` to the backend).

### 3) Use the app

1. Open the UI, complete **Sign up**, then you land on the **dashboard**.
2. Pick a **network interface**, optionally set a **BPF filter** (e.g. `tcp port 443`).
3. Click **Start** — packets stream into the table and charts in real time.

## Project layout

- `backend/` — FastAPI, SQLAlchemy (async SQLite), Scapy sniffer thread, WebSocket broadcast.
- `frontend/` — Vite + React + TypeScript + Tailwind + Recharts + Framer Motion.

## Troubleshooting

- **“No libpcap provider” / empty interfaces:** install Npcap (Windows) or libpcap; restart the terminal after installing Npcap.
- **Permission errors on capture:** run the backend process elevated (Administrator / sudo).
- **WebSocket stuck on “Connecting”:** ensure the backend is running and the UI is opened via the Vite dev server so `/ws` proxies correctly.

## Academic use

Suitable for **Computer Networks** coursework: demonstrates promiscuous capture concepts, BPF filtering, protocol identification (TCP/UDP/ICMP/DNS/ARP/IPv6), throughput estimation, and client/server real-time visualization.

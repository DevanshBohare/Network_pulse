from __future__ import annotations

import asyncio
import json
from collections import deque
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import create_access_token, create_user, decode_token, get_user_by_email, get_user_by_username, verify_password
from app.database import AsyncSessionLocal, Base, engine, get_db
from app.models import User
from app.schemas import CaptureStart, Token, UserCreate, UserLogin, UserPublic
from app.sniffer import PacketSniffer, get_capture_health, list_interfaces

app = FastAPI(title="NetworkPulse Analyzer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)
sniffer = PacketSniffer()

recent_packets: deque[dict[str, Any]] = deque(maxlen=500)
ws_clients: set[WebSocket] = set()
_broadcast_lock = asyncio.Lock()


async def broadcast_json(payload: dict[str, Any]) -> None:
    dead: list[WebSocket] = []
    async with _broadcast_lock:
        for ws in ws_clients:
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                dead.append(ws)
        for ws in dead:
            ws_clients.discard(ws)


def on_packet_captured(summary: dict[str, Any]) -> None:
    recent_packets.append(summary)
    try:
        loop = asyncio.get_running_loop()
        asyncio.run_coroutine_threadsafe(
            broadcast_json({"type": "packet", "data": summary}),
            loop,
        )
    except RuntimeError:
        pass


async def stats_tick() -> None:
    while True:
        await asyncio.sleep(1.0)
        if not ws_clients:
            continue
        snap = sniffer.get_stats_snapshot()
        err = sniffer.error
        payload: dict[str, Any] = {"type": "stats", "data": snap}
        if err:
            payload["error"] = err
        await broadcast_json(payload)


@app.on_event("startup")
async def startup() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    asyncio.create_task(stats_tick())


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    if creds is None or not creds.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    sub = decode_token(creds.credentials)
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = await get_user_by_username(db, sub)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


@app.post("/api/auth/register", response_model=Token)
async def register(body: UserCreate, db: AsyncSession = Depends(get_db)):
    if await get_user_by_email(db, body.email.lower().strip()):
        raise HTTPException(status_code=400, detail="Email already registered")
    if await get_user_by_username(db, body.username.strip()):
        raise HTTPException(status_code=400, detail="Username taken")
    user = await create_user(db, body)
    token = create_access_token(user.username)
    return Token(access_token=token)


@app.post("/api/auth/login", response_model=Token)
async def login(body: UserLogin, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_username(db, body.username.strip())
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return Token(access_token=create_access_token(user.username))


@app.get("/api/auth/me", response_model=UserPublic)
async def me(user: User = Depends(get_current_user)):
    return UserPublic.model_validate(user)


@app.get("/api/interfaces")
async def interfaces(_: User = Depends(get_current_user)):
    return {"interfaces": list_interfaces()}


@app.get("/api/capture/status")
async def capture_status(_: User = Depends(get_current_user)):
    return {
        "running": sniffer.running,
        "error": sniffer.error,
        "stats": sniffer.get_stats_snapshot(),
    }


@app.get("/api/capture/health")
async def capture_health(_: User = Depends(get_current_user)):
    """Npcap/pcap stack + admin + optional Windows service status."""
    return get_capture_health()


@app.post("/api/capture/start")
async def capture_start(body: CaptureStart, _: User = Depends(get_current_user)):
    if body.force:
        sniffer.stop()
    ok, err = sniffer.start(body.interface, body.bpf_filter, on_packet_captured)
    if not ok:
        raise HTTPException(status_code=400, detail=err or "Failed to start")
    return {"ok": True, "message": "Capture started (requires admin / Npcap on Windows)"}


@app.post("/api/capture/stop")
async def capture_stop(_: User = Depends(get_current_user)):
    sniffer.stop()
    return {"ok": True}


@app.get("/api/packets/recent")
async def packets_recent(_: User = Depends(get_current_user)):
    return {"packets": list(recent_packets)}


@app.websocket("/ws/live")
async def ws_live(websocket: WebSocket):
    await websocket.accept()
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        return

    async with AsyncSessionLocal() as db:
        sub = decode_token(token)
        if not sub:
            await websocket.close(code=4401)
            return
        user = await get_user_by_username(db, sub)
        if not user:
            await websocket.close(code=4401)
            return

    ws_clients.add(websocket)
    try:
        await websocket.send_text(
            json.dumps(
                {
                    "type": "hello",
                    "data": {
                        "packets": list(recent_packets)[-100:],
                        "stats": sniffer.get_stats_snapshot(),
                    },
                }
            )
        )
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        ws_clients.discard(websocket)

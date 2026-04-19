# FastAPI + uvicorn (Render, Fly.io, Railway, any Docker host)
FROM python:3.11-slim-bookworm

# Helps Scapy/libpcap on Linux (capture may still be limited vs Windows + Npcap)
RUN apt-get update && apt-get install -y --no-install-recommends libpcap0.8 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1
# Render sets PORT; default for local docker run
ENV PORT=8000

EXPOSE 8000

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}

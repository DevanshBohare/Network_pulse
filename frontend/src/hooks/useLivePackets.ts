import { useCallback, useEffect, useRef, useState } from "react";
import { wsUrl } from "@/api";
import type { PacketRow, StatsSnapshot } from "@/types";

const MAX_ROWS = 400;

type WsMsg =
  | { type: "hello"; data: { packets: PacketRow[]; stats: StatsSnapshot } }
  | { type: "packet"; data: PacketRow }
  | { type: "stats"; data: StatsSnapshot; error?: string };

export function useLivePackets(token: string | null, enabled: boolean) {
  const [packets, setPackets] = useState<PacketRow[]>([]);
  const [stats, setStats] = useState<StatsSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const clearBuffers = useCallback(() => {
    setPackets([]);
    setStats(null);
    setServerError(null);
  }, []);

  useEffect(() => {
    if (!token || !enabled) {
      setConnected(false);
      return;
    }

    const url = wsUrl("/api/ws/live", token);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setWsError(null);
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as WsMsg;
        if (msg.type === "hello") {
          setPackets(msg.data.packets.slice(-MAX_ROWS));
          setStats(msg.data.stats);
        } else if (msg.type === "packet") {
          setPackets((prev) => {
            const next = [...prev, msg.data];
            return next.length > MAX_ROWS ? next.slice(-MAX_ROWS) : next;
          });
        } else if (msg.type === "stats") {
          setStats(msg.data);
          if (msg.error) setServerError(msg.error);
        }
      } catch {
        /* ignore */
      }
    };

    ws.onerror = () => {
      setWsError("WebSocket error");
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [token, enabled]);

  return {
    packets,
    stats,
    connected,
    wsError,
    serverError,
    clearBuffers,
  };
}

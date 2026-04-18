from __future__ import annotations

import json
import re
import subprocess
import sys
import threading
import time
import uuid
from collections import deque
from dataclasses import dataclass, field
from typing import Any, Callable

from scapy.all import IP, IPv6, TCP, UDP, ICMP, ARP, Ether, DNS, Raw, sniff, get_if_list, conf

PacketCallback = Callable[[dict[str, Any]], None]


def _safe_str(x: object) -> str:
    if x is None:
        return ""
    return str(x)


def summarize_packet(pkt) -> dict[str, Any]:
    ts = time.time()
    pid = str(uuid.uuid4())[:12]

    eth_src = eth_dst = None
    if pkt.haslayer(Ether):
        eth_src = _safe_str(pkt[Ether].src)
        eth_dst = _safe_str(pkt[Ether].dst)

    layer = "Other"
    src_ip = dst_ip = None
    sport = dport = None
    proto_num = None
    info = ""

    if pkt.haslayer(ARP):
        layer = "ARP"
        a = pkt[ARP]
        src_ip = _safe_str(a.psrc)
        dst_ip = _safe_str(a.pdst)
        info = f"Who has {a.pdst}? Tell {a.psrc}"
    elif pkt.haslayer(IP):
        ip = pkt[IP]
        proto_num = int(ip.proto)
        src_ip = _safe_str(ip.src)
        dst_ip = _safe_str(ip.dst)
        if pkt.haslayer(TCP):
            layer = "TCP"
            t = pkt[TCP]
            sport, dport = int(t.sport), int(t.dport)
            flags = t.sprintf("%TCP.flags%")
            info = f"{flags} seq={t.seq} ack={t.ack}"
        elif pkt.haslayer(UDP):
            layer = "UDP"
            u = pkt[UDP]
            sport, dport = int(u.sport), int(u.dport)
            if pkt.haslayer(DNS):
                layer = "DNS"
                d = pkt[DNS]
                try:
                    qn = d.qd.qname if d.qd else None
                    q = qn.decode(errors="ignore").rstrip(".") if qn else ""
                except Exception:
                    q = ""
                info = f"query {q}" if q else "DNS"
            else:
                info = f"len={len(u.payload)}"
        elif pkt.haslayer(ICMP):
            layer = "ICMP"
            ic = pkt[ICMP]
            info = f"type={ic.type} code={ic.code}"
        else:
            layer = f"IP({proto_num})"
            info = f"proto={proto_num}"
    elif pkt.haslayer(IPv6):
        layer = "IPv6"
        ip6 = pkt[IPv6]
        src_ip = _safe_str(ip6.src)
        dst_ip = _safe_str(ip6.dst)
        if pkt.haslayer(TCP):
            layer = "TCP"
            t = pkt[TCP]
            sport, dport = int(t.sport), int(t.dport)
            info = t.sprintf("%TCP.flags%")
        elif pkt.haslayer(UDP):
            layer = "UDP"
            u = pkt[UDP]
            sport, dport = int(u.sport), int(u.dport)
            info = f"UDP {sport}->{dport}"

    length = len(pkt)
    if pkt.haslayer(Raw):
        raw_len = len(pkt[Raw].load)
        if not info:
            info = f"raw {raw_len} B"

    return {
        "id": pid,
        "ts": ts,
        "layer": layer,
        "src_ip": src_ip,
        "dst_ip": dst_ip,
        "sport": sport,
        "dport": dport,
        "proto": proto_num,
        "length": length,
        "info": info[:280],
        "eth_src": eth_src,
        "eth_dst": eth_dst,
    }


@dataclass
class CaptureStats:
    total: int = 0
    by_layer: dict[str, int] = field(default_factory=dict)
    last_second_packets: deque[float] = field(default_factory=lambda: deque(maxlen=4000))
    bytes_total: int = 0

    def record(self, summary: dict[str, Any]) -> None:
        now = time.time()
        self.total += 1
        self.bytes_total += int(summary.get("length") or 0)
        layer = summary.get("layer") or "Other"
        self.by_layer[layer] = self.by_layer.get(layer, 0) + 1
        self.last_second_packets.append(now)

    def packets_per_second(self, window: float = 1.0) -> float:
        now = time.time()
        cutoff = now - window
        while self.last_second_packets and self.last_second_packets[0] < cutoff:
            self.last_second_packets.popleft()
        return len(self.last_second_packets) / window if window > 0 else 0.0


class PacketSniffer:
    def __init__(self) -> None:
        self._thread: threading.Thread | None = None
        self._stop = threading.Event()
        self._stats = CaptureStats()
        self._lock = threading.Lock()
        self._running = False
        self._iface: str | None = None
        self._filter: str | None = None
        self._error: str | None = None

    @property
    def running(self) -> bool:
        # Source of truth: OS thread; _running alone can desync after stop/join races.
        return self._thread is not None and self._thread.is_alive()

    @property
    def error(self) -> str | None:
        return self._error

    def get_stats_snapshot(self) -> dict[str, Any]:
        with self._lock:
            pps = self._stats.packets_per_second(1.0)
            by_layer = dict(self._stats.by_layer)
            total = self._stats.total
            bt = self._stats.bytes_total
        return {
            "total_packets": total,
            "packets_per_sec": round(pps, 2),
            "by_layer": by_layer,
            "bytes_total": bt,
        }

    def _run_sniff(self, on_packet: PacketCallback) -> None:
        def prn(pkt):
            if self._stop.is_set():
                return
            try:
                s = summarize_packet(pkt)
                with self._lock:
                    self._stats.record(s)
                on_packet(s)
            except Exception:
                pass

        try:
            sniff(
                iface=self._iface,
                prn=prn,
                store=False,
                stop_filter=lambda _: self._stop.is_set(),
                filter=self._filter or None,
            )
        except Exception as e:
            self._error = str(e)
        finally:
            self._running = False

    def start(self, iface: str | None, bpf_filter: str | None, on_packet: PacketCallback) -> tuple[bool, str | None]:
        if self._thread is not None and self._thread.is_alive():
            return False, "Capture already running"
        # Drop handle to a finished thread so we never think we're idle while a zombie ref exists
        if self._thread is not None and not self._thread.is_alive():
            self._thread = None

        self._stop.clear()
        self._error = None
        self._iface = iface or None
        self._filter = bpf_filter.strip() if bpf_filter else None
        self._stats = CaptureStats()
        self._running = True

        def runner():
            self._run_sniff(on_packet)

        self._thread = threading.Thread(target=runner, daemon=True)
        self._thread.start()
        return True, None

    def stop(self) -> None:
        self._stop.set()
        if self._thread is not None:
            if self._thread.is_alive():
                self._thread.join(timeout=4.0)
        self._thread = None
        self._running = False


def _windows_guid_to_friendly_name() -> dict[str, str]:
    """Map lower-case interface GUID string → 'Wi-Fi', 'Ethernet', … (Windows)."""
    if sys.platform != "win32":
        return {}
    try:
        ps = (
            "Get-NetAdapter | Select-Object Name, InterfaceGuid | "
            "ForEach-Object { [PSCustomObject]@{ Name = $_.Name; Guid = $_.InterfaceGuid.ToString() } } | "
            "ConvertTo-Json -Compress"
        )
        r = subprocess.run(
            ["powershell", "-NoProfile", "-Command", ps],
            capture_output=True,
            text=True,
            timeout=12,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        raw = (r.stdout or "").strip()
        if not raw:
            return {}
        data = json.loads(raw)
        if isinstance(data, dict):
            data = [data]
        out: dict[str, str] = {}
        for row in data:
            name = row.get("Name") or row.get("name")
            guid = row.get("Guid") or row.get("guid")
            if not name or not guid:
                continue
            g = str(guid).strip("{}").lower()
            out[g] = str(name).strip()
        return out
    except Exception:
        return {}


def _label_from_scapy_iface(iface: Any) -> str:
    for attr in ("description", "network_name"):
        v = getattr(iface, attr, None)
        if v and str(v).strip():
            s = str(v).strip()
            if s and s != getattr(iface, "name", None):
                return s
    name = getattr(iface, "name", None)
    return str(name).strip() if name else ""


def list_interfaces() -> list[dict[str, str]]:
    """Return usable interfaces: `id` is what Scapy sniffs; `label` is human-readable (e.g. Wi-Fi)."""
    out: list[dict[str, str]] = []
    seen: set[str] = set()
    win_guid_map = _windows_guid_to_friendly_name()

    try:
        from scapy.interfaces import IFACES

        for iface in IFACES.values():
            dev_id = getattr(iface, "name", None) or ""
            if not dev_id or dev_id in seen:
                continue
            seen.add(dev_id)
            label = _label_from_scapy_iface(iface)
            if not label or label == dev_id or dev_id.startswith("\\Device\\"):
                m = re.search(r"NPF_\{([^}]+)\}", dev_id, re.I)
                if m and win_guid_map:
                    g = m.group(1).lower()
                    if g in win_guid_map:
                        label = win_guid_map[g]
            if not label:
                label = dev_id
            out.append({"id": dev_id, "label": label})
    except Exception:
        pass

    try:
        for n in get_if_list():
            if n in seen:
                continue
            seen.add(n)
            label = n
            m = re.search(r"NPF_\{([^}]+)\}", n, re.I)
            if m and win_guid_map:
                g = m.group(1).lower()
                if g in win_guid_map:
                    label = win_guid_map[g]
            out.append({"id": n, "label": label})
    except Exception:
        pass

    if not out and conf.iface:
        out.append({"id": str(conf.iface), "label": str(conf.iface)})

    # Enrich with Windows Wi-Fi profile name (usually the SSID) per interface alias
    alias_ssid = _windows_interface_alias_to_ssid()
    if alias_ssid:
        for row in out:
            aid = row.get("id", "")
            lbl = row.get("label", "")
            ssid = alias_ssid.get(aid) or alias_ssid.get(lbl)
            if not ssid:
                for k, v in alias_ssid.items():
                    if k.lower() in lbl.lower() or lbl.lower() in k.lower():
                        ssid = v
                        break
            if ssid:
                row["ssid"] = ssid

    return out


def _windows_interface_alias_to_ssid() -> dict[str, str]:
    """Map interface alias (e.g. 'Wi-Fi') -> connection profile name (SSID for Wi-Fi)."""
    if sys.platform != "win32":
        return {}
    try:
        ps = (
            "Get-NetConnectionProfile -ErrorAction SilentlyContinue | "
            "Select-Object InterfaceAlias, Name | ConvertTo-Json -Compress"
        )
        r = subprocess.run(
            ["powershell", "-NoProfile", "-Command", ps],
            capture_output=True,
            text=True,
            timeout=10,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        raw = (r.stdout or "").strip()
        if not raw:
            return {}
        data = json.loads(raw)
        if isinstance(data, dict):
            data = [data]
        out: dict[str, str] = {}
        for row in data:
            alias = row.get("InterfaceAlias") or row.get("interfaceAlias")
            name = row.get("Name") or row.get("name")
            if alias and name:
                out[str(alias).strip()] = str(name).strip()
        return out
    except Exception:
        return {}


def _windows_is_admin() -> bool | None:
    if sys.platform != "win32":
        return None
    try:
        import ctypes

        return bool(ctypes.windll.shell32.IsUserAnAdmin())
    except Exception:
        return None


def _windows_npcap_service_status() -> str | None:
    """Best-effort: Npcap may register under different names across versions."""
    if sys.platform != "win32":
        return None
    try:
        ps = (
            "Get-Service -ErrorAction SilentlyContinue | "
            "Where-Object { $_.Name -like '*npcap*' -or $_.DisplayName -like '*npcap*' } | "
            "Select-Object -First 1 -ExpandProperty Status"
        )
        r = subprocess.run(
            ["powershell", "-NoProfile", "-Command", ps],
            capture_output=True,
            text=True,
            timeout=8,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        s = (r.stdout or "").strip()
        if s:
            return s
    except Exception:
        pass
    try:
        r = subprocess.run(
            ["sc", "query", "npcap"],
            capture_output=True,
            text=True,
            timeout=5,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        out = (r.stdout or "") + (r.stderr or "")
        if "RUNNING" in out.upper():
            return "Running (sc query)"
        if "STOPPED" in out.upper():
            return "Stopped (sc query)"
    except Exception:
        pass
    return None


def get_capture_health() -> dict[str, Any]:
    """Diagnostics for UI: pcap stack, admin, Npcap service."""
    pcap_available = False
    try:
        from scapy.config import conf

        pcap_available = bool(getattr(conf, "use_pcap", False))
    except Exception:
        pass

    return {
        "pcap_available": pcap_available,
        "running_as_admin": _windows_is_admin(),
        "npcap_service_status": _windows_npcap_service_status(),
        "note": (
            "Scapy captures on a network adapter, not on an SSID name. "
            "Connect to a Wi-Fi network in Windows first; the SSID shown is your current profile."
        ),
    }

export type PacketRow = {
  id: string;
  ts: number;
  layer: string;
  src_ip: string | null;
  dst_ip: string | null;
  sport: number | null;
  dport: number | null;
  proto: number | null;
  length: number;
  info: string;
  eth_src?: string | null;
  eth_dst?: string | null;
};

export type StatsSnapshot = {
  total_packets: number;
  packets_per_sec: number;
  by_layer: Record<string, number>;
  bytes_total: number;
};

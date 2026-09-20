"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Filter,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  BarChart3,
  Wifi,
  Loader2,
} from "lucide-react";
import PositionCard from "@/components/PositionCard";
import WaterfallView from "@/components/WaterfallView";
import { MOCK_POSITIONS, type MockPosition } from "@/lib/mock";
import { getPosition } from "@/lib/contract";
import { formatUSDC } from "@/lib/format";

type FilterType = "all" | "active" | "called" | "liquidated" | "matured";

export default function PositionsPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  // On-chain positions
  const [chainPositions, setChainPositions] = useState<MockPosition[]>([]);
  const [chainLoading, setChainLoading] = useState(true);

  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    const check = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setWalletAddress((window as any).__parity_wallet || null);
      setNow(Math.floor(Date.now() / 1000));
    };
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  // Try to load on-chain positions (IDs 0-9)
  const loadChainPositions = useCallback(async () => {
    setChainLoading(true);
    const loaded: MockPosition[] = [];
    for (let i = 0; i < 10; i++) {
      try {
        const pos = await getPosition(i);
        if (pos) {
          loaded.push({
            id: i,
            hedger: String(pos.hedger || "").slice(0, 8) + "..." + String(pos.hedger || "").slice(-4),
            maker: String(pos.maker || "").slice(0, 8) + "..." + String(pos.maker || "").slice(-4),
            pair: `${pos.pair_quote || "MXN"}/${pos.pair_base || "USD"}`,
            direction: pos.direction === "SellBase" || pos.direction?.SellBase !== undefined ? "sell" : "buy",
            notional: Number(pos.notional || 0) / 1e7,
            locked_forward: Number(pos.locked_forward || 0) / 1e7,
            maturity: Number(pos.maturity_time || 0),
            initial_margin: Number(pos.hedger_margin || 0) / 1e7, // initial at open
            hedger_margin: Number(pos.hedger_margin || 0) / 1e7,
            maker_margin: Number(pos.maker_margin || 0) / 1e7,
            hedger_state: parseState(pos.hedger_state),
            maker_state: parseState(pos.maker_state),
            current_forward: Number(pos.locked_forward || 0) / 1e7, // updated by mark
            settled: pos.status === "Settled" || pos.status?.Settled !== undefined,
          });
        }
      } catch {
        break; // no more positions
      }
    }
    setChainPositions(loaded);
    setChainLoading(false);
  }, []);

  useEffect(() => {
    loadChainPositions();
  }, [loadChainPositions]);

  function parseState(s: unknown): "Safe" | "Called" | "Liquidated" {
    if (!s) return "Safe";
    if (typeof s === "string") return s as "Safe" | "Called" | "Liquidated";
    if (typeof s === "object") {
      if ("Called" in (s as object)) return "Called";
      if ("Liquidated" in (s as object)) return "Liquidated";
    }
    return "Safe";
  }

  // Combine: chain positions first (tagged), then mock (tagged)
  const allPositions = useMemo(() => {
    const chain = chainPositions.map(p => ({ ...p, source: "chain" as const }));
    const mock = MOCK_POSITIONS.map(p => ({ ...p, source: "demo" as const }));
    return [...chain, ...mock];
  }, [chainPositions]);

  const positions = useMemo(() => {
    if (now === 0) return [];
    return allPositions.filter((p) => {
      switch (filter) {
        case "active":
          return !p.settled && p.maturity > now && p.hedger_state === "Safe" && p.maker_state === "Safe";
        case "called":
          return p.hedger_state === "Called" || p.maker_state === "Called";
        case "liquidated":
          return p.hedger_state === "Liquidated" || p.maker_state === "Liquidated";
        case "matured":
          return p.maturity <= now && !p.settled;
        default:
          return true;
      }
    });
  }, [filter, now, allPositions]);

  const stats = useMemo(() => {
    if (now === 0) return { active: 0, called: 0, liquidated: 0, matured: 0, totalNotional: 0 };
    const active = allPositions.filter(p => !p.settled && p.maturity > now && p.hedger_state === "Safe" && p.maker_state === "Safe").length;
    const called = allPositions.filter(p => p.hedger_state === "Called" || p.maker_state === "Called").length;
    const liquidated = allPositions.filter(p => p.hedger_state === "Liquidated" || p.maker_state === "Liquidated").length;
    const matured = allPositions.filter(p => now > 0 && p.maturity <= now && !p.settled).length;
    const totalNotional = allPositions.filter(p => !p.settled).reduce((sum, p) => sum + p.notional, 0);
    return { active, called, liquidated, matured, totalNotional };
  }, [now, allPositions]);

  const selectedWaterfall = selectedPosition !== null
    ? { loserMargin: 5000, insuranceUsed: 200, winnerHaircut: 0, hedgerPayout: 6485, makerPayout: 3515 }
    : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const FILTERS: { key: FilterType; label: string; count: number; icon: any }[] = [
    { key: "all", label: "All", count: allPositions.length, icon: BarChart3 },
    { key: "active", label: "Active", count: stats.active, icon: CheckCircle2 },
    { key: "called", label: "Called", count: stats.called, icon: AlertTriangle },
    { key: "liquidated", label: "Liquidated", count: stats.liquidated, icon: XCircle },
    { key: "matured", label: "Matured", count: stats.matured, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Positions</h1>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          {chainLoading ? (
            <span className="flex items-center gap-1 text-yellow-400 text-xs">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading chain...
            </span>
          ) : chainPositions.length > 0 ? (
            <span className="flex items-center gap-1 text-emerald-400 text-xs">
              <Wifi className="w-3 h-3" /> {chainPositions.length} on-chain
            </span>
          ) : null}
          <span>Notional: <span className="font-mono text-gray-300">{formatUSDC(stats.totalNotional)}</span></span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Active</span>
          <span className="text-2xl font-mono font-bold text-emerald-400">{stats.active}</span>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Margin Called</span>
          <span className="text-2xl font-mono font-bold text-yellow-400">{stats.called}</span>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Liquidated</span>
          <span className="text-2xl font-mono font-bold text-red-400">{stats.liquidated}</span>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Ready to Settle</span>
          <span className="text-2xl font-mono font-bold text-blue-400">{stats.matured}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-gray-500" />
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.key
                ? "bg-gray-800 text-white border border-gray-600"
                : "text-gray-500 hover:text-gray-300 border border-transparent"
            }`}
          >
            <f.icon className="w-3 h-3" />
            {f.label}
            <span className="font-mono text-gray-600 ml-0.5">{f.count}</span>
          </button>
        ))}
      </div>

      {/* Position list */}
      <div className="grid gap-4">
        {positions.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <p className="text-gray-500">No positions match this filter</p>
          </div>
        ) : (
          positions.map((pos) => (
            <div key={`${pos.source}-${pos.id}`}>
              {/* Source badge */}
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  pos.source === "chain"
                    ? "bg-emerald-900/30 text-emerald-400 border border-emerald-800/50"
                    : "bg-gray-800 text-gray-500 border border-gray-700"
                }`}>
                  {pos.source === "chain" ? "On-Chain" : "Demo Data"}
                </span>
                {pos.source === "demo" && (
                  <span className="text-xs text-gray-600">Buttons simulate only</span>
                )}
              </div>
              <div onClick={() => setSelectedPosition(pos.id)}>
                <PositionCard
                  position={pos}
                  userAddress={walletAddress}
                  showActions={pos.source === "chain"}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Waterfall view */}
      {selectedWaterfall && selectedPosition !== null && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">
              Settlement Waterfall (Position #{selectedPosition})
            </h2>
            <button onClick={() => setSelectedPosition(null)} className="text-xs text-gray-500 hover:text-gray-300">
              Close
            </button>
          </div>
          <WaterfallView {...selectedWaterfall} />
        </div>
      )}
    </div>
  );
}

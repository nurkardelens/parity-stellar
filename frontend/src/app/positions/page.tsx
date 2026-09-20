"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Filter,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  BarChart3,
} from "lucide-react";
import PositionCard from "@/components/PositionCard";
import WaterfallView from "@/components/WaterfallView";
import { MOCK_POSITIONS } from "@/lib/mock";
import { formatUSDC } from "@/lib/format";

type FilterType = "all" | "active" | "called" | "liquidated" | "matured";

export default function PositionsPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);

  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    const check = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setWalletAddress((window as any).__parity_wallet || null);
      setNow(Math.floor(Date.now() / 1000));
    };
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, []);

  const positions = useMemo(() => {
    return MOCK_POSITIONS.filter((p) => {
      switch (filter) {
        case "active":
          return (
            !p.settled &&
            p.maturity > now &&
            p.hedger_state === "Safe" &&
            p.maker_state === "Safe"
          );
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
  }, [filter, now]);

  const stats = useMemo(() => {
    const active = MOCK_POSITIONS.filter(
      (p) => !p.settled && p.maturity > now && p.hedger_state === "Safe" && p.maker_state === "Safe"
    ).length;
    const called = MOCK_POSITIONS.filter(
      (p) => p.hedger_state === "Called" || p.maker_state === "Called"
    ).length;
    const liquidated = MOCK_POSITIONS.filter(
      (p) => p.hedger_state === "Liquidated" || p.maker_state === "Liquidated"
    ).length;
    const matured = MOCK_POSITIONS.filter(
      (p) => p.maturity <= now && !p.settled
    ).length;
    const totalNotional = MOCK_POSITIONS.filter((p) => !p.settled).reduce(
      (sum, p) => sum + p.notional * p.locked_forward,
      0
    );
    return { active, called, liquidated, matured, totalNotional };
  }, [now]);

  // Mock waterfall for selected position
  const selectedWaterfall =
    selectedPosition !== null
      ? {
          loserMargin: 2941.18,
          insuranceUsed: 0,
          winnerHaircut: 0,
          hedgerPayout: 3200.5,
          makerPayout: 2681.86,
        }
      : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const FILTERS: { key: FilterType; label: string; count: number; icon: any }[] = [
    { key: "all", label: "All", count: MOCK_POSITIONS.length, icon: BarChart3 },
    { key: "active", label: "Active", count: stats.active, icon: CheckCircle2 },
    { key: "called", label: "Called", count: stats.called, icon: AlertTriangle },
    { key: "liquidated", label: "Liquidated", count: stats.liquidated, icon: XCircle },
    { key: "matured", label: "Matured", count: stats.matured, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Positions</h1>
        <div className="text-sm text-gray-500">
          Total Notional:{" "}
          <span className="font-mono text-gray-300">{formatUSDC(stats.totalNotional)}</span>
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
            <div key={pos.id} onClick={() => setSelectedPosition(pos.id)}>
              <PositionCard
                position={pos}
                userAddress={walletAddress}
                showActions={true}
              />
            </div>
          ))
        )}
      </div>

      {/* Waterfall view for selected position */}
      {selectedWaterfall && selectedPosition !== null && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">
              Settlement Waterfall (Position #{selectedPosition})
            </h2>
            <button
              onClick={() => setSelectedPosition(null)}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Close
            </button>
          </div>
          <WaterfallView {...selectedWaterfall} />
        </div>
      )}
    </div>
  );
}

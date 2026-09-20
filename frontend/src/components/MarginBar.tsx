"use client";

import { formatUSDC, formatPercent } from "@/lib/format";
import { MARGIN_CALL_THRESHOLD, LIQUIDATION_THRESHOLD } from "@/lib/constants";

interface MarginBarProps {
  posted: number;
  initial: number;
  state: "Safe" | "Called" | "Liquidated";
  label: string;
}

export default function MarginBar({ posted, initial, state, label }: MarginBarProps) {
  const ratio = initial > 0 ? posted / initial : 1;
  const usedPct = Math.min(Math.max((1 - ratio) * 100, 0), 100);

  const barColor =
    state === "Liquidated"
      ? "bg-red-500"
      : state === "Called"
      ? "bg-yellow-500"
      : "bg-emerald-500";

  const stateColor =
    state === "Liquidated"
      ? "text-red-400"
      : state === "Called"
      ? "text-yellow-400"
      : "text-emerald-400";

  const stateBg =
    state === "Liquidated"
      ? "bg-red-900/30"
      : state === "Called"
      ? "bg-yellow-900/30"
      : "bg-emerald-900/30";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${stateColor} ${stateBg}`}>
          {state}
        </span>
      </div>

      {/* Bar */}
      <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 ${barColor} rounded-full transition-all duration-700`}
          style={{ width: `${Math.max(100 - usedPct, 0)}%` }}
        />
        {/* Threshold markers */}
        <div
          className="absolute inset-y-0 w-px bg-yellow-500/60"
          style={{ left: `${(1 - MARGIN_CALL_THRESHOLD) * 100}%` }}
          title="Margin Call (50%)"
        />
        <div
          className="absolute inset-y-0 w-px bg-red-500/60"
          style={{ left: `${(1 - LIQUIDATION_THRESHOLD) * 100}%` }}
          title="Liquidation (100%)"
        />
      </div>

      <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
        <span>
          <span className="font-mono text-gray-400">{formatUSDC(posted)}</span> / {formatUSDC(initial)}
        </span>
        <span className="font-mono">{formatPercent(ratio)} remaining</span>
      </div>
    </div>
  );
}

"use client";

import { formatUSDC } from "@/lib/format";

interface WaterfallViewProps {
  loserMargin: number;
  insuranceUsed: number;
  winnerHaircut: number;
  hedgerPayout: number;
  makerPayout: number;
}

export default function WaterfallView({
  loserMargin,
  insuranceUsed,
  winnerHaircut,
  hedgerPayout,
  makerPayout,
}: WaterfallViewProps) {
  const total = loserMargin + insuranceUsed + winnerHaircut;

  const loserPct = total > 0 ? (loserMargin / total) * 100 : 0;
  const insurancePct = total > 0 ? (insuranceUsed / total) * 100 : 0;
  const haircutPct = total > 0 ? (winnerHaircut / total) * 100 : 0;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
        Settlement Waterfall
      </h4>

      {/* Stacked bar */}
      <div className="h-8 rounded-lg overflow-hidden flex mb-3">
        {loserPct > 0 && (
          <div
            className="bg-red-500 flex items-center justify-center"
            style={{ width: `${loserPct}%` }}
          >
            {loserPct > 15 && (
              <span className="text-xs font-medium text-white">Margin</span>
            )}
          </div>
        )}
        {insurancePct > 0 && (
          <div
            className="bg-yellow-500 flex items-center justify-center"
            style={{ width: `${insurancePct}%` }}
          >
            {insurancePct > 15 && (
              <span className="text-xs font-medium text-gray-900">Insurance</span>
            )}
          </div>
        )}
        {haircutPct > 0 && (
          <div
            className="bg-orange-500 flex items-center justify-center"
            style={{ width: `${haircutPct}%` }}
          >
            {haircutPct > 15 && (
              <span className="text-xs font-medium text-white">Haircut</span>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-4 text-xs mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <div>
            <span className="text-gray-500 block">Loser Margin</span>
            <span className="font-mono text-gray-300">{formatUSDC(loserMargin)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-yellow-500" />
          <div>
            <span className="text-gray-500 block">Insurance Fund</span>
            <span className="font-mono text-gray-300">{formatUSDC(insuranceUsed)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-orange-500" />
          <div>
            <span className="text-gray-500 block">Winner Haircut</span>
            <span className="font-mono text-gray-300">{formatUSDC(winnerHaircut)}</span>
          </div>
        </div>
      </div>

      {/* Payouts */}
      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-800">
        <div>
          <span className="text-xs text-gray-500 block">Hedger Payout</span>
          <span
            className={`font-mono text-sm font-medium ${
              hedgerPayout >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {formatUSDC(hedgerPayout)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs text-gray-500 block">Maker Payout</span>
          <span
            className={`font-mono text-sm font-medium ${
              makerPayout >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {formatUSDC(makerPayout)}
          </span>
        </div>
      </div>
    </div>
  );
}

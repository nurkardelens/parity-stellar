"use client";

import { useState, useEffect } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  DollarSign,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { formatPrice, formatUSDC, formatCountdown } from "@/lib/format";
import { markPosition, topUpMargin, liquidate, settle } from "@/lib/contract";
import MarginBar from "./MarginBar";
import type { MockPosition } from "@/lib/mock";

interface PositionCardProps {
  position: MockPosition;
  userAddress?: string | null;
  showActions?: boolean;
}

export default function PositionCard({ position, userAddress, showActions = true }: PositionCardProps) {
  const [topUpAmount, setTopUpAmount] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);
  const isMatured = now > 0 && position.maturity <= now;
  const timeToMaturity = now > 0 ? position.maturity - now : 0;

  const mtmPnl =
    position.direction === "buy"
      ? (position.current_forward - position.locked_forward) * position.notional
      : (position.locked_forward - position.current_forward) * position.notional;

  // User side detection reserved for future conditional rendering
  void userAddress;

  const handleMark = async () => {
    setLoading("mark");
    try {
      await markPosition(position.id);
    } finally {
      setLoading(null);
    }
  };

  const handleTopUp = async () => {
    if (!topUpAmount) return;
    setLoading("topup");
    try {
      await topUpMargin("", position.id, parseFloat(topUpAmount));
      setTopUpAmount("");
    } finally {
      setLoading(null);
    }
  };

  const handleLiquidate = async () => {
    setLoading("liquidate");
    try {
      await liquidate(position.id);
    } finally {
      setLoading(null);
    }
  };

  const handleSettle = async () => {
    setLoading("settle");
    try {
      await settle(position.id);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div
      className={`bg-gray-900 border rounded-xl overflow-hidden ${
        position.settled
          ? "border-gray-700 opacity-60"
          : position.hedger_state === "Liquidated" || position.maker_state === "Liquidated"
          ? "border-red-800"
          : position.hedger_state === "Called" || position.maker_state === "Called"
          ? "border-yellow-800"
          : "border-gray-800"
      }`}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-white">#{position.id}</span>
            <span className="font-mono text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">
              {position.pair}
            </span>
            <span
              className={`flex items-center gap-1 text-xs font-medium ${
                position.direction === "buy" ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {position.direction === "buy" ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {position.direction.toUpperCase()}
            </span>
            {position.settled && (
              <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded">SETTLED</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            {now === 0 ? (
              <span className="text-gray-600">...</span>
            ) : isMatured ? (
              <span className="text-yellow-400">Matured</span>
            ) : (
              formatCountdown(timeToMaturity)
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-3 text-sm">
          <div>
            <span className="text-gray-500 text-xs block">Notional</span>
            <span className="font-mono text-gray-300">
              {position.notional.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-gray-500 text-xs block">Locked Forward</span>
            <span className="font-mono text-white">{formatPrice(position.locked_forward)}</span>
          </div>
          <div>
            <span className="text-gray-500 text-xs block">Current Forward</span>
            <span className="font-mono text-gray-300">{formatPrice(position.current_forward)}</span>
          </div>
          <div className="text-right">
            <span className="text-gray-500 text-xs block">Hedger MtM</span>
            <span
              className={`font-mono font-medium ${
                mtmPnl >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {mtmPnl >= 0 ? "+" : ""}
              {formatUSDC(mtmPnl)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-2 text-xs text-gray-500">
          <span>Hedger: {position.hedger}</span>
          <span className="text-right">Maker: {position.maker}</span>
        </div>
      </div>

      {/* Margins */}
      <div className="px-5 py-4 space-y-3">
        <MarginBar
          label="Hedger Margin"
          posted={position.hedger_margin}
          initial={position.initial_margin}
          state={position.hedger_state}
        />
        <MarginBar
          label="Maker Margin"
          posted={position.maker_margin}
          initial={position.initial_margin}
          state={position.maker_state}
        />
      </div>

      {/* Actions */}
      {showActions && !position.settled && (
        <div className="px-5 py-4 border-t border-gray-800/50 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleMark}
              disabled={loading === "mark"}
              className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs px-3 py-1.5 rounded-md transition-colors"
            >
              {loading === "mark" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              Mark to Market
            </button>

            {isMatured && (
              <button
                onClick={handleSettle}
                disabled={loading === "settle"}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-md font-medium transition-colors"
              >
                {loading === "settle" ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3 h-3" />
                )}
                Settle
              </button>
            )}

            {(position.hedger_state === "Called" || position.maker_state === "Called" ||
              position.hedger_state === "Liquidated" || position.maker_state === "Liquidated") && (
              <button
                onClick={handleLiquidate}
                disabled={loading === "liquidate"}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1.5 rounded-md font-medium transition-colors"
              >
                {loading === "liquidate" ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <XCircle className="w-3 h-3" />
                )}
                Liquidate
              </button>
            )}
          </div>

          {/* Top-up form for Called positions */}
          {(position.hedger_state === "Called" || position.maker_state === "Called") && (
            <div className="flex items-center gap-2 p-3 bg-yellow-900/10 border border-yellow-800/30 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              <span className="text-xs text-yellow-400 flex-shrink-0">Margin Call</span>
              <input
                type="text"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="USDC amount"
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-yellow-500"
              />
              <button
                onClick={handleTopUp}
                disabled={loading === "topup" || !topUpAmount}
                className="flex items-center gap-1 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 text-white text-xs px-3 py-1.5 rounded font-medium transition-colors"
              >
                {loading === "topup" ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <DollarSign className="w-3 h-3" />
                )}
                Top Up
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

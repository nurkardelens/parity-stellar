"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { MOCK_SPOT, MOCK_RATES, computeMockForward } from "@/lib/mock";
import { formatPrice } from "@/lib/format";
import type { Pair } from "@/lib/constants";

interface ForwardDisplayProps {
  pair: Pair;
  tenor: number;
}

export default function ForwardDisplay({ pair, tenor }: ForwardDisplayProps) {
  const [spot, setSpot] = useState(MOCK_SPOT[pair]);
  const [forward, setForward] = useState(computeMockForward(pair, tenor));
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevForwardRef = useRef(forward);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const base = pair.split("/")[0];
  const quote = pair.split("/")[1];
  const rBase = MOCK_RATES[base] || 0.1;
  const rQuote = MOCK_RATES[quote] || 0.05;

  // When pair or tenor changes, reset spot and forward
  useEffect(() => {
    setSpot(MOCK_SPOT[pair]);
    const newFwd = computeMockForward(pair, tenor);
    prevForwardRef.current = newFwd;
    setForward(newFwd);
  }, [pair, tenor]);

  // Simulate live ticking
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSpot((prev) => {
        const jitter = prev * (Math.random() - 0.5) * 0.0015;
        return prev + jitter;
      });
    }, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pair]);

  // Recompute forward when spot changes
  const computeFwd = useCallback(
    (s: number) => {
      const t = tenor / 360;
      return s * (1 + rQuote * t) / (1 + rBase * t);
    },
    [tenor, rBase, rQuote]
  );

  useEffect(() => {
    const newFwd = computeFwd(spot);
    const prev = prevForwardRef.current;
    if (newFwd > prev) {
      setFlash("up");
    } else if (newFwd < prev) {
      setFlash("down");
    }
    prevForwardRef.current = newFwd;
    setForward(newFwd);
    const timer = setTimeout(() => setFlash(null), 600);
    return () => clearTimeout(timer);
  }, [spot, computeFwd]);

  const impliedPremium = ((forward - spot) / spot) * 100;
  const isPositive = impliedPremium >= 0;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
          Forward Price
        </h3>
        <span className="text-xs text-gray-500 font-mono">{pair} {tenor}D</span>
      </div>

      <div className="flex items-end gap-3 mb-4">
        <span
          className={`text-4xl font-mono font-bold tracking-tight transition-colors duration-500 ${
            flash === "up"
              ? "text-emerald-400"
              : flash === "down"
              ? "text-red-400"
              : "text-white"
          }`}
        >
          {formatPrice(forward)}
        </span>
        {flash === "up" ? (
          <TrendingUp className="w-5 h-5 text-emerald-400 mb-1" />
        ) : flash === "down" ? (
          <TrendingDown className="w-5 h-5 text-red-400 mb-1" />
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-gray-500 block">Spot</span>
          <span className="font-mono text-gray-300">{formatPrice(spot)}</span>
        </div>
        <div className="flex flex-col items-center">
          <ArrowRight className="w-4 h-4 text-gray-600 mb-1" />
          <span className="text-gray-500 text-xs">{tenor}D</span>
        </div>
        <div className="text-right">
          <span className="text-gray-500 block">Premium</span>
          <span
            className={`font-mono ${
              isPositive ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {isPositive ? "+" : ""}
            {impliedPremium.toFixed(3)}%
          </span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-2 gap-4 text-xs">
        <div>
          <span className="text-gray-500">r({base})</span>
          <span className="font-mono text-gray-400 ml-2">
            {(rBase * 100).toFixed(2)}%
          </span>
        </div>
        <div className="text-right">
          <span className="text-gray-500">r({quote})</span>
          <span className="font-mono text-gray-400 ml-2">
            {(rQuote * 100).toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Parity formula reminder */}
      <div className="mt-3 px-3 py-2 bg-gray-800/50 rounded-lg">
        <p className="text-xs font-mono text-gray-500 text-center">
          F = S x (1 + r<sub>q</sub> x t/360) / (1 + r<sub>b</sub> x t/360)
        </p>
      </div>
    </div>
  );
}

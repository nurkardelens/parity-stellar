"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { PAIRS, TENORS, type Pair } from "@/lib/constants";
import { formatUSDC } from "@/lib/format";
import { postRequest } from "@/lib/contract";

interface RequestFormProps {
  onPairChange?: (pair: Pair) => void;
  onTenorChange?: (tenor: number) => void;
  walletConnected: boolean;
}

export default function RequestForm({
  onPairChange,
  onTenorChange,
  walletConnected,
}: RequestFormProps) {
  const [pair, setPair] = useState<Pair>("MXN/USD");
  const [direction, setDirection] = useState<"Buy" | "Sell">("Sell");
  const [notional, setNotional] = useState<string>("1000000");
  const [tenor, setTenor] = useState<number>(90);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const margin = parseFloat(notional || "0") * 0.05;

  const handlePairChange = (p: Pair) => {
    setPair(p);
    onPairChange?.(p);
  };

  const handleTenorChange = (t: number) => {
    setTenor(t);
    onTenorChange?.(t);
  };

  const handleSubmit = async () => {
    if (!walletConnected) return;
    setLoading(true);
    setSuccess(false);
    try {
      const [pairBase, pairQuote] = pair.split("/").reverse(); // MXN/USD → base=USD, quote=MXN
      const ok = await postRequest("", pairBase, pairQuote, direction === "Sell" ? "SellBase" : "BuyBase", parseFloat(notional), tenor, "");
      if (ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Post request failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
        Post RFQ
      </h3>

      {/* Pair Selection */}
      <div className="mb-4">
        <label className="text-xs text-gray-500 mb-1 block">Pair</label>
        <div className="grid grid-cols-2 gap-2">
          {PAIRS.map((p) => (
            <button
              key={p}
              onClick={() => handlePairChange(p)}
              className={`py-2 px-3 rounded-lg text-sm font-mono font-medium transition-colors ${
                pair === p
                  ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/50"
                  : "bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Direction */}
      <div className="mb-4">
        <label className="text-xs text-gray-500 mb-1 block">Direction</label>
        <div className="grid grid-cols-2 gap-2">
          {(["Buy", "Sell"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDirection(d)}
              className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                direction === d
                  ? d === "Buy"
                    ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/50"
                    : "bg-red-600/20 text-red-400 border border-red-500/50"
                  : "bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Notional */}
      <div className="mb-4">
        <label className="text-xs text-gray-500 mb-1 block">Notional (base currency)</label>
        <input
          type="text"
          value={notional}
          onChange={(e) => setNotional(e.target.value.replace(/[^0-9.]/g, ""))}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition-colors"
          placeholder="1,000,000"
        />
      </div>

      {/* Tenor */}
      <div className="mb-4">
        <label className="text-xs text-gray-500 mb-1 block">Tenor (days)</label>
        <div className="flex gap-2 flex-wrap">
          {TENORS.map((t) => (
            <button
              key={t}
              onClick={() => handleTenorChange(t)}
              className={`py-1.5 px-3 rounded-lg text-xs font-mono font-medium transition-colors ${
                tenor === t
                  ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/50"
                  : "bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600"
              }`}
            >
              {t}D
            </button>
          ))}
        </div>
      </div>

      {/* Margin info */}
      <div className="mb-4 px-3 py-2 bg-gray-800/50 rounded-lg flex justify-between items-center">
        <span className="text-xs text-gray-500">Required Margin (5%)</span>
        <span className="text-sm font-mono text-yellow-400">
          {formatUSDC(margin)} USDC
        </span>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading || !walletConnected || !notional}
        className={`w-full py-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
          success
            ? "bg-emerald-600 text-white"
            : walletConnected
            ? "bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
            : "bg-gray-700 text-gray-400 cursor-not-allowed"
        }`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : success ? (
          "Request Posted!"
        ) : (
          <>
            <Send className="w-4 h-4" />
            {walletConnected ? "Post Request" : "Connect Wallet First"}
          </>
        )}
      </button>
    </div>
  );
}

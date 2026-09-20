"use client";

import { useState, useEffect, useCallback } from "react";
import { Activity, TrendingUp, BarChart2, Clock, Loader2, Wifi } from "lucide-react";
import ForwardDisplay from "@/components/ForwardDisplay";
import RequestForm from "@/components/RequestForm";
import QuoteList from "@/components/QuoteList";
import { MOCK_REQUESTS } from "@/lib/mock";
import { formatPrice } from "@/lib/format";
import { getSpot, getRate, computeForward, getInsuranceBalance } from "@/lib/contract";
import { CONTRACT_ID } from "@/lib/constants";
import type { Pair } from "@/lib/constants";

export default function DashboardPage() {
  const [pair, setPair] = useState<Pair>("MXN/USD");
  const [tenor, setTenor] = useState(90);
  const [walletConnected, setWalletConnected] = useState(false);

  // On-chain state
  const [spot, setSpot] = useState<number | null>(null);
  const [rateMXN, setRateMXN] = useState<number | null>(null);
  const [rateTRY, setRateTRY] = useState<number | null>(null);
  const [rateUSD, setRateUSD] = useState<number | null>(null);
  const [forward, setForward] = useState<number | null>(null);
  const [insurance, setInsurance] = useState<number | null>(null);
  const [chainLoading, setChainLoading] = useState(true);
  const [chainConnected, setChainConnected] = useState(false);

  // Forward matrix (on-chain computed)
  const [forwardMatrix, setForwardMatrix] = useState<Record<string, Record<number, number>>>({});

  useEffect(() => {
    const check = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setWalletConnected(!!(window as any).__parity_wallet);
    };
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch on-chain data
  const fetchChainData = useCallback(async () => {
    setChainLoading(true);
    try {
      const [spotVal, mxnVal, tryVal, usdVal, insVal] = await Promise.all([
        getSpot(),
        getRate("MXN"),
        getRate("TRY"),
        getRate("USD"),
        getInsuranceBalance(),
      ]);

      if (spotVal !== null) {
        setSpot(spotVal);
        setChainConnected(true);
      }
      if (mxnVal !== null) setRateMXN(mxnVal);
      if (tryVal !== null) setRateTRY(tryVal);
      if (usdVal !== null) setRateUSD(usdVal);
      if (insVal !== null) setInsurance(insVal);

      // Compute forward matrix from chain
      if (spotVal && usdVal && mxnVal && tryVal) {
        const matrix: Record<string, Record<number, number>> = {};
        for (const p of ["MXN/USD", "TRY/USD"]) {
          matrix[p] = {};
          const rQuote = p === "MXN/USD" ? mxnVal : tryVal;
          for (const t of [30, 60, 90, 180, 360]) {
            const fwd = await computeForward(spotVal, usdVal, rQuote, t);
            if (fwd !== null) matrix[p][t] = fwd;
          }
        }
        setForwardMatrix(matrix);
      }
    } catch (err) {
      console.error("Chain fetch failed:", err);
    }
    setChainLoading(false);
  }, []);

  useEffect(() => {
    fetchChainData();
    const interval = setInterval(fetchChainData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchChainData]);

  // Compute selected forward
  useEffect(() => {
    if (spot && rateUSD) {
      const rQuote = pair === "MXN/USD" ? rateMXN : rateTRY;
      if (rQuote) {
        computeForward(spot, rateUSD, rQuote, tenor).then(fwd => {
          if (fwd) setForward(fwd);
        });
      }
    }
  }, [pair, tenor, spot, rateUSD, rateMXN, rateTRY]);

  const spotDisplay = spot ?? 20.0;
  const rateDisplay = { MXN: rateMXN ?? 0.10, TRY: rateTRY ?? 0.45, USD: rateUSD ?? 0.04 };

  return (
    <div className="space-y-6">
      {/* Chain connection status */}
      <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg w-fit ${
        chainConnected
          ? "bg-emerald-900/30 text-emerald-400 border border-emerald-800/50"
          : chainLoading
          ? "bg-yellow-900/30 text-yellow-400 border border-yellow-800/50"
          : "bg-red-900/30 text-red-400 border border-red-800/50"
      }`}>
        {chainLoading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Wifi className="w-3 h-3" />
        )}
        {chainConnected
          ? `On-chain: ${CONTRACT_ID.slice(0, 8)}...${CONTRACT_ID.slice(-4)}`
          : chainLoading
          ? "Connecting to Soroban RPC..."
          : "Using local data (chain unavailable)"}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Activity className="w-3.5 h-3.5" />
            <span className="text-xs uppercase tracking-wider">MXN/USD Spot</span>
          </div>
          <span className="text-xl font-mono font-bold text-white">
            {spotDisplay.toFixed(4)}
          </span>
          {chainConnected && <span className="text-xs text-emerald-500 ml-2">on-chain</span>}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-xs uppercase tracking-wider">Insurance Fund</span>
          </div>
          <span className="text-xl font-mono font-bold text-white">
            {insurance !== null ? `$${insurance.toFixed(2)}` : "$0.00"}
          </span>
          {chainConnected && <span className="text-xs text-emerald-500 ml-2">on-chain</span>}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-xs uppercase tracking-wider">Selected Forward</span>
          </div>
          <span className="text-xl font-mono font-bold text-emerald-400">
            {forward ? forward.toFixed(4) : "—"}
          </span>
          {chainConnected && <span className="text-xs text-emerald-500 ml-2">on-chain</span>}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <BarChart2 className="w-3.5 h-3.5" />
            <span className="text-xs uppercase tracking-wider">Open Requests</span>
          </div>
          <span className="text-xl font-mono font-bold text-white">
            {MOCK_REQUESTS.length}
          </span>
        </div>
      </div>

      {/* Rate cards - from chain */}
      <div className="grid grid-cols-3 gap-4">
        {(["MXN", "TRY", "USD"] as const).map((ccy) => (
          <div key={ccy} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">
              r({ccy})
            </span>
            <span className="text-lg font-mono font-bold text-white">
              {(rateDisplay[ccy] * 100).toFixed(2)}%
            </span>
            {chainConnected && <span className="text-xs text-emerald-500 ml-2">on-chain</span>}
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <ForwardDisplay pair={pair} tenor={tenor} chainForward={forward} chainConnected={chainConnected} />
          <RequestForm
            onPairChange={setPair}
            onTenorChange={setTenor}
            walletConnected={walletConnected}
          />
        </div>
        <div className="lg:col-span-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Open Requests</h2>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              Live
            </div>
          </div>
          <QuoteList requests={MOCK_REQUESTS} walletConnected={walletConnected} />
        </div>
      </div>

      {/* Forward Matrix - computed on-chain */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            Forward Matrix
          </h3>
          {chainConnected && (
            <span className="text-xs text-emerald-500 flex items-center gap-1">
              <Wifi className="w-3 h-3" />
              Computed on-chain via Soroban
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs">
                <th className="text-left py-2 px-3 font-medium">Pair</th>
                <th className="text-right py-2 px-3 font-medium">Spot</th>
                <th className="text-right py-2 px-3 font-medium">30D</th>
                <th className="text-right py-2 px-3 font-medium">60D</th>
                <th className="text-right py-2 px-3 font-medium">90D</th>
                <th className="text-right py-2 px-3 font-medium">180D</th>
                <th className="text-right py-2 px-3 font-medium">360D</th>
              </tr>
            </thead>
            <tbody>
              {(["MXN/USD", "TRY/USD"] as const).map((p) => (
                <tr key={p} className="border-t border-gray-800">
                  <td className="py-3 px-3 font-mono font-medium text-white">{p}</td>
                  <td className="py-3 px-3 font-mono text-right text-gray-400">
                    {spotDisplay.toFixed(4)}
                  </td>
                  {[30, 60, 90, 180, 360].map((t) => {
                    const fwd = forwardMatrix[p]?.[t];
                    if (!fwd) return (
                      <td key={t} className="py-3 px-3 text-right text-gray-600 font-mono">—</td>
                    );
                    const premium = ((fwd - spotDisplay) / spotDisplay) * 100;
                    return (
                      <td key={t} className="py-3 px-3 text-right">
                        <span className="font-mono text-white block">{fwd.toFixed(4)}</span>
                        <span className={`text-xs font-mono ${premium >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {premium >= 0 ? "+" : ""}{premium.toFixed(2)}%
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contract info footer */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-xs text-gray-500">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span>Contract: <code className="text-gray-400">{CONTRACT_ID}</code></span>
          <a
            href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-500 hover:text-emerald-400 underline"
          >
            View on Stellar Expert
          </a>
        </div>
      </div>
    </div>
  );
}

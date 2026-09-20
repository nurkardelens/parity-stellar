"use client";

import { useState, useEffect } from "react";
import { Activity, TrendingUp, BarChart2, Clock } from "lucide-react";
import ForwardDisplay from "@/components/ForwardDisplay";
import RequestForm from "@/components/RequestForm";
import QuoteList from "@/components/QuoteList";
import { MOCK_REQUESTS, MOCK_SPOT, MOCK_RATES, computeMockForward } from "@/lib/mock";
import { formatPrice } from "@/lib/format";
import type { Pair } from "@/lib/constants";

export default function DashboardPage() {
  const [pair, setPair] = useState<Pair>("MXN/USD");
  const [tenor, setTenor] = useState(90);
  const [walletConnected, setWalletConnected] = useState(false);

  useEffect(() => {
    const check = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setWalletConnected(!!(window as any).__parity_wallet);
    };
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Activity className="w-3.5 h-3.5" />
            <span className="text-xs uppercase tracking-wider">MXN/USD Spot</span>
          </div>
          <span className="text-xl font-mono font-bold text-white">
            {formatPrice(MOCK_SPOT["MXN/USD"])}
          </span>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Activity className="w-3.5 h-3.5" />
            <span className="text-xs uppercase tracking-wider">TRY/USD Spot</span>
          </div>
          <span className="text-xl font-mono font-bold text-white">
            {formatPrice(MOCK_SPOT["TRY/USD"])}
          </span>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-xs uppercase tracking-wider">Open Requests</span>
          </div>
          <span className="text-xl font-mono font-bold text-white">
            {MOCK_REQUESTS.length}
          </span>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <BarChart2 className="w-3.5 h-3.5" />
            <span className="text-xs uppercase tracking-wider">Active Quotes</span>
          </div>
          <span className="text-xl font-mono font-bold text-white">
            {MOCK_REQUESTS.reduce((sum, r) => sum + r.quotes.filter((q) => q.active).length, 0)}
          </span>
        </div>
      </div>

      {/* Rate cards */}
      <div className="grid grid-cols-3 gap-4">
        {(["MXN", "TRY", "USD"] as const).map((ccy) => (
          <div key={ccy} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">
              r({ccy})
            </span>
            <span className="text-lg font-mono font-bold text-white">
              {(MOCK_RATES[ccy] * 100).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>

      {/* Main grid: Forward + Form | Requests */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left column: Forward price + Request form */}
        <div className="lg:col-span-4 space-y-6">
          <ForwardDisplay pair={pair} tenor={tenor} />
          <RequestForm
            onPairChange={setPair}
            onTenorChange={setTenor}
            walletConnected={walletConnected}
          />
        </div>

        {/* Right column: Open requests with quotes */}
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

      {/* Forward comparison table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
          Forward Matrix
        </h3>
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
                    {formatPrice(MOCK_SPOT[p])}
                  </td>
                  {[30, 60, 90, 180, 360].map((t) => {
                    const fwd = computeMockForward(p, t);
                    const premium = ((fwd - MOCK_SPOT[p]) / MOCK_SPOT[p]) * 100;
                    return (
                      <td key={t} className="py-3 px-3 text-right">
                        <span className="font-mono text-white block">{formatPrice(fwd)}</span>
                        <span
                          className={`text-xs font-mono ${
                            premium >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {premium >= 0 ? "+" : ""}
                          {premium.toFixed(2)}%
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
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  Send,
  Loader2,
  Clock,
  X,
  Eye,
  Handshake,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  MOCK_REQUESTS,
  type MockRequest,
} from "@/lib/mock";
import { submitQuote, cancelQuote } from "@/lib/contract";
import { formatPrice, formatBps, formatCountdown } from "@/lib/format";

export default function MakerPage() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MockRequest | null>(null);
  const [spreadBps, setSpreadBps] = useState("20");
  const [expiryHours, setExpiryHours] = useState("2");
  const [loading, setLoading] = useState<string | null>(null);

  // My quotes tracking
  const [myQuotes, setMyQuotes] = useState<
    { requestId: number; spread_bps: number; expiry: number; active: boolean }[]
  >([
    { requestId: 1, spread_bps: 18, expiry: Math.floor(Date.now() / 1000) + 5400, active: true },
    { requestId: 2, spread_bps: 28, expiry: Math.floor(Date.now() / 1000) + 3600, active: true },
    { requestId: 3, spread_bps: 12, expiry: Math.floor(Date.now() / 1000) - 600, active: false },
  ]);

  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    const check = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setWalletConnected(!!(window as any).__parity_wallet);
      setNow(Math.floor(Date.now() / 1000));
    };
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmitQuote = async (requestId: number) => {
    const key = `submit-${requestId}`;
    setLoading(key);
    try {
      const expiryTs = now + parseInt(expiryHours) * 3600;
      const ok = await submitQuote(requestId, parseInt(spreadBps), expiryTs);
      if (ok) {
        setMyQuotes((prev) => [
          ...prev,
          {
            requestId,
            spread_bps: parseInt(spreadBps),
            expiry: expiryTs,
            active: true,
          },
        ]);
      }
    } finally {
      setLoading(null);
    }
  };

  const handleCancelQuote = async (requestId: number, idx: number) => {
    const key = `cancel-${requestId}-${idx}`;
    setLoading(key);
    try {
      await cancelQuote(requestId, idx);
      setMyQuotes((prev) =>
        prev.map((q) =>
          q.requestId === requestId ? { ...q, active: false } : q
        )
      );
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Handshake className="w-6 h-6 text-emerald-400" />
          <h1 className="text-2xl font-bold text-white">Maker</h1>
        </div>
        <div className="text-sm text-gray-500">
          My Active Quotes:{" "}
          <span className="font-mono text-gray-300">
            {myQuotes.filter((q) => q.active).length}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left: Open requests */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            Open Requests
          </h2>
          {MOCK_REQUESTS.map((req) => (
            <div
              key={req.id}
              className={`bg-gray-900 border rounded-xl overflow-hidden cursor-pointer transition-colors ${
                selectedRequest?.id === req.id
                  ? "border-emerald-500/50"
                  : "border-gray-800 hover:border-gray-700"
              }`}
              onClick={() => setSelectedRequest(req)}
            >
              <div className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-white">
                      #{req.id}
                    </span>
                    <span className="font-mono text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">
                      {req.pair}
                    </span>
                    <span
                      className={`flex items-center gap-1 text-xs font-medium ${
                        req.direction === "buy"
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {req.direction === "buy" ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {req.direction.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">{req.tenor}D</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs text-gray-500 block">Parity Fwd</span>
                      <span className="font-mono text-sm text-white">
                        {formatPrice(req.forward)}
                      </span>
                    </div>
                    <Eye className="w-4 h-4 text-gray-600" />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>Hedger: {req.hedger}</span>
                  <span>
                    Notional:{" "}
                    <span className="font-mono text-gray-400">
                      {req.notional.toLocaleString()}
                    </span>
                  </span>
                </div>

                {/* Existing quotes count */}
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-gray-600">
                    {req.quotes.filter((q) => q.active).length} active quote
                    {req.quotes.filter((q) => q.active).length !== 1 ? "s" : ""}
                  </span>
                  {req.quotes
                    .filter((q) => q.active)
                    .map((q, i) => (
                      <span
                        key={i}
                        className="text-xs font-mono text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded"
                      >
                        {formatBps(q.spread_bps)}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Quote form + My quotes */}
        <div className="lg:col-span-5 space-y-6">
          {/* Submit quote form */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
              Submit Quote
            </h3>

            {selectedRequest ? (
              <div className="space-y-4">
                <div className="bg-gray-800/50 rounded-lg p-3 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-500">Request</span>
                    <span className="font-mono text-white">#{selectedRequest.id}</span>
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-500">Pair</span>
                    <span className="font-mono text-gray-300">{selectedRequest.pair}</span>
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-500">Direction</span>
                    <span
                      className={`font-mono ${
                        selectedRequest.direction === "buy"
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {selectedRequest.direction.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Parity Forward</span>
                    <span className="font-mono text-white">
                      {formatPrice(selectedRequest.forward)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Spread (basis points)
                  </label>
                  <input
                    type="text"
                    value={spreadBps}
                    onChange={(e) => setSpreadBps(e.target.value.replace(/[^0-9]/g, ""))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="20"
                  />
                  <div className="mt-1 text-xs text-gray-600">
                    All-in forward:{" "}
                    <span className="font-mono text-gray-400">
                      {formatPrice(
                        selectedRequest.direction === "buy"
                          ? selectedRequest.forward *
                              (1 + parseInt(spreadBps || "0") / 10000)
                          : selectedRequest.forward *
                              (1 - parseInt(spreadBps || "0") / 10000)
                      )}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Quote Validity (hours)
                  </label>
                  <div className="flex gap-2">
                    {["1", "2", "4", "8", "24"].map((h) => (
                      <button
                        key={h}
                        onClick={() => setExpiryHours(h)}
                        className={`flex-1 py-1.5 rounded text-xs font-mono transition-colors ${
                          expiryHours === h
                            ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/50"
                            : "bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600"
                        }`}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>

                {/* Required margin */}
                <div className="px-3 py-2 bg-gray-800/50 rounded-lg flex justify-between text-xs">
                  <span className="text-gray-500">Required Margin (5%)</span>
                  <span className="font-mono text-yellow-400">
                    $
                    {(selectedRequest.notional * selectedRequest.forward * 0.05).toLocaleString(
                      "en-US",
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                    )}{" "}
                    USDC
                  </span>
                </div>

                <button
                  onClick={() => handleSubmitQuote(selectedRequest.id)}
                  disabled={
                    loading === `submit-${selectedRequest.id}` ||
                    !walletConnected ||
                    !spreadBps
                  }
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {loading === `submit-${selectedRequest.id}` ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {walletConnected ? "Submit Quote" : "Connect Wallet First"}
                </button>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-600 text-sm">
                Select a request to submit a quote
              </div>
            )}
          </div>

          {/* My Quotes */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
              My Quotes
            </h3>
            <div className="space-y-2">
              {myQuotes.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-4">
                  No quotes submitted yet
                </p>
              ) : (
                myQuotes.map((q, idx) => {
                  const timeLeft = q.expiry - now;
                  const isExpired = timeLeft <= 0;
                  const req = MOCK_REQUESTS.find((r) => r.id === q.requestId);
                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        !q.active || isExpired
                          ? "bg-gray-800/30 opacity-50"
                          : "bg-gray-800/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-gray-500">
                          #{q.requestId}
                        </span>
                        {req && (
                          <span className="text-xs text-gray-400">{req.pair}</span>
                        )}
                        <span className="font-mono text-xs text-yellow-400">
                          {formatBps(q.spread_bps)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {q.active && !isExpired ? (
                          <>
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              {formatCountdown(timeLeft)}
                            </span>
                            <button
                              onClick={() => handleCancelQuote(q.requestId, idx)}
                              disabled={loading === `cancel-${q.requestId}-${idx}`}
                              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/40 px-2 py-1 rounded transition-colors"
                            >
                              {loading === `cancel-${q.requestId}-${idx}` ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <X className="w-3 h-3" />
                              )}
                              Cancel
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-gray-600">
                            {isExpired ? "Expired" : "Cancelled"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

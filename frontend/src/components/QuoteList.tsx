"use client";

import { useState, useEffect } from "react";
import { Check, Loader2, Clock } from "lucide-react";
import { formatBps, formatCountdown, formatPrice } from "@/lib/format";
import { acceptQuote } from "@/lib/contract";
import type { MockRequest } from "@/lib/mock";

interface QuoteListProps {
  requests: MockRequest[];
  walletConnected: boolean;
}

export default function QuoteList({ requests, walletConnected }: QuoteListProps) {
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAccept = async (requestId: number, quoteIndex: number) => {
    const key = `${requestId}-${quoteIndex}`;
    setAcceptingId(key);
    try {
      await acceptQuote("", requestId, quoteIndex);
    } finally {
      setAcceptingId(null);
    }
  };

  if (requests.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-500 text-sm">No open requests</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((req) => (
        <div
          key={req.id}
          className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
        >
          {/* Request header */}
          <div className="px-5 py-4 border-b border-gray-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-white">
                  #{req.id}
                </span>
                <span className="font-mono text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">
                  {req.pair}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-medium ${
                    req.direction === "buy"
                      ? "bg-emerald-900/40 text-emerald-400"
                      : "bg-red-900/40 text-red-400"
                  }`}
                >
                  {req.direction.toUpperCase()}
                </span>
                <span className="text-xs text-gray-500">{req.tenor}D</span>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Parity Forward</div>
                <div className="font-mono text-sm text-white">
                  {formatPrice(req.forward)}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>Hedger: {req.hedger}</span>
              <span>
                Notional: <span className="font-mono text-gray-400">{req.notional.toLocaleString()}</span>
              </span>
            </div>
          </div>

          {/* Quotes */}
          <div className="px-5 py-3">
            {req.quotes.length === 0 ? (
              <p className="text-xs text-gray-600 py-2">No quotes yet</p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-4 text-xs text-gray-500 px-1">
                  <span>Maker</span>
                  <span>Spread</span>
                  <span>Expires</span>
                  <span className="text-right">Action</span>
                </div>
                {req.quotes
                  .filter((q) => q.active)
                  .map((quote, idx) => {
                    const key = `${req.id}-${idx}`;
                    const isAccepting = acceptingId === key;
                    const timeLeft = quote.expiry - now;
                    const allInFwd =
                      req.direction === "buy"
                        ? req.forward * (1 + quote.spread_bps / 10000)
                        : req.forward * (1 - quote.spread_bps / 10000);

                    return (
                      <div
                        key={idx}
                        className="grid grid-cols-4 gap-4 items-center bg-gray-800/50 rounded-lg px-3 py-2"
                      >
                        <span className="font-mono text-xs text-gray-300">
                          {quote.maker}
                        </span>
                        <div>
                          <span className="font-mono text-xs text-yellow-400">
                            {formatBps(quote.spread_bps)}
                          </span>
                          <span className="text-gray-600 text-xs ml-1">
                            ({formatPrice(allInFwd)})
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          {formatCountdown(timeLeft)}
                        </div>
                        <div className="text-right">
                          <button
                            onClick={() => handleAccept(req.id, idx)}
                            disabled={isAccepting || !walletConnected}
                            className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs px-3 py-1.5 rounded-md font-medium transition-colors"
                          >
                            {isAccepting ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            Accept
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

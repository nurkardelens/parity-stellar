"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Loader2,
  Shield,
  DollarSign,
  Clock,
  UserPlus,
  Zap,
  RefreshCw,
} from "lucide-react";
import {
  setSpotPrice,
  setRate,
  setTime,
  addEligible,
  initialize,
  getInsuranceBalance,
} from "@/lib/contract";
import { MOCK_SPOT, MOCK_RATES } from "@/lib/mock";
import { formatUSDC } from "@/lib/format";

interface AdminPanelProps {
  walletConnected: boolean;
}

export default function AdminPanel({ walletConnected }: AdminPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [insuranceBalance, setInsuranceBalance] = useState<number>(50000);

  // Spot prices
  const [mxnSpot, setMxnSpot] = useState(MOCK_SPOT["MXN/USD"].toString());
  const [trySpot, setTrySpot] = useState(MOCK_SPOT["TRY/USD"].toString());

  // Rates
  const [mxnRate, setMxnRate] = useState((MOCK_RATES.MXN * 100).toString());
  const [tryRate, setTryRate] = useState((MOCK_RATES.TRY * 100).toString());
  const [usdRate, setUsdRate] = useState((MOCK_RATES.USD * 100).toString());

  // Time & address
  const [demoTime, setDemoTime] = useState("");
  const [eligibleAddress, setEligibleAddress] = useState("");

  useEffect(() => {
    const fetchInsurance = async () => {
      const balance = await getInsuranceBalance();
      if (balance !== null) setInsuranceBalance(balance);
    };
    fetchInsurance();
  }, []);

  const showSuccess = (key: string) => {
    setSuccess(key);
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleSetSpot = async (pair: string, value: string) => {
    const key = `spot-${pair}`;
    setLoading(key);
    try {
      const ok = await setSpotPrice(pair, parseFloat(value));
      if (ok) showSuccess(key);
    } finally {
      setLoading(null);
    }
  };

  const handleSetRate = async (currency: string, value: string) => {
    const key = `rate-${currency}`;
    setLoading(key);
    try {
      const ok = await setRate(currency, parseFloat(value) / 100);
      if (ok) showSuccess(key);
    } finally {
      setLoading(null);
    }
  };

  const handleSetTime = async () => {
    setLoading("time");
    try {
      const ts = demoTime
        ? Math.floor(new Date(demoTime).getTime() / 1000)
        : Math.floor(Date.now() / 1000);
      const ok = await setTime(ts);
      if (ok) showSuccess("time");
    } finally {
      setLoading(null);
    }
  };

  const handleAddEligible = async () => {
    if (!eligibleAddress) return;
    setLoading("eligible");
    try {
      const ok = await addEligible(eligibleAddress);
      if (ok) {
        showSuccess("eligible");
        setEligibleAddress("");
      }
    } finally {
      setLoading(null);
    }
  };

  const handleInitialize = async () => {
    setLoading("init");
    try {
      const ok = await initialize();
      if (ok) showSuccess("init");
    } finally {
      setLoading(null);
    }
  };

  // Demo scenario: MXN crisis
  const handleMxnCrisis = async () => {
    setLoading("scenario-mxn");
    try {
      await setSpotPrice("MXN/USD", 0.048);
      setMxnSpot("0.048");
      await setRate("MXN", 0.25);
      setMxnRate("25");
      showSuccess("scenario-mxn");
    } finally {
      setLoading(null);
    }
  };

  // Demo scenario: TRY crash
  const handleTryCrash = async () => {
    setLoading("scenario-try");
    try {
      await setSpotPrice("TRY/USD", 0.018);
      setTrySpot("0.018");
      await setRate("TRY", 0.65);
      setTryRate("65");
      showSuccess("scenario-try");
    } finally {
      setLoading(null);
    }
  };

  // Demo scenario: Fed hike
  const handleFedHike = async () => {
    setLoading("scenario-fed");
    try {
      await setRate("USD", 0.075);
      setUsdRate("7.5");
      showSuccess("scenario-fed");
    } finally {
      setLoading(null);
    }
  };

  const handleAdvance30d = async () => {
    setLoading("advance");
    try {
      const ts = Math.floor(Date.now() / 1000) + 86400 * 30;
      const ok = await setTime(ts);
      if (ok) showSuccess("advance");
    } finally {
      setLoading(null);
    }
  };

  const btnClass = (key: string) =>
    `flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium transition-colors ${
      success === key
        ? "bg-emerald-600 text-white"
        : "bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:bg-gray-800/50 disabled:text-gray-600"
    }`;

  return (
    <div className="space-y-6">
      {/* Insurance Fund */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
              Insurance Fund
            </h3>
          </div>
          <span className="text-2xl font-mono font-bold text-emerald-400">
            {formatUSDC(insuranceBalance)}
          </span>
        </div>
      </div>

      {/* Initialize */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
          Contract
        </h3>
        <button
          onClick={handleInitialize}
          disabled={loading === "init" || !walletConnected}
          className={btnClass("init")}
        >
          {loading === "init" ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Settings className="w-3 h-3" />
          )}
          {success === "init" ? "Initialized!" : "Initialize Contract"}
        </button>
      </div>

      {/* Spot Prices */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            Spot Prices
          </h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-20">MXN/USD</span>
            <input
              type="text"
              value={mxnSpot}
              onChange={(e) => setMxnSpot(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={() => handleSetSpot("MXN/USD", mxnSpot)}
              disabled={loading === "spot-MXN/USD" || !walletConnected}
              className={btnClass("spot-MXN/USD")}
            >
              {loading === "spot-MXN/USD" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Set"}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-20">TRY/USD</span>
            <input
              type="text"
              value={trySpot}
              onChange={(e) => setTrySpot(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={() => handleSetSpot("TRY/USD", trySpot)}
              disabled={loading === "spot-TRY/USD" || !walletConnected}
              className={btnClass("spot-TRY/USD")}
            >
              {loading === "spot-TRY/USD" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Set"}
            </button>
          </div>
        </div>
      </div>

      {/* Interest Rates */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            Interest Rates
          </h3>
        </div>
        <div className="space-y-3">
          {[
            { label: "MXN", value: mxnRate, setter: setMxnRate, currency: "MXN" },
            { label: "TRY", value: tryRate, setter: setTryRate, currency: "TRY" },
            { label: "USD", value: usdRate, setter: setUsdRate, currency: "USD" },
          ].map(({ label, value, setter, currency }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-20">{label}</span>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500 pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                  %
                </span>
              </div>
              <button
                onClick={() => handleSetRate(currency, value)}
                disabled={loading === `rate-${currency}` || !walletConnected}
                className={btnClass(`rate-${currency}`)}
              >
                {loading === `rate-${currency}` ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  "Set"
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Demo Time */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            Demo Time
          </h3>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <input
            type="datetime-local"
            value={demoTime}
            onChange={(e) => setDemoTime(e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
          />
          <button
            onClick={handleSetTime}
            disabled={loading === "time" || !walletConnected}
            className={btnClass("time")}
          >
            {loading === "time" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Set Time"}
          </button>
        </div>
        <button
          onClick={handleAdvance30d}
          disabled={loading === "advance" || !walletConnected}
          className={btnClass("advance") + " w-full justify-center"}
        >
          {loading === "advance" ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Clock className="w-3 h-3" />
          )}
          {success === "advance" ? "Advanced!" : "Advance +30 Days"}
        </button>
      </div>

      {/* Add Eligible */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            Add Eligible Address
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={eligibleAddress}
            onChange={(e) => setEligibleAddress(e.target.value)}
            placeholder="G..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={handleAddEligible}
            disabled={loading === "eligible" || !walletConnected || !eligibleAddress}
            className={btnClass("eligible")}
          >
            {loading === "eligible" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}
          </button>
        </div>
      </div>

      {/* Demo Scenarios */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-yellow-400" />
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            Demo Scenarios
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={handleMxnCrisis}
            disabled={loading === "scenario-mxn" || !walletConnected}
            className="bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-left transition-colors"
          >
            <span className="text-sm font-medium text-white block">MXN Crisis</span>
            <span className="text-xs text-gray-500 mt-0.5 block">
              Spot to 0.048, rate to 25%
            </span>
            {loading === "scenario-mxn" && <Loader2 className="w-3 h-3 animate-spin mt-1 text-gray-400" />}
          </button>
          <button
            onClick={handleTryCrash}
            disabled={loading === "scenario-try" || !walletConnected}
            className="bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-left transition-colors"
          >
            <span className="text-sm font-medium text-white block">TRY Crash</span>
            <span className="text-xs text-gray-500 mt-0.5 block">
              Spot to 0.018, rate to 65%
            </span>
            {loading === "scenario-try" && <Loader2 className="w-3 h-3 animate-spin mt-1 text-gray-400" />}
          </button>
          <button
            onClick={handleFedHike}
            disabled={loading === "scenario-fed" || !walletConnected}
            className="bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-left transition-colors"
          >
            <span className="text-sm font-medium text-white block">Fed Hike</span>
            <span className="text-xs text-gray-500 mt-0.5 block">
              USD rate to 7.5%
            </span>
            {loading === "scenario-fed" && <Loader2 className="w-3 h-3 animate-spin mt-1 text-gray-400" />}
          </button>
        </div>
      </div>
    </div>
  );
}

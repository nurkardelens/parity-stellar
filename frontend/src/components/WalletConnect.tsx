"use client";

import { useState, useEffect, useCallback } from "react";
import { Wallet, LogOut, Circle } from "lucide-react";
import { connectWallet, getPublicKey } from "@/lib/stellar";
import { truncateAddress } from "@/lib/format";

interface WalletConnectProps {
  onConnect?: (address: string | null) => void;
}

export default function WalletConnect({ onConnect }: WalletConnectProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const checkExisting = useCallback(async () => {
    const existing = await getPublicKey();
    if (existing) {
      setAddress(existing);
      onConnect?.(existing);
    }
  }, [onConnect]);

  useEffect(() => {
    checkExisting();
  }, [checkExisting]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const addr = await connectWallet();
      setAddress(addr);
      onConnect?.(addr);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setAddress(null);
    onConnect?.(null);
  };

  if (address) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
          <Circle className="w-2 h-2 fill-emerald-400 text-emerald-400" />
          <span className="text-sm font-mono text-gray-300">
            {truncateAddress(address, 6)}
          </span>
        </div>
        <button
          onClick={handleDisconnect}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          title="Disconnect"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={connecting}
      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
    >
      <Wallet className="w-4 h-4" />
      {connecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}

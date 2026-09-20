"use client";

import { useState, useEffect } from "react";
import { Settings2, AlertTriangle } from "lucide-react";
import AdminPanel from "@/components/AdminPanel";

export default function AdminPage() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    const check = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const addr = (window as any).__parity_wallet || null;
      setWalletConnected(!!addr);
      setWalletAddress(addr);
    };
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings2 className="w-6 h-6 text-gray-400" />
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
        </div>
      </div>

      {!walletConnected && (
        <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
          <div>
            <p className="text-sm text-yellow-400 font-medium">Wallet not connected</p>
            <p className="text-xs text-yellow-600 mt-0.5">
              Connect your wallet to interact with the contract. Admin functions require the contract admin key.
            </p>
          </div>
        </div>
      )}

      <div className="max-w-2xl">
        <AdminPanel walletConnected={walletConnected} walletAddress={walletAddress} />
      </div>
    </div>
  );
}

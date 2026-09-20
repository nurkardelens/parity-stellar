"use client";

import * as StellarSdk from "@stellar/stellar-sdk";
import {
  isConnected,
  requestAccess,
  getAddress,
  signTransaction,
} from "@stellar/freighter-api";
import { SOROBAN_RPC_URL, NETWORK_PASSPHRASE } from "./constants";

let _server: StellarSdk.rpc.Server | null = null;

export function getServer(): StellarSdk.rpc.Server {
  if (!_server) {
    _server = new StellarSdk.rpc.Server(SOROBAN_RPC_URL);
  }
  return _server;
}

// Raw RPC call to avoid SDK XDR parsing of custom contract types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function rpcCall(method: string, params: any): Promise<any> {
  const res = await fetch(SOROBAN_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json.result;
}

export async function connectWallet(): Promise<string | null> {
  try {
    if (typeof window === "undefined") return null;

    const connected = await isConnected();
    if (!connected.isConnected) {
      alert("Please install Freighter wallet extension from freighter.app");
      return null;
    }

    const accessResult = await requestAccess();
    if (accessResult.error) {
      console.error("Freighter access denied:", accessResult.error);
      return null;
    }

    const addressResult = await getAddress();
    if (addressResult.error) {
      console.error("Failed to get address:", addressResult.error);
      return null;
    }

    return addressResult.address || null;
  } catch (err) {
    console.error("Failed to connect wallet:", err);
    return null;
  }
}

export async function getPublicKey(): Promise<string | null> {
  try {
    if (typeof window === "undefined") return null;
    const connected = await isConnected();
    if (!connected.isConnected) return null;

    const addressResult = await getAddress();
    if (addressResult.error) return null;
    return addressResult.address || null;
  } catch {
    return null;
  }
}

export async function signAndSubmitTx(
  txXdr: string
): Promise<{ status: string } | null> {
  try {
    console.log("Requesting Freighter signature...");
    const signedResponse = await signTransaction(txXdr, {
      networkPassphrase: NETWORK_PASSPHRASE,
    });

    if (signedResponse.error) {
      const errMsg = typeof signedResponse.error === "string"
        ? signedResponse.error
        : JSON.stringify(signedResponse.error);
      throw new Error(`Freighter rejected: ${errMsg}`);
    }

    const signedXdr = signedResponse.signedTxXdr;
    if (!signedXdr) {
      throw new Error("Freighter returned empty signature. Make sure you're on Testnet in Freighter settings.");
    }

    // Submit via raw RPC to avoid SDK parsing the response XDR
    console.log("Submitting signed transaction via raw RPC...");
    const sendResult = await rpcCall("sendTransaction", { transaction: signedXdr });
    console.log("Send result:", sendResult.status);

    if (sendResult.status === "PENDING" || sendResult.status === "TRY_AGAIN_LATER") {
      const hash = sendResult.hash;
      // Poll via raw RPC — avoids SDK's getTransaction parsing custom return types
      let attempts = 0;
      while (attempts < 20) {
        await new Promise((r) => setTimeout(r, 1500));
        const txResult = await rpcCall("getTransaction", { hash });
        console.log(`Poll attempt ${attempts + 1}: ${txResult.status}`);
        if (txResult.status === "SUCCESS") {
          return { status: "SUCCESS" };
        }
        if (txResult.status === "FAILED") {
          return { status: "FAILED" };
        }
        // NOT_FOUND = still processing, keep polling
        attempts++;
      }
      throw new Error("Transaction timed out after 30 seconds");
    }

    if (sendResult.status === "ERROR") {
      throw new Error(`Send error: ${sendResult.errorResultXdr || "unknown"}`);
    }

    // DUPLICATE or other = might already be processed
    return { status: sendResult.status || "UNKNOWN" };
  } catch (err) {
    console.error("Transaction failed:", err);
    throw err;
  }
}

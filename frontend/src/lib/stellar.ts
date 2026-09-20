"use client";

import * as StellarSdk from "@stellar/stellar-sdk";
import { SOROBAN_RPC_URL, NETWORK_PASSPHRASE } from "./constants";

let _server: StellarSdk.rpc.Server | null = null;

export function getServer(): StellarSdk.rpc.Server {
  if (!_server) {
    _server = new StellarSdk.rpc.Server(SOROBAN_RPC_URL);
  }
  return _server;
}

export async function connectWallet(): Promise<string | null> {
  try {
    if (typeof window === "undefined") return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const freighter = (window as any).freighterApi;
    if (!freighter) {
      alert("Please install Freighter wallet extension");
      return null;
    }
    const response = await freighter.requestAccess();
    if (response.error) {
      console.error("Freighter access denied:", response.error);
      return null;
    }
    const addressResponse = await freighter.getAddress();
    return addressResponse.address || null;
  } catch (err) {
    console.error("Failed to connect wallet:", err);
    return null;
  }
}

export async function getPublicKey(): Promise<string | null> {
  try {
    if (typeof window === "undefined") return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const freighter = (window as any).freighterApi;
    if (!freighter) return null;
    const addressResponse = await freighter.getAddress();
    return addressResponse.address || null;
  } catch {
    return null;
  }
}

export async function signAndSubmitTx(
  txXdr: string
): Promise<StellarSdk.rpc.Api.GetTransactionResponse | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const freighter = (window as any).freighterApi;
    if (!freighter) throw new Error("Freighter not installed");

    const signedResponse = await freighter.signTransaction(txXdr, {
      networkPassphrase: NETWORK_PASSPHRASE,
    });

    const signedXdr = signedResponse.signedTxXdr;
    const tx = StellarSdk.TransactionBuilder.fromXDR(
      signedXdr,
      NETWORK_PASSPHRASE
    ) as StellarSdk.Transaction;

    const server = getServer();
    const sendResponse = await server.sendTransaction(tx);

    if (sendResponse.status === "PENDING") {
      let getResponse: StellarSdk.rpc.Api.GetTransactionResponse;
      do {
        await new Promise((r) => setTimeout(r, 1000));
        getResponse = await server.getTransaction(sendResponse.hash);
      } while (getResponse.status === "NOT_FOUND");
      return getResponse;
    }

    return null;
  } catch (err) {
    console.error("Transaction failed:", err);
    return null;
  }
}

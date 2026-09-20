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
): Promise<StellarSdk.rpc.Api.GetTransactionResponse | null> {
  try {
    const signedResponse = await signTransaction(txXdr, {
      networkPassphrase: NETWORK_PASSPHRASE,
    });

    if (signedResponse.error) {
      console.error("Signing failed:", signedResponse.error);
      return null;
    }

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

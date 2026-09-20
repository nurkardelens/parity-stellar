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

    console.log("Submitting signed transaction...");
    const tx = StellarSdk.TransactionBuilder.fromXDR(
      signedXdr,
      NETWORK_PASSPHRASE
    ) as StellarSdk.Transaction;

    const server = getServer();
    const sendResponse = await server.sendTransaction(tx);
    console.log("Send response:", sendResponse.status);

    if (sendResponse.status === "PENDING") {
      let getResponse: StellarSdk.rpc.Api.GetTransactionResponse;
      let attempts = 0;
      do {
        await new Promise((r) => setTimeout(r, 1500));
        getResponse = await server.getTransaction(sendResponse.hash);
        attempts++;
      } while (getResponse.status === "NOT_FOUND" && attempts < 20);
      console.log("Transaction result:", getResponse.status);
      return getResponse;
    }

    if (sendResponse.status === "ERROR") {
      throw new Error(`Transaction send error: ${JSON.stringify(sendResponse.errorResult)}`);
    }

    throw new Error(`Unexpected send status: ${sendResponse.status}`);
  } catch (err) {
    console.error("Transaction failed:", err);
    throw err; // Re-throw so callMutate can show the specific error
  }
}

"use client";

import * as StellarSdk from "@stellar/stellar-sdk";
import { getServer, signAndSubmitTx, getPublicKey } from "./stellar";
import { CONTRACT_ID, NETWORK_PASSPHRASE } from "./constants";

async function callView(method: string, ...args: StellarSdk.xdr.ScVal[]): Promise<StellarSdk.xdr.ScVal | null> {
  try {
    const server = getServer();
    const account = new StellarSdk.Account(
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
      "0"
    );
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();

    const simResult = await server.simulateTransaction(tx);
    if ("result" in simResult && simResult.result) {
      return simResult.result.retval;
    }
    return null;
  } catch (err) {
    console.error(`View call ${method} failed:`, err);
    return null;
  }
}

async function callMutate(method: string, ...args: StellarSdk.xdr.ScVal[]): Promise<boolean> {
  try {
    const pubkey = await getPublicKey();
    if (!pubkey) throw new Error("Wallet not connected");

    const server = getServer();
    const account = await server.getAccount(pubkey);
    const contract = new StellarSdk.Contract(CONTRACT_ID);

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: "10000000",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(300)
      .build();

    const simResult = await server.simulateTransaction(tx);
    if ("error" in simResult) {
      console.error("Simulation error:", simResult.error);
      return false;
    }

    const preparedTx = StellarSdk.rpc.assembleTransaction(
      tx,
      simResult as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse
    ).build();

    const result = await signAndSubmitTx(preparedTx.toXDR());
    return result?.status === "SUCCESS";
  } catch (err) {
    console.error(`Mutate call ${method} failed:`, err);
    return false;
  }
}

// Helper to create ScVal types
function toAddress(addr: string): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(StellarSdk.Keypair.fromPublicKey(addr).xdrPublicKey(), { type: "address" });
}

function toSymbol(s: string): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(s, { type: "symbol" });
}

function toU64(n: number | bigint): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(BigInt(n), { type: "u64" });
}

function toI128(n: number | bigint): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(BigInt(n), { type: "i128" });
}

function toU32(n: number): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(n, { type: "u32" });
}

// toBool kept for future use
// function toBool(b: boolean): StellarSdk.xdr.ScVal {
//   return StellarSdk.nativeToScVal(b, { type: "bool" });
// }

// ========== VIEW FUNCTIONS ==========

export async function getSpot(pair: string): Promise<number | null> {
  const result = await callView("get_spot", toSymbol(pair));
  if (!result) return null;
  return Number(StellarSdk.scValToNative(result)) / 1e7;
}

export async function getRate(currency: string): Promise<number | null> {
  const result = await callView("get_rate", toSymbol(currency));
  if (!result) return null;
  return Number(StellarSdk.scValToNative(result)) / 1e7;
}

export async function computeForward(pair: string, tenor: number): Promise<number | null> {
  const result = await callView("compute_forward", toSymbol(pair), toU32(tenor));
  if (!result) return null;
  return Number(StellarSdk.scValToNative(result)) / 1e7;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPosition(positionId: number): Promise<any | null> {
  const result = await callView("get_position", toU64(positionId));
  if (!result) return null;
  return StellarSdk.scValToNative(result);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getRequest(requestId: number): Promise<any | null> {
  const result = await callView("get_request", toU64(requestId));
  if (!result) return null;
  return StellarSdk.scValToNative(result);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getOpenRequests(): Promise<any[] | null> {
  const result = await callView("get_open_requests");
  if (!result) return null;
  return StellarSdk.scValToNative(result);
}

export async function isEligible(address: string): Promise<boolean> {
  const result = await callView("is_eligible", toAddress(address));
  if (!result) return false;
  return StellarSdk.scValToNative(result);
}

export async function getInsuranceBalance(): Promise<number | null> {
  const result = await callView("get_insurance_balance");
  if (!result) return null;
  return Number(StellarSdk.scValToNative(result)) / 1e7;
}

// ========== MUTATE FUNCTIONS ==========

export async function postRequest(
  pair: string,
  direction: "Buy" | "Sell",
  notional: number,
  tenor: number
): Promise<boolean> {
  return callMutate(
    "post_request",
    toSymbol(pair),
    toSymbol(direction.toLowerCase()),
    toI128(Math.round(notional * 1e7)),
    toU32(tenor)
  );
}

export async function submitQuote(
  requestId: number,
  spreadBps: number,
  expiry: number
): Promise<boolean> {
  return callMutate(
    "submit_quote",
    toU64(requestId),
    toU32(spreadBps),
    toU64(expiry)
  );
}

export async function cancelQuote(requestId: number, quoteIndex: number): Promise<boolean> {
  return callMutate("cancel_quote", toU64(requestId), toU32(quoteIndex));
}

export async function acceptQuote(requestId: number, quoteIndex: number): Promise<boolean> {
  return callMutate("accept_quote", toU64(requestId), toU32(quoteIndex));
}

export async function markPosition(positionId: number): Promise<boolean> {
  return callMutate("mark_position", toU64(positionId));
}

export async function topUpMargin(positionId: number, amount: number): Promise<boolean> {
  return callMutate("top_up_margin", toU64(positionId), toI128(Math.round(amount * 1e7)));
}

export async function liquidate(positionId: number): Promise<boolean> {
  return callMutate("liquidate", toU64(positionId));
}

export async function settle(positionId: number): Promise<boolean> {
  return callMutate("settle", toU64(positionId));
}

// ========== ADMIN FUNCTIONS ==========

export async function setSpotPrice(pair: string, price: number): Promise<boolean> {
  return callMutate("set_spot_price", toSymbol(pair), toI128(Math.round(price * 1e7)));
}

export async function setRate(currency: string, rate: number): Promise<boolean> {
  return callMutate("set_rate", toSymbol(currency), toI128(Math.round(rate * 1e7)));
}

export async function setTime(timestamp: number): Promise<boolean> {
  return callMutate("set_time", toU64(timestamp));
}

export async function addEligible(address: string): Promise<boolean> {
  return callMutate("add_eligible", toAddress(address));
}

export async function initialize(): Promise<boolean> {
  return callMutate("initialize");
}

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
    if (!pubkey) {
      alert("Please connect your Freighter wallet first (top-right button)");
      return false;
    }

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
      alert(`Transaction simulation failed: ${simResult.error}`);
      return false;
    }

    const preparedTx = StellarSdk.rpc.assembleTransaction(
      tx,
      simResult as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse
    ).build();

    const result = await signAndSubmitTx(preparedTx.toXDR());
    if (result?.status === "SUCCESS") {
      alert("Transaction successful!");
      return true;
    }
    if (result?.status === "FAILED") {
      alert(`Transaction failed on-chain. Status: ${result.status}`);
    }
    return false;
  } catch (err) {
    console.error(`Mutate call ${method} failed:`, err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("Freighter rejected")) {
      alert(`Wallet error: ${msg}\n\nMake sure Freighter is set to TESTNET.`);
    } else {
      alert(`Error: ${msg}`);
    }
    return false;
  }
}

// Simulate-only: just check if the contract call would succeed, don't parse result
async function callSimulateCheck(method: string, ...args: StellarSdk.xdr.ScVal[]): Promise<{ ok: boolean; cost?: string; error?: string }> {
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
    if ("error" in simResult) {
      return { ok: false, error: String(simResult.error) };
    }
    if ("result" in simResult && simResult.result) {
      const cost = simResult.cost ? `${simResult.cost.cpuInsns} CPU, ${simResult.cost.memBytes} bytes` : "";
      return { ok: true, cost };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// Helper to create ScVal types
function toAddress(addr: string): StellarSdk.xdr.ScVal {
  return new StellarSdk.Address(addr).toScVal();
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

// Safe parser that handles custom enums without crashing
function safeParseScVal(scVal: StellarSdk.xdr.ScVal): Record<string, unknown> {
  try {
    return StellarSdk.scValToNative(scVal) as Record<string, unknown>;
  } catch {
    // Manual parse for structs with custom enums
    const result: Record<string, unknown> = {};
    if (scVal.switch().name === "scvMap") {
      const entries = scVal.map();
      if (entries) {
        for (const entry of entries) {
          const key = entry.key();
          const val = entry.val();
          let keyStr: string;
          try { keyStr = StellarSdk.scValToNative(key) as string; } catch { keyStr = "unknown"; }
          try { result[keyStr] = StellarSdk.scValToNative(val); } catch {
            // Enum value — try to read the variant name
            if (val.switch().name === "scvVec") {
              const vec = val.vec();
              if (vec && vec.length > 0) {
                try { result[keyStr] = StellarSdk.scValToNative(vec[0]); } catch { result[keyStr] = val.switch().name; }
              }
            } else {
              result[keyStr] = val.switch().name;
            }
          }
        }
      }
    }
    return result;
  }
}

// ========== VIEW FUNCTIONS (real on-chain reads) ==========

export async function getSpot(): Promise<number | null> {
  const result = await callView("get_spot");
  if (!result) return null;
  return Number(StellarSdk.scValToNative(result)) / 1e7;
}

export async function getRate(currency: string): Promise<number | null> {
  const result = await callView("get_rate", toSymbol(currency));
  if (!result) return null;
  return Number(StellarSdk.scValToNative(result)) / 1e7;
}

export async function computeForward(
  spot: number,
  rateBase: number,
  rateQuote: number,
  tenorDays: number
): Promise<number | null> {
  const result = await callView(
    "compute_forward",
    toI128(Math.round(spot * 1e7)),
    toI128(Math.round(rateBase * 1e7)),
    toI128(Math.round(rateQuote * 1e7)),
    toU32(tenorDays),
  );
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
  hedger: string,
  pairBase: string,
  pairQuote: string,
  direction: string,
  notional: number,
  tenorDays: number,
  marginToken: string,
): Promise<boolean> {
  return callMutate(
    "post_request",
    toAddress(hedger),
    toSymbol(pairBase),
    toSymbol(pairQuote),
    StellarSdk.nativeToScVal(direction, { type: "symbol" }),
    toI128(Math.round(notional * 1e7)),
    toU32(tenorDays),
    toAddress(marginToken),
  );
}

export async function submitQuote(
  maker: string,
  requestId: number,
  spreadBps: number,
  expiry: number
): Promise<boolean> {
  return callMutate(
    "submit_quote",
    toAddress(maker),
    toU64(requestId),
    toI128(spreadBps),
    toU64(expiry),
  );
}

export async function cancelQuote(maker: string, requestId: number, quoteId: number): Promise<boolean> {
  return callMutate("cancel_quote", toAddress(maker), toU64(requestId), toU64(quoteId));
}

export async function acceptQuote(hedger: string, requestId: number, quoteId: number): Promise<boolean> {
  return callMutate("accept_quote", toAddress(hedger), toU64(requestId), toU64(quoteId));
}

// mark, liquidate, settle don't require specific auth — try wallet first, fall back to simulate
export async function markPosition(positionId: number): Promise<any> {
  const pubkey = await getPublicKey();
  if (pubkey) {
    return callMutate("mark_position", toU64(positionId));
  }
  // No wallet — simulate to check if it would succeed
  const sim = await callSimulateCheck("mark_position", toU64(positionId));
  if (sim.ok) {
    alert(`Mark-to-Market simulation successful!\n\nContract: ${CONTRACT_ID.slice(0,12)}...\nPosition #${positionId} marked on-chain (simulated)\n${sim.cost ? "Cost: " + sim.cost : ""}\n\nConnect Freighter wallet (Testnet) to submit the transaction.`);
    return true;
  }
  alert(`Mark simulation failed: ${sim.error}\n\nPosition may not exist or is already settled.`);
  return false;
}

export async function topUpMargin(caller: string, positionId: number, amount: number): Promise<boolean> {
  return callMutate("top_up_margin", toAddress(caller), toU64(positionId), toI128(Math.round(amount * 1e7)));
}

export async function liquidate(positionId: number): Promise<any> {
  const pubkey = await getPublicKey();
  if (pubkey) {
    return callMutate("liquidate", toU64(positionId));
  }
  const sim = await callSimulateCheck("liquidate", toU64(positionId));
  if (sim.ok) {
    alert(`Liquidation simulation successful!\nPosition #${positionId}\n${sim.cost ? "Cost: " + sim.cost : ""}\n\nConnect wallet to execute.`);
    return true;
  }
  alert("Position not liquidatable or simulation failed.");
  return false;
}

export async function settle(positionId: number): Promise<any> {
  const pubkey = await getPublicKey();
  if (pubkey) {
    return callMutate("settle", toU64(positionId));
  }
  const sim = await callSimulateCheck("settle", toU64(positionId));
  if (sim.ok) {
    alert(`Settlement simulation successful!\nPosition #${positionId}\n${sim.cost ? "Cost: " + sim.cost : ""}\n\nConnect wallet to execute.`);
    return true;
  }
  alert("Position not ready for settlement or simulation failed.");
  return false;
}

// ========== ADMIN FUNCTIONS ==========

export async function setSpotPrice(admin: string, price: number): Promise<boolean> {
  return callMutate("set_spot_price", toAddress(admin), toI128(Math.round(price * 1e7)));
}

export async function setRate(admin: string, currency: string, rate: number): Promise<boolean> {
  return callMutate("set_rate", toAddress(admin), toSymbol(currency), toI128(Math.round(rate * 1e7)));
}

export async function setTime(admin: string, timestamp: number): Promise<boolean> {
  return callMutate("set_time", toAddress(admin), toU64(timestamp));
}

export async function addEligible(admin: string, account: string): Promise<boolean> {
  return callMutate("add_eligible", toAddress(admin), toAddress(account));
}

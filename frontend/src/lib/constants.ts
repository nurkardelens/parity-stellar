export const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
export const NETWORK = (process.env.NEXT_PUBLIC_NETWORK || "testnet") as "testnet" | "mainnet";
export const NETWORK_PASSPHRASE =
  NETWORK === "testnet"
    ? "Test SDF Network ; September 2015"
    : "Public Global Stellar Network ; September 2015";
export const HORIZON_URL =
  NETWORK === "testnet"
    ? "https://horizon-testnet.stellar.org"
    : "https://horizon.stellar.org";
export const SOROBAN_RPC_URL =
  NETWORK === "testnet"
    ? "https://soroban-testnet.stellar.org"
    : "https://soroban.stellar.org";

export const PAIRS = ["MXN/USD", "TRY/USD"] as const;
export type Pair = (typeof PAIRS)[number];

export const CURRENCIES = ["MXN", "TRY", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const TENORS = [30, 60, 90, 180, 360] as const;

export const MARGIN_RATIO = 0.05;
export const MARGIN_CALL_THRESHOLD = 0.5;
export const LIQUIDATION_THRESHOLD = 1.0;

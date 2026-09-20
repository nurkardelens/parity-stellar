// Mock data for demo/disconnected state

export const MOCK_SPOT: Record<string, number> = {
  "MXN/USD": 20.00,
  "TRY/USD": 34.00,
};

export const MOCK_RATES: Record<string, number> = {
  MXN: 0.10,
  TRY: 0.45,
  USD: 0.04,
};

export function computeMockForward(pair: string, tenor: number): number {
  const spot = MOCK_SPOT[pair] || 20.0;
  const base = pair.split("/")[1]; // USD is base (denominator)
  const quote = pair.split("/")[0]; // MXN/TRY is quote (numerator)
  const rBase = MOCK_RATES[base] || 0.04;
  const rQuote = MOCK_RATES[quote] || 0.10;
  const t = tenor / 360;
  return spot * (1 + rQuote * t) / (1 + rBase * t);
}

export interface MockRequest {
  id: number;
  hedger: string;
  pair: string;
  direction: "buy" | "sell";
  notional: number; // in USD
  tenor: number;
  forward: number;
  timestamp: number;
  quotes: MockQuote[];
}

export interface MockQuote {
  maker: string;
  spread_bps: number;
  expiry: number;
  active: boolean;
}

export interface MockPosition {
  id: number;
  hedger: string;
  maker: string;
  pair: string;
  direction: "buy" | "sell";
  notional: number; // in USD
  locked_forward: number;
  maturity: number; // unix timestamp
  hedger_margin: number; // in USDC
  maker_margin: number;
  initial_margin: number; // for ratio calculation
  hedger_state: "Safe" | "Called" | "Liquidated";
  maker_state: "Safe" | "Called" | "Liquidated";
  current_forward: number;
  settled: boolean;
}

const now = Math.floor(Date.now() / 1000);

export const MOCK_REQUESTS: MockRequest[] = [
  {
    id: 1,
    hedger: "GBXYZ...DEMO",
    pair: "MXN/USD",
    direction: "sell",
    notional: 100_000,
    tenor: 90,
    forward: computeMockForward("MXN/USD", 90),
    timestamp: now - 3600,
    quotes: [
      { maker: "GABC1...MK01", spread_bps: 15, expiry: now + 7200, active: true },
      { maker: "GDEF2...MK02", spread_bps: 22, expiry: now + 3600, active: true },
    ],
  },
  {
    id: 2,
    hedger: "GHIJ3...DEMO",
    pair: "TRY/USD",
    direction: "buy",
    notional: 50_000,
    tenor: 180,
    forward: computeMockForward("TRY/USD", 180),
    timestamp: now - 1800,
    quotes: [
      { maker: "GKLM4...MK03", spread_bps: 35, expiry: now + 5400, active: true },
    ],
  },
];

// initial_margin = notional * 0.05 (5%)
export const MOCK_POSITIONS: MockPosition[] = [
  {
    id: 1,
    hedger: "GBXYZ...DEMO",
    maker: "GABC1...MK01",
    pair: "MXN/USD",
    direction: "sell",
    notional: 100_000,
    locked_forward: 20.297,
    maturity: now + 86400 * 88,
    initial_margin: 5000,
    hedger_margin: 5000,
    maker_margin: 5000,
    hedger_state: "Safe",
    maker_state: "Safe",
    current_forward: 20.15,
    settled: false,
  },
  {
    id: 2,
    hedger: "GHIJ3...DEMO",
    maker: "GKLM4...MK03",
    pair: "TRY/USD",
    direction: "buy",
    notional: 50_000,
    locked_forward: 37.28,
    maturity: now + 86400 * 45,
    initial_margin: 2500,
    hedger_margin: 1200, // lost ~52% of margin → Called
    maker_margin: 2500,
    hedger_state: "Called",
    maker_state: "Safe",
    current_forward: 35.90,
    settled: false,
  },
  {
    id: 3,
    hedger: "GNOP5...DEMO",
    maker: "GDEF2...MK02",
    pair: "MXN/USD",
    direction: "buy",
    notional: 75_000,
    locked_forward: 20.45,
    maturity: now - 86400, // matured yesterday
    initial_margin: 3750,
    hedger_margin: 3750,
    maker_margin: 3750,
    hedger_state: "Safe",
    maker_state: "Safe",
    current_forward: 20.10,
    settled: false,
  },
  {
    id: 4,
    hedger: "GBXYZ...DEMO",
    maker: "GABC1...MK01",
    pair: "TRY/USD",
    direction: "sell",
    notional: 30_000,
    locked_forward: 34.50,
    maturity: now + 86400 * 120,
    initial_margin: 1500,
    hedger_margin: 150, // lost ~90% → Liquidated
    maker_margin: 1500,
    hedger_state: "Liquidated",
    maker_state: "Safe",
    current_forward: 36.80,
    settled: false,
  },
];

// Mock data for demo/disconnected state

export const MOCK_SPOT: Record<string, number> = {
  "MXN/USD": 0.058824,
  "TRY/USD": 0.029412,
};

export const MOCK_RATES: Record<string, number> = {
  MXN: 0.1125,
  TRY: 0.45,
  USD: 0.0525,
};

export function computeMockForward(pair: string, tenor: number): number {
  const spot = MOCK_SPOT[pair] || 0.05;
  const base = pair.split("/")[0];
  const quote = pair.split("/")[1];
  const rBase = MOCK_RATES[base] || 0.1;
  const rQuote = MOCK_RATES[quote] || 0.05;
  const t = tenor / 360;
  return spot * (1 + rQuote * t) / (1 + rBase * t);
}

export interface MockRequest {
  id: number;
  hedger: string;
  pair: string;
  direction: "buy" | "sell";
  notional: number;
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
  notional: number;
  locked_forward: number;
  maturity: number;
  hedger_margin: number;
  maker_margin: number;
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
    notional: 1_000_000,
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
    notional: 500_000,
    tenor: 180,
    forward: computeMockForward("TRY/USD", 180),
    timestamp: now - 1800,
    quotes: [
      { maker: "GKLM4...MK03", spread_bps: 35, expiry: now + 5400, active: true },
    ],
  },
  {
    id: 3,
    hedger: "GNOP5...DEMO",
    pair: "MXN/USD",
    direction: "buy",
    notional: 2_000_000,
    tenor: 30,
    forward: computeMockForward("MXN/USD", 30),
    timestamp: now - 600,
    quotes: [],
  },
];

export const MOCK_POSITIONS: MockPosition[] = [
  {
    id: 1,
    hedger: "GBXYZ...DEMO",
    maker: "GABC1...MK01",
    pair: "MXN/USD",
    direction: "sell",
    notional: 1_000_000,
    locked_forward: 0.057650,
    maturity: now + 86400 * 88,
    hedger_margin: 2941.18,
    maker_margin: 2941.18,
    hedger_state: "Safe",
    maker_state: "Safe",
    current_forward: 0.057821,
    settled: false,
  },
  {
    id: 2,
    hedger: "GHIJ3...DEMO",
    maker: "GKLM4...MK03",
    pair: "TRY/USD",
    direction: "buy",
    notional: 500_000,
    locked_forward: 0.027450,
    maturity: now + 86400 * 45,
    hedger_margin: 1470.59,
    maker_margin: 1470.59,
    hedger_state: "Called",
    maker_state: "Safe",
    current_forward: 0.026100,
    settled: false,
  },
  {
    id: 3,
    hedger: "GNOP5...DEMO",
    maker: "GDEF2...MK02",
    pair: "MXN/USD",
    direction: "buy",
    notional: 750_000,
    locked_forward: 0.058200,
    maturity: now - 86400,
    hedger_margin: 2205.88,
    maker_margin: 2205.88,
    hedger_state: "Safe",
    maker_state: "Safe",
    current_forward: 0.058900,
    settled: false,
  },
  {
    id: 4,
    hedger: "GBXYZ...DEMO",
    maker: "GABC1...MK01",
    pair: "TRY/USD",
    direction: "sell",
    notional: 300_000,
    locked_forward: 0.028900,
    maturity: now + 86400 * 120,
    hedger_margin: 320.00,
    maker_margin: 882.35,
    hedger_state: "Liquidated",
    maker_state: "Safe",
    current_forward: 0.031200,
    settled: false,
  },
];

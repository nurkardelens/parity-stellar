# Parity — Pitch Deck Content
> Copy this content into the official Stellar Pro Hackathon presentation template.

---

## Slide 1: Title

**Parity**
Stellar FX Forward Market

Nur Kardelen & Atakan Yavuzarslan
Genesis Track — Stellar Pro Hackathon 2026

---

## Slide 2: The Problem

**$20B+ in emerging market stablecoin volume on Stellar — zero hedging.**

- Stellar carries ~20 fiat stablecoins (MXNe, BRZ, EURC, TRY) and tokenized government debt (Etherfuse CETES)
- A Mexican exporter receiving 100,000 USDC in 90 days has **no on-chain instrument** to hedge that FX risk
- An anchor pre-funding a peso float while reporting in dollars **carries months of unhedged exposure**
- Today's options: pre-fund months ahead (locks working capital) or carry the risk and pad pricing

---

## Slide 3: What Parity Does

**A two-sided, margined FX forward market where the price comes from math, not a dealer.**

Forward price from covered interest parity:
**F = S x (1 + r_quote x t/360) / (1 + r_base x t/360)**

- Hedger posts a request → makers quote a spread → accept opens the position
- Both sides post 5% margin in USDC
- Mark-to-market on every oracle update
- Margin calls, partial liquidation, bad-debt waterfall — all on-chain, all automatic

---

## Slide 4: How It's Different

| | Crebit Rate Locks | Parity |
|---|---|---|
| Structure | One dealer, one side | Two-sided market |
| Price | Dealer's quote | On-chain CIP formula |
| Margin | Deposit forfeited if you walk | Symmetric, mark-to-market |
| Loss allocation | Dealer absorbs | Explicit waterfall |
| Liquidity | Dealer's balance sheet | Makers compete on spread |

**The sentence**: Crebit sells rate locks as a dealer. We build the market underneath.

---

## Slide 5: Running Example

| Parameter | Value |
|---|---|
| Pair | MXN/USD |
| Spot | 20.00 |
| MXN rate / USD rate | 10% / 4% |
| Tenor | 90 days |
| **Computed Forward** | **20.297** |
| Initial margin | 5,000 USDC per side |

The forward is not quoted — it falls out of the interest rate differential.
When the MXN rate moves on-chain, the forward moves visibly.

---

## Slide 6: Demo Flow

1. **Open**: Forward computes to 20.297, maker quotes, hedger accepts, both post 5,000 USDC
2. **Day 30, spot 19.61**: Counterparty margin call fires on screen
3. **Spot 19.15**: 30% partial liquidation executes
4. **Gap to 18.50**: Bad debt — waterfall drains insurance, haircuts winner, accounting balances
5. **Day 90**: Settle — difference paid in USDC

---

## Slide 7: Architecture

```
Frontend (Next.js) → Parity Contract (Soroban)
                         ├── RFQ (request, quote, accept)
                         ├── Arithmetic (CIP formula, 7-decimal fixed-point)
                         ├── Margin Engine (call, liquidation, waterfall)
                         ├── Settlement (cash at maturity)
                         ├── Oracle (Reflector SEP-40 + mock)
                         ├── RateSource (governance-set rates)
                         ├── Insurance Fund (2bps fee + penalties)
                         └── Eligibility (allowlist)
```

- **21 exported contract functions**, 27KB WASM
- **14 tests passing** (arithmetic + integration)
- Deployed on **Stellar Testnet**

---

## Slide 8: Stellar Integration

| Feature | How Parity Uses It |
|---|---|
| Stellar Asset Contracts (SEP-41) | USDC margin deposits & settlement transfers |
| Reflector Oracle (SEP-40) | Spot price feed behind an oracle trait |
| Soroban Auth | Each party authorizes their own margin transfer |
| Soroban Storage | Persistent positions, instance-level parameters |

Stellar Skills used:
- `skills/standards/SKILL.md` (SEP-40, SEP-41)
- `skills/anchors/SKILL.md` (TRY anchor patterns)
- `skills/stellar-integration-finder/SKILL.md`

---

## Slide 9: Target Users

| User | Need | How Parity Helps |
|---|---|---|
| **Exporter** | Lock USD revenue in pesos | Sells USD forward at 20.297 |
| **Anchor** | Hedge peso payout float | Buys USD forward, tags per client |
| **Payment company** | Fix monthly payout cost | 30/60/90-day forward strip |
| **Maker** | Earn spread | Quotes over the parity forward |

Anchors and payment companies sit on **opposite sides** of MXN/USD — under RFQ they quote each other directly.

---

## Slide 10: Tech Stack

| Layer | Choice |
|---|---|
| Chain | Stellar Soroban (testnet) |
| Contracts | Rust, soroban-sdk 28.0.0 (pinned) |
| Numerics | Fixed-point, 7 decimals, multiply-before-divide |
| Frontend | Next.js 14 + TypeScript + Tailwind |
| Oracle | Reflector (SEP-40) + mock |
| Rates | Governance-set (CETES yield, USDC supply rate) |
| Wallet | Freighter |

---

## Slide 11: Key Design Decisions

1. **CIP pricing over dealer quotes** — objective, verifiable, no-arbitrage
2. **RFQ over LP pool** — no pooled capital, removes riskiest module
3. **30% partial liquidation** — avoids closing entire position on one breach
4. **3-print liquidation price** — single bad oracle can't cascade
5. **Explicit bad-debt waterfall** — gap risk is real; allocation is transparent
6. **Arithmetic module first + property tests** — where generated code fails silently

---

## Slide 12: Traction & Roadmap

**Built in this hackathon:**
- Full smart contract with 21 functions, 14 tests, deployed on testnet
- Frontend with 4 screens, live forward computation, dark finance UI
- Two corridors: MXN/USD and TRY/USD

**Post-hackathon (targeting SCF/InstAward):**
- Week 1-2: Live Reflector + Blend v2 integration
- Week 3-4: Physical settlement, keeper bot
- Month 2: Re-auction, BRZ corridor
- Month 3: SCF application, security audit

---

## Slide 13: Contract Details

- **Contract ID**: `CAW7STGSNYT7BYTXQ4QI7OMUCTICUFT4CZQ23CVTTXYNZJXSXOZTOTNI`
- **Network**: Stellar Testnet
- **Explorer**: lab.stellar.org/r/testnet/contract/CAW7STGSNYT7BYTXQ4QI7OMUCTICUFT4CZQ23CVTTXYNZJXSXOZTOTNI
- **GitHub**: *(add your repo URL)*
- **Live Demo**: *(add your Vercel/deployment URL)*

---

## Slide 14: Thank You

**Parity** — the market underneath the rate lock.

Nur Kardelen & Atakan Yavuzarslan

Questions?

# Rapor Nur — Parity (Stellar FX Forward Market)

Generated: 2026-09-19

## Status
**COMPLETE**

## Decisions Made
| # | Topic | Decision | Why |
|---|-------|----------|-----|
| 1 | soroban-sdk version | Pinned to 28.0.0 (latest stable) | Spec says pin one version; 28.0.0 is current |
| 2 | Frontend framework | Next.js 14 + TypeScript + Tailwind | Fast, SSR, Stellar community standard |
| 3 | TRY corridor | Added TRY/USD alongside MXN/USD | Istanbul hackathon, anchor weight highest |
| 4 | C1 contradiction (2500 loss) | Margin call at 50% loss, liquidation starts at 100% | Cleaner UX, matches "called" state in spec |
| 5 | C2 contradiction (5000 loss) | 30% partial on first breach, full close if continues | Matches spec's "Reducing the probability" section |
| 6 | C3 (maker screen) | Built as separate screen | Demo step 1 requires a maker to quote |
| 7 | C4 (value at inception) | Zero at zero spread; non-zero spread = cost of hedge | Property test uses zero spread |
| 8 | R2 (margin reserved) | Maker margin taken at QUOTE SUBMISSION, returned on cancel | Solves auth problem — each party authorizes their own transfer |
| 9 | R4 (demo maker) | Team uses maker screen | Simplest approach |
| 10 | G7 (who calls mark/liquidate) | Frontend buttons in Ship build | Keeper is stretch |
| 11 | Wallet integration | Freighter via window API | Simpler than full Wallets Kit for hackathon |
| 12 | wasm target | wasm32v1-none (not wasm32-unknown-unknown) | soroban-sdk 28 requires it for Rust 1.82+ |
| 13 | Build tool | `stellar contract build` (not raw cargo) | soroban-sdk 28 requires stellar-cli v25.2+ |

## Issues Found
| # | Issue | Severity | Resolution |
|---|-------|----------|------------|
| 1 | `events().publish()` deprecated in sdk 28 | Low | Still works, just warnings. Use `#[contractevent]` for production |
| 2 | Maker auth in accept_quote | High | Refactored: margin taken at quote submit, not accept. Each party authorizes their own transfer |
| 3 | `.nft.json` trace error in Next.js build | None | Cosmetic, doesn't affect runtime |
| 4 | Anchor/SEP-24 integration | Medium | Documented in README but not implemented — needs real anchor partner credentials |
| 5 | Blend v2 live rate | Medium | Using governance-set rates; live Blend integration needs their contract ID |

## Blockers (Need User Input)
| # | What's Needed | Why | Impact if Missing |
|---|--------------|-----|-------------------|
| 1 | Run `./scripts/deploy.sh` | Deploys contract to testnet, generates CONTRACT_ID | Frontend can't connect to real contract |
| 2 | Set `NEXT_PUBLIC_CONTRACT_ID` in `frontend/.env.local` | Frontend needs contract address | Uses mock data only |
| 3 | Team names for README | Submission requires team members | Add before submitting |
| 4 | Presentation deck | Hackathon requires official template | Create from template link in hackathon docs |

## What's Built
### Smart Contract (Soroban/Rust)
- **14 tests passing** (8 arithmetic + 6 integration)
- **21 exported functions** compiled to 27KB WASM
- Full RFQ lifecycle: post request → submit quote → accept → open position
- Mark-to-market with oracle spot + forward recomputation
- Margin engine: call at 50%, partial liquidation (30%) at 100%
- Insurance fund fed by 2bps open fee + liquidation penalties
- Bad-debt waterfall: loser margin → insurance → winner haircut
- Cash settlement at maturity
- Admin demo control (time + price override)
- Eligibility allowlist
- Multi-corridor support (MXN/USD, TRY/USD)

### Frontend (Next.js 14)
- **4 pages**: Dashboard, Positions, Maker, Admin
- **8 components**: WalletConnect, ForwardDisplay, RequestForm, QuoteList, PositionCard, MarginBar, WaterfallView, AdminPanel
- Dark finance theme (gray-950 bg, emerald/red accents)
- Mock data fallback when wallet disconnected
- Freighter wallet integration
- Live forward computation display
- Responsive mobile layout

### Scripts & Docs
- `scripts/deploy.sh` — One-command testnet deployment
- `scripts/demo.sh` — 5-step demo sequence
- `README.md` — Full hackathon-ready documentation with architecture diagram, tech stack, trade-offs, Stellar skills citation, post-hackathon roadmap

## Build Log
- 22:30 Started full build
- 22:30 System check: Rust 1.97, stellar-cli 27.0, Node 18.20
- 22:31 Initialized git repo + project structure
- 22:32 Created all 12 contract modules
- 22:33 First build: target error → switched to wasm32v1-none
- 22:33 Second build: needs stellar contract build → switched
- 22:34 Build success: 21 functions, 27KB
- 22:35 Arithmetic tests: 8/8 passed
- 22:36 Integration tests: auth error on accept_quote
- 22:37 Refactored: margin taken at quote submit → 14/14 tests pass
- 22:38 Frontend agent launched (parallel)
- 22:40 Frontend: all pages + components created
- 22:42 Frontend build: Stellar SDK API fix (SorobanRpc → rpc)
- 22:43 Frontend build: 8/8 pages generated successfully
- 22:45 README, deploy script, demo script written
- 22:46 rapor-nur.md finalized

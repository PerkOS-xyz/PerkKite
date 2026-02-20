# PerkKite - ETHDenver 2026 Hackathon Plan

## Prize Tracks

### 1. Kite AI - Agent-Native Payments & Identity ($10,000)
**Track**: "Agent-Native Payments & Identity on Kite AI (x402-Powered)"

**Requirements**: Build an application demonstrating x402 payment protocol, Kite Agent Passport (MCP), on-chain identity, scoped permissions, and gasless transactions.

**What PerkKite demonstrates**:
- Full x402 payment flow: HTTP 402 -> payment approval via MCP -> X-PAYMENT header -> settlement
- Kite Agent Passport for on-chain identity verification (`get_payer_addr` via MCP)
- Scoped spending rules enforced by vault smart contracts
- Gasless AA wallets via Kite Bundler
- Autonomous agentic loop (AI calls tools without human intervention)

### 2. Uniswap Foundation - Integrate the Uniswap API ($5,000)
**Track**: "Integrate the Uniswap API in your platform"

**Requirements**: Use the Uniswap Trading API in a meaningful integration.

**What PerkKite demonstrates**:
- Real-time swap quotes via Uniswap Trading API (`/quote` endpoint)
- Token symbol resolution (ETH, USDC, UNI, WBTC, DAI) across chains
- Cross-chain DeFi: price discovery on Ethereum/Base/Polygon via Uniswap, payment settlement on Kite via x402
- AI agent autonomously queries Uniswap for best prices then authorizes swap execution

---

## Architecture

```
User (Wallet)
  |
  v
PerkKite Dashboard (Agent Management)
  |
  +--- /launch (Agent Launcher Wizard)
  |       |
  |       +--> Template Selection → Agent Config → SSH Key Gen → Deploy
  |       +--> PerkKite Orchestration Agent (OpenAI + 5 deployment tools)
  |       +--> provision_ec2_instance → run_ssh_command → write_remote_file
  |       +--> Installs OpenClaw + MCP + Uniswap skill on EC2 Ubuntu
  |       +--> Launched agent connects back via MCP
  |
  +--- /teams (Agent Teams + Autonomous Mode)
  |       |
  |       +--> Chat mode: Coordinator routes to agents by specialty
  |       +--> Auto mode: Goal-driven loop, up to 10 rounds
  |       +--> Task board: auto-created, auto-updated by coordinator
  |
  +--- /chat (Single Agent Chat)
  |       |
  |       +--> OpenAI GPT-5-mini (8 tools, max 5 iterations)
  |       |       |
  |       |       +--> get_agent_identity    --> Kite MCP (on-chain identity)
  |       |       +--> list_agent_capabilities --> Kite MCP (tool listing)
  |       |       +--> approve_payment       --> Kite MCP (x402 payment)
  |       |       +--> check_spending_rules  --> Vault API (scoped rules)
  |       |       +--> get_vault_balance     --> Vault API (balance)
  |       |       +--> pay_for_service       --> x402 Server (full 402 flow)
  |       |       +--> get_swap_quote        --> Uniswap API (live pricing)
  |       |       +--> execute_swap          --> Uniswap API + x402 (cross-chain DeFi)
  |       |
  |       v
  |     Action Cards (UI) --> KiteScan (on-chain verification)
  |
  +--- /openclaw (OpenClaw Skill Config)
          +--> MCP endpoint + skill manifest for any OpenClaw client
```

---

## What's Built (Current State)

### Core (Working)
- [x] Monorepo with TurboRepo + pnpm workspaces
- [x] Next.js 15 frontend with App Router
- [x] RainbowKit wallet connection (Kite Mainnet + Testnet)
- [x] Firebase Firestore agent storage (CRUD, revocation, token storage)
- [x] OpenAI agentic loop with function calling (8 tools)
- [x] MCP proxy to Kite (`/api/mcp`) with OAuth support
- [x] x402 payment protocol server (`/api/x402`) with 3 services
- [x] Full x402 flow in `pay_for_service` tool (402 -> approve -> settle -> content)
- [x] Agent identity verification via Kite MCP
- [x] Uniswap Trading API proxy (`/api/uniswap`) with token resolution
- [x] `get_swap_quote` tool with live Uniswap pricing
- [x] `execute_swap` tool with cross-chain narrative (Uniswap quote + x402 payment)
- [x] Action cards in chat UI (green=payments, orange=swaps, purple=identity)
- [x] Dashboard with agent management (add/delete/revoke/test/OAuth)
- [x] 6 agent templates (DeFi Trader, NFT Collector, etc.)
- [x] Netlify deployment

### Agent Teams + Autonomous Mode (Working)
- [x] Team creation and management (`/teams` page)
- [x] Team group chat with coordinator pattern (`/teams/[teamId]`)
- [x] Parallel agent execution via `Promise.all()`
- [x] Task board with pending/in_progress/completed states
- [x] Agent-suggested tasks via `[TASK: ...]` pattern
- [x] Autonomous mode: Chat/Auto toggle, goal-driven execution up to 10 rounds
- [x] Auto-created and auto-updated tasks during autonomous execution
- [x] Stop button to halt autonomous loop

### Agent Launcher (Working)
- [x] 6-step launch wizard (`/launch` page)
- [x] Template selection, agent config, SSH key generation, deploy progress
- [x] RSA-4096 SSH key pair generation (Node.js crypto) with .pem download
- [x] PerkKite orchestration agent (OpenAI + 5 deployment tools)
- [x] Dynamic openclaw.json generation (MCP + Uniswap skill + agent-to-agent comm)
- [x] Real-time deployment progress with polling (8-step vertical timeline)
- [x] Firestore `launched_agents` collection with deployment log

### SDK (Built, Partially Wired)
- [x] `kite-sdk` with KiteClient (x402 settlement, 402 response builder)
- [x] `kite-sdk` with KiteAAClient (AA wallets, vault deploy, spending rules)
- [ ] KiteAAClient not wired to web app (vault deploy is simulated)
- [x] `shared` package with types and constants

### Auth Flow
- [x] OAuth callback route (`/api/oauth/callback`)
- [x] Token exchange with `neo.dev.gokite.ai/oauth/token`
- [x] "Connect MCP" button on agent cards
- [ ] OAuth depends on Kite's endpoint availability

---

## Demo Script

### 1. Connect Wallet
- Open app, connect any EVM wallet via RainbowKit
- App defaults to Kite Testnet (Chain ID: 2368)

### 2. Add Agent
- Dashboard -> "Add Agent" -> Enter Name + Client ID from Kite Portal
- Test connection to verify MCP connectivity

### 3. Identity Verification (Kite Track)
- Chat: "Show me your identity"
- Agent calls `get_agent_identity` via Kite MCP
- Action card shows on-chain address + Explorer link

### 4. x402 Payment Flow (Kite Track)
- Chat: "Get me premium research"
- Agent calls `pay_for_service` which:
  1. Requests service -> gets HTTP 402
  2. Parses payment requirements (5 USDC)
  3. Approves payment via Kite MCP (gasless)
  4. Retries with X-PAYMENT header -> gets content
- Green action card shows all 4 steps + tx hash

### 5. Uniswap Quote (Uniswap Track)
- Chat: "Get a swap quote for 1 ETH to USDC"
- Agent calls `get_swap_quote` -> hits Uniswap Trading API
- Orange action card shows: ETH -> USDC, chain, output amount, source

### 6. Cross-Chain Swap (Both Tracks)
- Chat: "Swap 1 ETH to USDC on Ethereum"
- Agent calls `execute_swap` which:
  1. Fetches live quote from Uniswap on Ethereum
  2. Authorizes 1 USDC swap service fee via x402 on Kite (gasless)
  3. Summary (production would submit to Uniswap /order)
- Orange action card shows 3-step flow + cross-chain narrative

### 7. Agent Teams (Kite Track)
- Teams: Create a team with DeFi Trader + Security Auditor
- Team Chat: "Analyze AAVE v4 for investment" — coordinator routes to both agents
- Task Board: Agents suggest tasks, manually manage pending/in_progress/completed

### 8. Autonomous Mode (Kite Track)
- Team Chat: Switch to "Auto" mode
- Set goal: "Find the best ETH-USDC swap and execute it safely"
- Click "Run Autonomously" — coordinator creates tasks, agents execute tools, loop continues
- Watch coordinator summaries + agent responses appear in real-time
- Task panel updates automatically as tasks are created and completed

### 9. Agent Launcher (Kite Track)
- Launch: Select DeFi Trader template
- Configure: Name, Kite Client ID, Uniswap API key
- Generate SSH key pair, download .pem file
- Click "Deploy Agent" — watch 8-step deployment progress
  1. EC2 instance provisioned
  2. Node.js 20+ installed
  3. OpenClaw installed and onboarded
  4. openclaw.json written with PerkKite MCP
  5. PerkKite skill installed
  6. Environment variables set
  7. Agent daemon started
  8. Health check: connected to PerkKite MCP
- Agent is live: instance IP, SSH command, 8 tools available

### 10. Spending Rules & Revocation (Kite Track)
- Dashboard: Configure spending rules per agent
- Chat: "Check my spending rules"
- Dashboard: "Revoke Session" to stop agent

---

## Environment Setup

```bash
# Required
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
KITE_MCP_URL=https://neo.dev.gokite.ai/v1/mcp
UNISWAP_API_KEY=...

# Optional
KITE_API_KEY=...
NEXT_PUBLIC_SITE_URL=...
```

**Get API keys**:
- OpenAI: https://platform.openai.com
- WalletConnect: https://cloud.walletconnect.com
- Firebase: https://console.firebase.google.com
- Kite Client ID: https://app.gokite.ai (Agents -> MCP Config)
- Uniswap: https://hub.uniswap.org

---

## Key Files

| File | Purpose |
|------|---------|
| `apps/web/src/app/api/chat/route.ts` | Agentic loop: 8 tools, OpenAI, MCP |
| `apps/web/src/app/api/teams/chat/route.ts` | Team coordinator + parallel agent execution |
| `apps/web/src/app/api/teams/auto/route.ts` | Autonomous goal-driven execution (10 rounds) |
| `apps/web/src/app/api/launch/route.ts` | Agent Launcher orchestration (keys, deploy, status) |
| `apps/web/src/app/api/x402/route.ts` | x402 payment protocol server |
| `apps/web/src/app/api/uniswap/route.ts` | Uniswap Trading API proxy |
| `apps/web/src/app/api/mcp/route.ts` | MCP JSON-RPC proxy to Kite |
| `apps/web/src/app/launch/page.tsx` | Agent Launcher 6-step wizard |
| `apps/web/src/app/teams/[teamId]/page.tsx` | Team chat + task panel + autonomous mode |
| `apps/web/src/app/chat/page.tsx` | Chat UI with ActionCards |
| `apps/web/src/app/dashboard/page.tsx` | Agent management dashboard |
| `apps/web/src/lib/mcp-server.ts` | Server-side MCP client |
| `apps/web/src/lib/agents.ts` | Firebase agent CRUD |
| `apps/web/src/lib/teams.ts` | Firebase teams + tasks CRUD |
| `apps/web/src/lib/launched-agents.ts` | Firebase launched_agents CRUD |
| `packages/kite-sdk/src/client.ts` | KiteClient (x402 settlement) |
| `packages/kite-sdk/src/aa-client.ts` | KiteAAClient (AA wallets) |

---

## OpenClaw Integration

PerkKite is packaged as an OpenClaw skill AND can launch OpenClaw agents to EC2.

**Skill (for external OpenClaw clients)**:
- `skills/perkkite/SKILL.md` — Skill manifest (tools, examples, architecture)
- `skills/perkkite/openclaw.json` — OpenClaw config (MCP server + skill entries)
- `apps/web/src/app/openclaw/page.tsx` — Management page (view config, copy setup steps)
- OpenClaw clients connect to PerkKite's MCP endpoint (`/api/mcp`) with `X-Agent-Id` header

**Agent Launcher (deploy OpenClaw agents from PerkKite)**:
- `apps/web/src/app/launch/page.tsx` — 6-step wizard (template → config → SSH → deploy → progress → complete)
- `apps/web/src/app/api/launch/route.ts` — Orchestration API (generate_keys, deploy, status)
- PerkKite orchestration agent uses OpenAI function calling to provision EC2, install OpenClaw + Node.js, write openclaw.json with MCP config, install PerkKite skill, start daemon
- Launched agents auto-connect back to PerkKite via MCP (agent-to-agent communication enabled)
- Firestore `launched_agents` tracks deployment state, instance info, deployment logs

---

## Stretch Goals (If Time Permits)

- [ ] Wire KiteAAClient to web app for real vault deployment
- [ ] Real AWS EC2 provisioning via `@aws-sdk/client-ec2` (currently simulated)
- [ ] Add `nft-analysis` x402 service (currently in enum but not defined)
- [ ] Real settlement via Pieverse facilitator (currently falls back to simulated)
- [ ] Submit signed orders to Uniswap `/order` endpoint for real swap execution
- [ ] Add more tokens to the Uniswap proxy symbol map
- [ ] Multi-chain wallet support (connect to Ethereum + Kite simultaneously)
- [ ] Agent-to-agent payments (one agent pays another's x402 service)
- [ ] Dashboard integration: show launched agents with EC2 status badges
- [ ] Team chat integration with launched agents (auto-add to teams)

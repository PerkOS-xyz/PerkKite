---
name: perkkite
version: 1.0.0
description: Autonomous DeFi agent with on-chain identity, x402 payments, and Uniswap trading via Kite Agent Passport
author: PerkOS
tags:
  - defi
  - kite
  - x402
  - uniswap
  - payments
  - agent-passport
requires:
  env:
    - PERKKITE_API_URL
    - PERKKITE_AGENT_ID
  optional_env:
    - PERKKITE_ACCESS_TOKEN
---

# PerkKite - Autonomous DeFi Agent Skill

You are connected to PerkKite, an autonomous AI agent launcher on Kite chain. You can verify your on-chain identity, make gasless x402 payments, and execute token swaps via Uniswap -- all through Kite Agent Passport.

## Available Actions

### 1. Agent Identity
Check your on-chain identity and payer address on Kite Testnet.

```bash
curl -s "${PERKKITE_API_URL}/api/agent-info?agentId=${PERKKITE_AGENT_ID}" | jq
```

### 2. Chat with Agent Tools
Send a message to PerkKite's agentic loop. The agent has 8 tools: identity verification, capability listing, x402 payments, spending rules, vault balance, paid services, swap quotes, and swap execution.

```bash
curl -s -X POST "${PERKKITE_API_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "YOUR_MESSAGE_HERE"}],
    "agentId": "'${PERKKITE_AGENT_ID}'",
    "accessToken": "'${PERKKITE_ACCESS_TOKEN}'"
  }' | jq
```

The response includes:
- `reply`: The agent's natural language response
- `actions`: Array of tool executions with results, tx hashes, and explorer links

### 3. Uniswap Swap Quote
Get a real-time swap quote from the Uniswap Trading API.

```bash
curl -s -X POST "${PERKKITE_API_URL}/api/uniswap" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "quote",
    "tokenIn": "ETH",
    "tokenOut": "USDC",
    "amount": "1000000000000000000",
    "chainId": 1
  }' | jq
```

Supported tokens: ETH, WETH, USDC, USDT, DAI, UNI, WBTC (or any 0x address).
Supported chains: Ethereum (1), Base (8453), Polygon (137), Arbitrum (42161), Optimism (10).

### 4. x402 Payment Service
Access paid services via the x402 payment protocol.

```bash
curl -s -X POST "${PERKKITE_API_URL}/api/x402" \
  -H "Content-Type: application/json" \
  -d '{"service": "premium-research"}' | jq
```

Available services: `premium-research` (5 USDC), `security-audit` (10 USDC), `market-data` (2 USDC).

## MCP Connection

PerkKite exposes tools via Model Context Protocol (MCP). To connect via MCP:

```json
{
  "mcpServers": {
    "perkkite": {
      "url": "${PERKKITE_API_URL}/api/mcp",
      "headers": {
        "X-Agent-Id": "${PERKKITE_AGENT_ID}"
      }
    }
  }
}
```

## Example Prompts

- "Check my Kite agent identity"
- "Get a swap quote for 1 ETH to USDC on Ethereum"
- "Execute a swap of 100 USDC to DAI on Base"
- "Get me premium research using x402"
- "Check my spending rules"
- "What's my vault balance?"

## Architecture

```
OpenClaw Agent --> PerkKite API --> Kite MCP (identity + x402)
                      |                    |
                      v                    v
                 Uniswap API          Kite Testnet
                 (swap quotes)        (gasless payments)
```

All transactions are gasless (Kite Bundler pays gas) and settled on Kite Testnet (Chain ID: 2368).

'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useAccount } from 'wagmi';
import { getAgentsByWallet, type Agent } from '@/lib/agents';

function OpenClawContent() {
  const { address, isConnected } = useAccount();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const result = await getAgentsByWallet(address);
      setAgents(result.filter(a => !a.revoked));
      if (result.length > 0 && !selectedAgent) {
        setSelectedAgent(result[0].clientId);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [address, selectedAgent]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://perkkite.netlify.app';
  const activeAgent = agents.find(a => a.clientId === selectedAgent);

  const skillMd = `---
name: perkkite
version: 1.0.0
description: Autonomous DeFi agent on Kite with x402 payments and Uniswap trading
---

# PerkKite Agent Skill

You are connected to PerkKite. Use the MCP server to access agent tools.

## Available Tools
- get_agent_identity: Verify on-chain identity
- list_agent_capabilities: List MCP tools
- approve_payment: Make x402 payments (gasless)
- check_spending_rules: View vault limits
- get_vault_balance: Check vault balance
- pay_for_service: Access paid services via x402
- get_swap_quote: Uniswap real-time pricing
- execute_swap: Uniswap swap + x402 payment

## Example Prompts
- "Check my Kite agent identity"
- "Get a swap quote for 1 ETH to USDC"
- "Get me premium research using x402"`;

  const openclawConfig = JSON.stringify({
    name: activeAgent?.name || 'PerkKite Agent',
    skills: {
      entries: {
        perkkite: { enabled: true }
      }
    },
    mcpServers: {
      'perkkite-mcp': {
        url: `${siteUrl}/api/mcp`,
        headers: {
          'X-Agent-Id': selectedAgent || 'YOUR_AGENT_CLIENT_ID'
        }
      }
    }
  }, null, 2);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="text-6xl mb-6">🦞</div>
        <h1 className="text-3xl font-bold mb-4">OpenClaw Integration</h1>
        <p className="text-gray-400">Connect your wallet to configure your PerkKite OpenClaw skill.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">🦞</span>
          <div>
            <h1 className="text-2xl font-bold">OpenClaw Integration</h1>
            <p className="text-gray-400 text-sm">Connect your PerkKite agents to OpenClaw</p>
          </div>
        </div>
        <p className="text-gray-500 text-sm mt-3">
          PerkKite is available as an OpenClaw skill. Any OpenClaw agent can use your Kite identity,
          make x402 payments, and execute Uniswap swaps -- all via MCP.
        </p>
      </div>

      {/* Agent Selector */}
      {agents.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">Select Agent</label>
          <div className="flex gap-2 flex-wrap">
            {agents.map(agent => (
              <button
                key={agent.clientId}
                onClick={() => setSelectedAgent(agent.clientId)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedAgent === agent.clientId
                    ? 'bg-kite-primary text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {agent.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin text-4xl">🪁</div>
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <div className="text-4xl mb-4">🤖</div>
          <h3 className="text-lg font-semibold mb-2">No Agents Found</h3>
          <p className="text-gray-400 text-sm mb-4">
            Add an agent in the Dashboard first, then come back to configure OpenClaw.
          </p>
          <a href="/dashboard" className="text-kite-secondary hover:text-kite-primary transition text-sm">
            Go to Dashboard &rarr;
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Connection Status */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full" />
                Skill Ready
              </h2>
              <span className="text-xs text-gray-500 font-mono">{selectedAgent}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Protocol</div>
                <div className="text-sm text-white mt-1">MCP</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Tools</div>
                <div className="text-sm text-white mt-1">8 available</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Chain</div>
                <div className="text-sm text-white mt-1">Kite Testnet</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Payments</div>
                <div className="text-sm text-white mt-1">x402 + Uniswap</div>
              </div>
            </div>
          </div>

          {/* Setup Steps */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Setup</h2>
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-kite-primary/20 text-kite-secondary rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium mb-1">Copy the openclaw.json config</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Add this to your OpenClaw configuration or paste it into ~/.openclaw/openclaw.json
                  </p>
                  <div className="relative">
                    <pre className="bg-gray-950 border border-gray-800 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto">
                      {openclawConfig}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(openclawConfig, 'config')}
                      className="absolute top-2 right-2 px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition"
                    >
                      {copiedField === 'config' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-kite-primary/20 text-kite-secondary rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium mb-1">Add the SKILL.md to your skills folder</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Place this in ~/.openclaw/workspace/skills/perkkite/SKILL.md
                  </p>
                  <div className="relative">
                    <pre className="bg-gray-950 border border-gray-800 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto max-h-48">
                      {skillMd}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(skillMd, 'skill')}
                      className="absolute top-2 right-2 px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition"
                    >
                      {copiedField === 'skill' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-kite-primary/20 text-kite-secondary rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium mb-1">Set environment variables</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Add these to your OpenClaw environment
                  </p>
                  <div className="relative">
                    <pre className="bg-gray-950 border border-gray-800 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto">
{`PERKKITE_API_URL=${siteUrl}
PERKKITE_AGENT_ID=${selectedAgent || 'YOUR_AGENT_CLIENT_ID'}`}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(`PERKKITE_API_URL=${siteUrl}\nPERKKITE_AGENT_ID=${selectedAgent || 'YOUR_AGENT_CLIENT_ID'}`, 'env')}
                      className="absolute top-2 right-2 px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition"
                    >
                      {copiedField === 'env' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-kite-primary/20 text-kite-secondary rounded-full flex items-center justify-center text-sm font-bold">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium mb-1">Start using PerkKite in OpenClaw</h3>
                  <p className="text-xs text-gray-500">
                    Restart your OpenClaw gateway and try: &quot;Check my Kite agent identity&quot;
                    or &quot;Get a swap quote for 1 ETH to USDC&quot;
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* MCP Endpoint Info */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">MCP Endpoint</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">URL</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-300 font-mono">
                    {siteUrl}/api/mcp
                  </code>
                  <button
                    onClick={() => copyToClipboard(`${siteUrl}/api/mcp`, 'url')}
                    className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition"
                  >
                    {copiedField === 'url' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Header</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-300 font-mono">
                    X-Agent-Id: {selectedAgent || 'YOUR_AGENT_CLIENT_ID'}
                  </code>
                  <button
                    onClick={() => copyToClipboard(`X-Agent-Id: ${selectedAgent || 'YOUR_AGENT_CLIENT_ID'}`, 'header')}
                    className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition"
                  >
                    {copiedField === 'header' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Architecture */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">How It Works</h2>
            <pre className="text-xs text-gray-400 leading-relaxed">
{`OpenClaw Agent
    |
    v
PerkKite MCP Server (${siteUrl}/api/mcp)
    |
    +-- get_agent_identity    --> Kite MCP (on-chain identity)
    +-- approve_payment       --> Kite MCP (x402 gasless payment)
    +-- pay_for_service       --> x402 Server (HTTP 402 flow)
    +-- get_swap_quote        --> Uniswap Trading API (live pricing)
    +-- execute_swap          --> Uniswap + x402 (cross-chain DeFi)
    +-- check_spending_rules  --> Vault API (scoped rules)
    +-- get_vault_balance     --> Vault API
    +-- list_agent_capabilities --> Kite MCP (tool listing)`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OpenClawPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="animate-spin text-4xl">🦞</div>
        </div>
      }
    >
      <OpenClawContent />
    </Suspense>
  );
}

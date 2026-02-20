'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getAgentsByWallet, addAgent, deleteAgent, revokeAgent, updateAgentToken, getAgentByClientId, type Agent } from '@/lib/agents';
import { listTools } from '@/lib/mcp';

const KITE_OAUTH_URL = 'https://neo.dev.gokite.ai/oauth/authorize';

function getOAuthRedirectUri(): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  return `${base}/api/oauth/callback`;
}

interface AgentStatus {
  authenticated: boolean;
  payerAddress: string | null;
  toolCount: number;
  loading: boolean;
}

interface VaultInfo {
  deployed: boolean;
  vaultAddress?: string;
  explorerUrl?: string;
  spendingRules?: { dailyBudget: string; currency: string; timeWindowHours: number; status: string }[];
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="animate-spin text-4xl">🪁</div></div>}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const { address, isConnected } = useAccount();
  const searchParams = useSearchParams();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newAgent, setNewAgent] = useState({
    name: '',
    clientId: '',
    mcpUrl: 'https://neo.dev.gokite.ai/v1/mcp',
    mcpAccessToken: '',
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState('');
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
  const [vaultInfos, setVaultInfos] = useState<Record<string, VaultInfo>>({});
  const [showRulesModal, setShowRulesModal] = useState<string | null>(null);
  const [ruleForm, setRuleForm] = useState({ dailyBudget: '100', timeWindowHours: '24' });
  const [revokedAgents, setRevokedAgents] = useState<Set<string>>(new Set());
  const [oauthMessage, setOauthMessage] = useState<string | null>(null);

  // Handle OAuth callback — store access token with agent
  useEffect(() => {
    const oauthSuccess = searchParams.get('oauth_success');
    const oauthError = searchParams.get('oauth_error');
    const agentClientId = searchParams.get('agent_id');
    const accessToken = searchParams.get('access_token');

    if (oauthError) {
      setOauthMessage(`MCP connection failed: ${oauthError}`);
      // Clean URL
      window.history.replaceState({}, '', '/dashboard');
    } else if (oauthSuccess && agentClientId && accessToken && address) {
      // Store the token with the agent in Firebase
      (async () => {
        try {
          const agent = await getAgentByClientId(address, agentClientId);
          if (agent?.id) {
            await updateAgentToken(agent.id, accessToken);
            setOauthMessage('MCP connected successfully! Agent is now authenticated.');
            loadAgents();
          } else {
            setOauthMessage('Token received but agent not found. Try adding the agent first.');
          }
        } catch (err) {
          setOauthMessage(`Failed to save token: ${String(err)}`);
        }
      })();
      // Clean URL
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [searchParams, address]);

  // Start OAuth flow for an agent
  const startOAuthFlow = (clientId: string) => {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: getOAuthRedirectUri(),
      scope: 'mcp.read mcp.write',
      state: clientId, // pass agent ID through OAuth state
    });
    window.location.href = `${KITE_OAUTH_URL}?${params.toString()}`;
  };

  useEffect(() => {
    if (address) {
      loadAgents();
    } else {
      setAgents([]);
      setLoading(false);
    }
  }, [address]);

  const loadAgents = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const data = await getAgentsByWallet(address);
      setAgents(data);
      // Initialize revokedAgents set from Firestore data
      const revoked = new Set<string>(
        data.filter(agent => agent.revoked).map(agent => agent.clientId)
      );
      setRevokedAgents(revoked);
      // Fetch auth status for each non-revoked agent
      data.forEach(agent => {
        if (!agent.revoked) {
          fetchAgentStatus(agent.clientId, agent.mcpAccessToken);
        }
      });
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgentStatus = useCallback(async (clientId: string, accessToken?: string) => {
    setAgentStatuses(prev => ({ ...prev, [clientId]: { authenticated: false, payerAddress: null, toolCount: 0, loading: true } }));
    try {
      const params = new URLSearchParams({ agentId: clientId });
      if (accessToken) params.set('accessToken', accessToken);
      const res = await fetch(`/api/agent-info?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAgentStatuses(prev => ({
          ...prev,
          [clientId]: {
            authenticated: data.authenticated,
            payerAddress: data.payerAddress,
            toolCount: data.toolCount,
            loading: false,
          },
        }));
      } else {
        setAgentStatuses(prev => ({ ...prev, [clientId]: { authenticated: false, payerAddress: null, toolCount: 0, loading: false } }));
      }
    } catch {
      setAgentStatuses(prev => ({ ...prev, [clientId]: { authenticated: false, payerAddress: null, toolCount: 0, loading: false } }));
    }

    // Also fetch vault info
    try {
      const res = await fetch(`/api/vault?agentId=${encodeURIComponent(clientId)}`);
      if (res.ok) {
        const data = await res.json();
        setVaultInfos(prev => ({ ...prev, [clientId]: data }));
      }
    } catch {
      // non-critical
    }
  }, []);

  const handleTestConnection = async () => {
    if (!newAgent.clientId) return;
    setTestStatus('testing');
    setTestError('');
    try {
      // Call agent-info endpoint which tests both identity and tools
      const params = new URLSearchParams({ agentId: newAgent.clientId });
      if (newAgent.mcpAccessToken) params.set('accessToken', newAgent.mcpAccessToken);
      const res = await fetch(`/api/agent-info?${params.toString()}`);
      const data = await res.json();
      console.log('Agent info test response:', data);

      if (!res.ok) {
        setTestStatus('error');
        setTestError(data.error || data.details || 'Connection failed');
        return;
      }

      if (data.authenticated) {
        setTestStatus('success');
        setTestError('');
      } else if (data.toolCount > 0) {
        // Tools available but no payer address — partial connection
        setTestStatus('success');
        setTestError('');
      } else {
        setTestStatus('error');
        setTestError('Connected to MCP but no tools or identity found. Check that your Client ID matches an active session in Kite Portal.');
      }
    } catch (error) {
      setTestStatus('error');
      setTestError(`Connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleAddAgent = async () => {
    if (!newAgent.name || !newAgent.clientId || !address) return;
    setSaving(true);
    setTestError('');
    try {
      await addAgent({
        name: newAgent.name,
        clientId: newAgent.clientId,
        mcpUrl: newAgent.mcpUrl,
        mcpAccessToken: newAgent.mcpAccessToken || undefined,
        walletAddress: address,
        knowledge: [],
        createdAt: new Date(),
      });
      setNewAgent({ name: '', clientId: '', mcpUrl: 'https://neo.dev.gokite.ai/v1/mcp', mcpAccessToken: '' });
      setShowAdvanced(false);
      setShowAddModal(false);
      await loadAgents();
    } catch (error) {
      console.error('Error adding agent:', error);
      setTestError(`Failed to save agent: ${String(error).includes('projectId') ? 'Firebase not configured. Add NEXT_PUBLIC_FIREBASE_* variables to .env' : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to remove this agent?')) return;
    try {
      await deleteAgent(agentId);
      await loadAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
    }
  };

  const handleSetRules = async (clientId: string) => {
    try {
      const res = await fetch('/api/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: clientId,
          dailyBudget: ruleForm.dailyBudget,
          timeWindowHours: parseInt(ruleForm.timeWindowHours),
        }),
      });
      if (res.ok) {
        setShowRulesModal(null);
        fetchAgentStatus(clientId);
      }
    } catch (error) {
      console.error('Error setting rules:', error);
    }
  };

  const handleRevoke = async (clientId: string) => {
    if (!confirm('Revoke this agent\'s session? It will no longer be able to make payments.')) return;
    const agent = agents.find(a => a.clientId === clientId);
    if (!agent?.id) return;
    try {
      await revokeAgent(agent.id);
      setRevokedAgents(prev => new Set([...prev, clientId]));
    } catch (error) {
      console.error('Error revoking agent:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="text-6xl mb-6">🔐</div>
        <h1 className="text-3xl font-bold mb-4">Connect Your Wallet</h1>
        <p className="text-gray-400 mb-8">
          Connect your wallet to manage your Kite agents and access the knowledge marketplace.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Agents</h1>
          <p className="text-gray-400">Manage your Kite agents, spending rules, and sessions</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-kite-primary hover:bg-kite-secondary rounded-lg font-medium transition"
        >
          + Add Agent
        </button>
      </div>

      {/* OAuth Message */}
      {oauthMessage && (
        <div className={`p-4 rounded-lg border mb-4 ${
          oauthMessage.includes('success') ? 'bg-green-900/20 border-green-800 text-green-400' : 'bg-red-900/20 border-red-800 text-red-400'
        }`}>
          <div className="flex items-center justify-between">
            <p className="text-sm">{oauthMessage}</p>
            <button onClick={() => setOauthMessage(null)} className="text-xs opacity-60 hover:opacity-100">Dismiss</button>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="p-4 bg-gray-900 rounded-lg border border-gray-800 mb-8">
        <p className="text-sm text-gray-400">
          <span className="text-kite-primary font-medium">How it works:</span> Create your agent in{' '}
          <a href="https://app.gokite.ai/" target="_blank" rel="noopener noreferrer" className="text-kite-primary hover:underline">
            Kite Portal
          </a>
          , get your Client ID, add it here. Then click <span className="text-kite-secondary">Connect MCP</span> to authenticate via OAuth.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin text-4xl mb-4">🪁</div>
          <p className="text-gray-400">Loading your agents...</p>
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-16 bg-gray-900/50 rounded-xl border border-dashed border-gray-700">
          <div className="text-4xl mb-4">🪁</div>
          <h3 className="text-xl font-medium mb-2">No agents yet</h3>
          <p className="text-gray-400 mb-6">Add your first Kite agent to get started</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-kite-primary hover:bg-kite-secondary rounded-lg font-medium transition"
          >
            + Add Agent
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {agents.map(agent => {
            const status = agentStatuses[agent.clientId];
            const vault = vaultInfos[agent.clientId];
            const isRevoked = revokedAgents.has(agent.clientId);

            return (
              <div
                key={agent.id}
                className={`p-6 bg-gray-900 rounded-xl border transition ${
                  isRevoked ? 'border-red-800 opacity-60' : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-kite-primary/20 rounded-xl flex items-center justify-center text-2xl">
                      🤖
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{agent.name}</h3>
                        {isRevoked ? (
                          <span className="px-2 py-0.5 bg-red-900/30 text-red-400 rounded text-xs">Revoked</span>
                        ) : status?.loading ? (
                          <span className="px-2 py-0.5 bg-gray-800 text-gray-500 rounded text-xs animate-pulse">Checking...</span>
                        ) : status?.authenticated ? (
                          <span className="px-2 py-0.5 bg-green-900/30 text-green-400 rounded text-xs">Authenticated</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-yellow-900/30 text-yellow-400 rounded text-xs">Unverified</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 font-mono">
                        {agent.clientId.length > 30 ? `${agent.clientId.slice(0, 30)}...` : agent.clientId}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!isRevoked && (
                      <Link
                        href={`/chat?agent=${agent.clientId}&template=${agent.knowledge?.[0] || 'default'}${agent.mcpAccessToken ? `&token=${encodeURIComponent(agent.mcpAccessToken)}` : ''}`}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition"
                      >
                        Chat
                      </Link>
                    )}
                    <button
                      onClick={() => handleDeleteAgent(agent.id!)}
                      className="px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Agent details grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  {/* Identity */}
                  <div className="p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Payer Address</p>
                    {status?.loading ? (
                      <p className="text-sm text-gray-600 animate-pulse">Checking...</p>
                    ) : status?.payerAddress ? (
                      <a
                        href={`https://testnet.kitescan.ai/address/${status.payerAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-mono text-kite-secondary hover:text-kite-primary transition"
                      >
                        {status.payerAddress.slice(0, 8)}...{status.payerAddress.slice(-6)}
                      </a>
                    ) : (
                      <p className="text-sm text-gray-600">Not registered</p>
                    )}
                  </div>

                  {/* MCP Tools */}
                  <div className="p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">MCP Capabilities</p>
                    <p className="text-sm">
                      {status?.loading ? (
                        <span className="text-gray-600 animate-pulse">Checking...</span>
                      ) : status?.toolCount ? (
                        <span className="text-white">{status.toolCount} tools available</span>
                      ) : status ? (
                        <span className="text-gray-600">No tools found</span>
                      ) : (
                        <span className="text-gray-600">Not checked</span>
                      )}
                    </p>
                  </div>

                  {/* Gas */}
                  <div className="p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Transaction Type</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white">Gasless</span>
                      <span className="px-1.5 py-0.5 bg-kite-primary/20 text-kite-secondary rounded text-[10px]">
                        AA Wallet
                      </span>
                    </div>
                  </div>
                </div>

                {/* Spending Rules */}
                <div className="p-3 bg-gray-800/50 rounded-lg mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-500">Spending Rules (On-Chain Enforcement)</p>
                    <button
                      onClick={() => { setShowRulesModal(agent.clientId); setRuleForm({ dailyBudget: '100', timeWindowHours: '24' }); }}
                      className="text-xs text-kite-secondary hover:text-kite-primary transition"
                      disabled={isRevoked}
                    >
                      Configure
                    </button>
                  </div>
                  {vault?.spendingRules && vault.spendingRules.length > 0 ? (
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-white">{vault.spendingRules[0].dailyBudget} {vault.spendingRules[0].currency}/day</span>
                      <span className="text-gray-500">|</span>
                      <span className="text-gray-400">{vault.spendingRules[0].timeWindowHours}h window</span>
                      <span className="text-gray-500">|</span>
                      <span className={vault.spendingRules[0].status === 'active' ? 'text-green-400' : 'text-red-400'}>
                        {vault.spendingRules[0].status}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">No rules configured yet</p>
                  )}
                </div>

                {/* Actions row */}
                <div className="flex items-center gap-2">
                  {!isRevoked && !status?.authenticated && !status?.loading && (
                    <button
                      onClick={() => startOAuthFlow(agent.clientId)}
                      className="px-3 py-1.5 bg-kite-primary/20 text-kite-secondary hover:bg-kite-primary/30 rounded text-xs font-medium transition"
                    >
                      Connect MCP
                    </button>
                  )}
                  {vault?.explorerUrl && (
                    <a
                      href={vault.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-500 hover:text-kite-secondary transition"
                    >
                      View on Explorer
                    </a>
                  )}
                  <div className="flex-1" />
                  {!isRevoked && (
                    <button
                      onClick={() => handleRevoke(agent.clientId)}
                      className="px-3 py-1.5 border border-red-800 text-red-400 hover:bg-red-900/20 rounded text-xs transition"
                    >
                      Revoke Session
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Agent Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Add Kite Agent</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Agent Name</label>
                <input
                  type="text"
                  value={newAgent.name}
                  onChange={e => setNewAgent({ ...newAgent, name: e.target.value })}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-kite-primary outline-none"
                  placeholder="My Trading Agent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Client ID</label>
                <input
                  type="text"
                  value={newAgent.clientId}
                  onChange={e => setNewAgent({ ...newAgent, clientId: e.target.value })}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-kite-primary outline-none font-mono text-sm"
                  placeholder="client_agent_Madb9b96WDi04Z9RTxxQxQYy"
                />
                <p className="text-xs text-gray-500 mt-1">
                  In{' '}
                  <a href="https://app.gokite.ai/" target="_blank" rel="noopener noreferrer" className="text-kite-secondary hover:underline">
                    Kite Portal
                  </a>
                  {' '}→ Sessions → Click your session → Agent ID
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs text-gray-500 hover:text-gray-300 transition"
              >
                {showAdvanced ? 'Hide' : 'Show'} advanced options
              </button>

              {showAdvanced && (
                <div className="space-y-4 pt-2 border-t border-gray-800">
                  <div>
                    <label className="block text-sm font-medium mb-2">MCP Access Token <span className="text-gray-500 font-normal">(optional)</span></label>
                    <input
                      type="password"
                      value={newAgent.mcpAccessToken}
                      onChange={e => setNewAgent({ ...newAgent, mcpAccessToken: e.target.value })}
                      className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-kite-primary outline-none font-mono text-sm"
                      placeholder="Only needed for production MCP"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">MCP URL <span className="text-gray-500 font-normal">(optional)</span></label>
                    <input
                      type="text"
                      value={newAgent.mcpUrl}
                      onChange={e => setNewAgent({ ...newAgent, mcpUrl: e.target.value })}
                      className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-kite-primary outline-none font-mono text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {testError && testStatus !== 'error' && (
              <p className="text-sm text-red-400 mt-2">{testError}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowAddModal(false); setTestStatus('idle'); setTestError(''); setShowAdvanced(false); }}
                className="flex-1 px-4 py-3 border border-gray-700 hover:border-gray-500 rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAgent}
                disabled={!newAgent.name || !newAgent.clientId || saving}
                className="flex-1 px-4 py-3 bg-kite-primary hover:bg-kite-secondary rounded-lg font-medium transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Add Agent'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spending Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-2">Configure Spending Rules</h2>
            <p className="text-sm text-gray-400 mb-4">
              Rules are enforced on-chain by the vault smart contract. The agent cannot exceed these limits.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Daily Budget (USDC)</label>
                <input
                  type="number"
                  value={ruleForm.dailyBudget}
                  onChange={e => setRuleForm({ ...ruleForm, dailyBudget: e.target.value })}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-kite-primary outline-none"
                  min="0"
                  step="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Time Window (hours)</label>
                <input
                  type="number"
                  value={ruleForm.timeWindowHours}
                  onChange={e => setRuleForm({ ...ruleForm, timeWindowHours: e.target.value })}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-kite-primary outline-none"
                  min="1"
                  max="168"
                />
              </div>

              <div className="p-3 bg-gray-800/50 rounded-lg text-xs text-gray-400">
                <p className="font-medium text-gray-300 mb-1">How it works:</p>
                <ul className="space-y-1">
                  <li>- Rules are stored on Kite chain (gasless deployment)</li>
                  <li>- Agent can only spend within the budget per time window</li>
                  <li>- You can revoke the agent&apos;s session at any time</li>
                  <li>- Vault uses Account Abstraction for gasless execution</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowRulesModal(null)}
                className="flex-1 px-4 py-3 border border-gray-700 hover:border-gray-500 rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSetRules(showRulesModal)}
                className="flex-1 px-4 py-3 bg-kite-primary hover:bg-kite-secondary rounded-lg font-medium transition"
              >
                Set Rules
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

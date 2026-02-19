'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { getAgentsByWallet, addAgent, deleteAgent, type Agent } from '@/lib/agents';

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newAgent, setNewAgent] = useState({ 
    name: '', 
    clientId: '', 
    mcpUrl: 'https://neo.dev.gokite.ai/v1/mcp' 
  });

  // Load agents when wallet connects
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
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAgent = async () => {
    if (!newAgent.name || !newAgent.clientId || !address) return;
    
    setSaving(true);
    try {
      await addAgent({
        name: newAgent.name,
        clientId: newAgent.clientId,
        mcpUrl: newAgent.mcpUrl,
        walletAddress: address,
        knowledge: [],
        createdAt: new Date(),
      });
      
      setNewAgent({ name: '', clientId: '', mcpUrl: 'https://neo.dev.gokite.ai/v1/mcp' });
      setShowAddModal(false);
      await loadAgents();
    } catch (error) {
      console.error('Error adding agent:', error);
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
          <p className="text-gray-400">Manage your Kite agents and knowledge</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-kite-primary hover:bg-kite-secondary rounded-lg font-medium transition"
        >
          + Add Agent
        </button>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-gray-900 rounded-lg border border-gray-800 mb-8">
        <p className="text-sm text-gray-400">
          <span className="text-kite-primary font-medium">💡 Tip:</span> First create your agent in the{' '}
          <a href="https://x402-portal-eight.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-kite-primary hover:underline">
            Kite Portal
          </a>
          , then add it here with your Client ID to customize knowledge and chat.
        </p>
      </div>

      {/* Loading State */}
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
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="p-6 bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-kite-primary/20 rounded-xl flex items-center justify-center text-2xl">
                    🤖
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{agent.name}</h3>
                    <p className="text-sm text-gray-500 font-mono">
                      {agent.clientId.length > 25 ? `${agent.clientId.slice(0, 25)}...` : agent.clientId}
                    </p>
                    {agent.knowledge?.length > 0 && (
                      <p className="text-xs text-kite-primary mt-1">
                        📚 {agent.knowledge.length} knowledge pack{agent.knowledge.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/chat/${agent.id}`}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition"
                  >
                    💬 Chat
                  </Link>
                  <Link
                    href={`/marketplace?agent=${agent.id}`}
                    className="px-4 py-2 border border-gray-700 hover:border-gray-500 rounded-lg text-sm font-medium transition"
                  >
                    📚 Knowledge
                  </Link>
                  <button
                    onClick={() => handleDeleteAgent(agent.id!)}
                    className="px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
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
                  onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-kite-primary outline-none"
                  placeholder="My Trading Agent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Client ID</label>
                <input
                  type="text"
                  value={newAgent.clientId}
                  onChange={(e) => setNewAgent({ ...newAgent, clientId: e.target.value })}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-kite-primary outline-none font-mono text-sm"
                  placeholder="client_agent_yCQRgvatvJD4sQWiVn7vmtjN"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Find this in Kite Portal → Agents → MCP Config
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">MCP URL</label>
                <input
                  type="text"
                  value={newAgent.mcpUrl}
                  onChange={(e) => setNewAgent({ ...newAgent, mcpUrl: e.target.value })}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-kite-primary outline-none font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
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
    </div>
  );
}

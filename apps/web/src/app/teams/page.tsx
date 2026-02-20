'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAgentsByWallet, Agent } from '@/lib/agents';
import { getTeamsByWallet, addTeam, deleteTeam, Team } from '@/lib/teams';

const KNOWLEDGE_TO_TEMPLATE: Record<string, { id: string; icon: string; name: string }> = {
  'defi':       { id: 'defi-trader',      icon: '📈', name: 'DeFi Trader' },
  'nft':        { id: 'nft-collector',    icon: '🖼️', name: 'NFT Collector' },
  'research':   { id: 'research-analyst', icon: '🔬', name: 'Research Analyst' },
  'security':   { id: 'security-auditor', icon: '🛡️', name: 'Security Auditor' },
  'social':     { id: 'social-manager',   icon: '📱', name: 'Social Manager' },
  'governance': { id: 'dao-delegate',     icon: '🏛️', name: 'DAO Delegate' },
};

function getAgentTemplate(agent: Agent) {
  const k = agent.knowledge?.[0];
  return KNOWLEDGE_TO_TEMPLATE[k] || { id: 'default', icon: '🤖', name: agent.name };
}

export default function TeamsPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const [t, a] = await Promise.all([
        getTeamsByWallet(address),
        getAgentsByWallet(address),
      ]);
      setTeams(t);
      setAgents(a);
    } catch (e) {
      console.error('Failed to load teams:', e);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!address || !newName.trim() || selectedAgents.length < 2) return;
    setCreating(true);
    try {
      await addTeam({
        name: newName.trim(),
        description: newDesc.trim(),
        walletAddress: address,
        agentIds: selectedAgents,
        createdAt: new Date(),
      });
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      setSelectedAgents([]);
      await loadData();
    } catch (e) {
      console.error('Failed to create team:', e);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (teamId: string) => {
    if (!confirm('Delete this team?')) return;
    setDeleting(teamId);
    try {
      await deleteTeam(teamId);
      await loadData();
    } finally {
      setDeleting(null);
    }
  };

  const toggleAgent = (clientId: string) => {
    setSelectedAgents(prev =>
      prev.includes(clientId) ? prev.filter(id => id !== clientId) : [...prev, clientId]
    );
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl mb-4">👥</p>
          <h2 className="text-2xl font-bold mb-2">Agent Teams</h2>
          <p className="text-gray-400">Connect your wallet to manage agent teams</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Agent Teams</h1>
            <p className="text-gray-400 mt-1">Create teams of agents that collaborate and manage tasks together</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-kite-primary hover:bg-kite-primary/80 rounded-lg font-medium transition"
          >
            + Create Team
          </button>
        </div>

        {/* Create Team Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Create Team</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Team Name</label>
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. DeFi Alpha Squad"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-kite-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <input
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    placeholder="What does this team do?"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-kite-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Select Agents ({selectedAgents.length} selected, min 2)
                  </label>
                  {agents.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No agents found.{' '}
                      <Link href="/dashboard" className="text-kite-primary hover:underline">Add agents first</Link>
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {agents.filter(a => !a.revoked).map(agent => {
                        const tmpl = getAgentTemplate(agent);
                        const selected = selectedAgents.includes(agent.clientId);
                        return (
                          <button
                            key={agent.clientId}
                            onClick={() => toggleAgent(agent.clientId)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition text-left ${
                              selected
                                ? 'border-kite-primary bg-kite-primary/10'
                                : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                            }`}
                          >
                            <span className="text-xl">{tmpl.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{agent.name}</p>
                              <p className="text-xs text-gray-500">{tmpl.name}</p>
                            </div>
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              selected ? 'border-kite-primary bg-kite-primary' : 'border-gray-600'
                            }`}>
                              {selected && <span className="text-xs">✓</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setShowCreate(false); setSelectedAgents([]); }}
                  className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !newName.trim() || selectedAgents.length < 2}
                  className="flex-1 px-4 py-2 bg-kite-primary hover:bg-kite-primary/80 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Teams Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-kite-primary border-t-transparent rounded-full" />
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">👥</p>
            <h2 className="text-xl font-bold mb-2">No Teams Yet</h2>
            <p className="text-gray-400 mb-6">Create a team to have your agents collaborate on tasks together</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-3 bg-kite-primary hover:bg-kite-primary/80 rounded-lg font-medium transition"
            >
              Create Your First Team
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map(team => {
              const teamAgents = agents.filter(a => team.agentIds.includes(a.clientId));
              return (
                <div
                  key={team.id}
                  className="p-6 bg-gray-900 rounded-xl border border-gray-800 hover:border-kite-primary/50 transition group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-kite-primary/20 rounded-full flex items-center justify-center text-xl">
                        👥
                      </div>
                      <div>
                        <h3 className="font-semibold">{team.name}</h3>
                        <p className="text-xs text-gray-500">{team.agentIds.length} agents</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(team.id!); }}
                      disabled={deleting === team.id}
                      className="text-gray-600 hover:text-red-400 transition text-sm opacity-0 group-hover:opacity-100"
                    >
                      {deleting === team.id ? '...' : '✕'}
                    </button>
                  </div>

                  {team.description && (
                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">{team.description}</p>
                  )}

                  {/* Agent icons row */}
                  <div className="flex items-center gap-1 mb-4">
                    {teamAgents.map(a => {
                      const tmpl = getAgentTemplate(a);
                      return (
                        <span
                          key={a.clientId}
                          title={a.name}
                          className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-sm"
                        >
                          {tmpl.icon}
                        </span>
                      );
                    })}
                    {team.agentIds.length > teamAgents.length && (
                      <span className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs text-gray-500">
                        +{team.agentIds.length - teamAgents.length}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => router.push(`/teams/${team.id}`)}
                    className="w-full px-4 py-2 bg-gray-800 hover:bg-kite-primary/20 border border-gray-700 hover:border-kite-primary rounded-lg text-sm transition"
                  >
                    Open Team Chat
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

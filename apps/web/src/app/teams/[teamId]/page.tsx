'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useAccount } from 'wagmi';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getAgentsByWallet, Agent } from '@/lib/agents';
import { getTeamById, getTasksByTeam, addTask, updateTask, deleteTask, Team, Task } from '@/lib/teams';

// --- Constants ---

const KNOWLEDGE_TO_TEMPLATE: Record<string, string> = {
  'defi': 'defi-trader', 'nft': 'nft-collector', 'research': 'research-analyst',
  'security': 'security-auditor', 'social': 'social-manager', 'governance': 'dao-delegate',
};

const AGENT_COLORS: Record<string, { border: string; text: string; dot: string; bg: string }> = {
  'defi-trader':      { border: 'border-emerald-700', text: 'text-emerald-400', dot: 'bg-emerald-400', bg: 'bg-emerald-900/20' },
  'nft-collector':    { border: 'border-pink-700',    text: 'text-pink-400',    dot: 'bg-pink-400',    bg: 'bg-pink-900/20' },
  'research-analyst': { border: 'border-blue-700',    text: 'text-blue-400',    dot: 'bg-blue-400',    bg: 'bg-blue-900/20' },
  'security-auditor': { border: 'border-amber-700',   text: 'text-amber-400',   dot: 'bg-amber-400',   bg: 'bg-amber-900/20' },
  'social-manager':   { border: 'border-cyan-700',    text: 'text-cyan-400',    dot: 'bg-cyan-400',    bg: 'bg-cyan-900/20' },
  'dao-delegate':     { border: 'border-purple-700',  text: 'text-purple-400',  dot: 'bg-purple-400',  bg: 'bg-purple-900/20' },
  'default':          { border: 'border-gray-700',    text: 'text-gray-400',    dot: 'bg-gray-400',    bg: 'bg-gray-800/50' },
  'coordinator':      { border: 'border-kite-primary', text: 'text-kite-primary', dot: 'bg-kite-primary', bg: 'bg-kite-primary/10' },
};

const TEMPLATE_CONFIG: Record<string, { icon: string; name: string }> = {
  'defi-trader':      { icon: '📈', name: 'DeFi Trader' },
  'nft-collector':    { icon: '🖼️', name: 'NFT Collector' },
  'research-analyst': { icon: '🔬', name: 'Research Analyst' },
  'security-auditor': { icon: '🛡️', name: 'Security Auditor' },
  'social-manager':   { icon: '📱', name: 'Social Manager' },
  'dao-delegate':     { icon: '🏛️', name: 'DAO Delegate' },
  'default':          { icon: '🤖', name: 'Kite Agent' },
};

function getTemplate(agent: Agent): string {
  return KNOWLEDGE_TO_TEMPLATE[agent.knowledge?.[0]] || 'default';
}

// --- Interfaces ---

interface ActionLog {
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
  timestamp: string;
  txHash?: string;
  explorerUrl?: string;
}

interface TeamMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  agentName?: string;
  agentTemplate?: string;
  agentIcon?: string;
  agentId?: string;
  actions?: ActionLog[];
}

interface SuggestedTask {
  title: string;
  assignTo: string;
  priority: string;
}

// --- ActionCard (simplified from chat/page.tsx) ---

function ActionCard({ action }: { action: ActionLog }) {
  const isPayment = action.tool === 'approve_payment' || action.tool === 'pay_for_service';
  const isSwap = action.tool === 'get_swap_quote' || action.tool === 'execute_swap';
  const result = action.result as Record<string, unknown>;

  return (
    <div className={`border rounded-lg p-3 text-xs mt-2 ${
      isPayment ? 'border-green-700 bg-green-900/20' :
      isSwap ? 'border-orange-700 bg-orange-900/20' :
      'border-purple-700 bg-purple-900/20'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-2 h-2 rounded-full ${isPayment ? 'bg-green-400' : isSwap ? 'bg-orange-400' : 'bg-purple-400'}`} />
        <span className="font-medium">{action.tool}</span>
        <span className="text-gray-500 ml-auto">{new Date(action.timestamp).toLocaleTimeString()}</span>
      </div>
      {result && typeof result === 'object' && (() => {
        const r = result as Record<string, unknown>;
        return (
          <div className="mt-1 text-gray-400 space-y-0.5">
            {r.success !== undefined ? (
              <p>Status: {r.success ? '✅ Success' : '❌ Failed'}</p>
            ) : null}
            {r.txHash && r.txHash !== 'pending' ? (
              <p>TX: <a href={r.explorerUrl as string} target="_blank" rel="noopener noreferrer" className="text-kite-primary hover:underline">{String(r.txHash).slice(0, 10)}...</a></p>
            ) : null}
            {r.x402Flow ? (
              <div className="mt-1">
                {Object.entries(r.x402Flow as Record<string, string>).map(([step, desc]) => (
                  <p key={step} className="text-gray-500">{step}: {desc}</p>
                ))}
              </div>
            ) : null}
            {r.swapFlow ? (
              <div className="mt-1">
                {Object.entries(r.swapFlow as Record<string, string>).map(([step, desc]) => (
                  <p key={step} className="text-gray-500">{step}: {desc}</p>
                ))}
              </div>
            ) : null}
          </div>
        );
      })()}
    </div>
  );
}

// --- Task Card ---

function TaskCard({ task, agents, onUpdate, onDelete }: {
  task: Task;
  agents: Agent[];
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
}) {
  const assigned = agents.find(a => a.clientId === task.assignedTo);
  const tmpl = assigned ? TEMPLATE_CONFIG[getTemplate(assigned)] || TEMPLATE_CONFIG['default'] : null;
  const priorityColors = { high: 'bg-red-500/20 text-red-400', medium: 'bg-yellow-500/20 text-yellow-400', low: 'bg-green-500/20 text-green-400' };

  const nextStatus = task.status === 'pending' ? 'in_progress' : task.status === 'in_progress' ? 'completed' : null;

  return (
    <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 group">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium flex-1">{task.title}</p>
        <button onClick={() => onDelete(task.id!)} className="text-gray-600 hover:text-red-400 transition text-xs opacity-0 group-hover:opacity-100">✕</button>
      </div>
      <div className="flex items-center gap-2 mt-2">
        {tmpl && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <span>{tmpl.icon}</span> {tmpl.name}
          </span>
        )}
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
        {nextStatus && (
          <button
            onClick={() => onUpdate(task.id!, { status: nextStatus })}
            className="text-[10px] ml-auto text-kite-primary hover:underline"
          >
            {nextStatus === 'in_progress' ? '▶ Start' : '✓ Done'}
          </button>
        )}
        {task.status === 'completed' && (
          <span className="text-[10px] ml-auto text-green-400">✓</span>
        )}
      </div>
    </div>
  );
}

// --- Main Page ---

export default function TeamChatPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const params = useParams();
  const teamId = params.teamId as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [teamAgents, setTeamAgents] = useState<Agent[]>([]);
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [respondingAgents, setRespondingAgents] = useState<string[]>([]);
  const [suggestedTasks, setSuggestedTasks] = useState<SuggestedTask[]>([]);

  // Autonomous mode
  const [autoMode, setAutoMode] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoGoal, setAutoGoal] = useState('');
  const [autoIteration, setAutoIteration] = useState(0);
  const autoStopRef = useRef(false);
  const MAX_AUTO_ROUNDS = 10;

  // Task form
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignTo, setTaskAssignTo] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const loadData = useCallback(async () => {
    if (!address || !teamId) return;
    setLoading(true);
    try {
      const [t, allAgents, teamTasks] = await Promise.all([
        getTeamById(teamId),
        getAgentsByWallet(address),
        getTasksByTeam(teamId),
      ]);
      if (!t) { router.push('/teams'); return; }
      setTeam(t);
      setAgents(allAgents);
      setTeamAgents(allAgents.filter(a => t.agentIds.includes(a.clientId)));
      setTasks(teamTasks);

      // Welcome message
      const memberNames = allAgents
        .filter(a => t.agentIds.includes(a.clientId))
        .map(a => {
          const tmpl = TEMPLATE_CONFIG[getTemplate(a)] || TEMPLATE_CONFIG['default'];
          return `${tmpl.icon} ${tmpl.name}`;
        })
        .join(', ');

      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Welcome to **${t.name}**! Your team is ready:\n\n${memberNames}\n\nAsk a question and the right agent(s) will respond based on their expertise. Try:\n- "Analyze AAVE v4 for investment"\n- "Check our spending rules"\n- "Get a swap quote for 1 ETH to USDC"`,
        timestamp: new Date(),
        agentName: 'Team Coordinator',
        agentTemplate: 'default',
        agentIcon: '👥',
      }]);
    } catch (e) {
      console.error('Failed to load team:', e);
      router.push('/teams');
    } finally {
      setLoading(false);
    }
  }, [address, teamId, router]);

  useEffect(() => { loadData(); }, [loadData]);

  const reloadTasks = useCallback(async () => {
    if (!teamId) return;
    const t = await getTasksByTeam(teamId);
    setTasks(t);
  }, [teamId]);

  const handleSend = async () => {
    if (!input.trim() || sending || teamAgents.length === 0) return;

    const userMsg: TeamMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);
    setRespondingAgents(teamAgents.map(a => a.name));

    try {
      const chatMessages = messages
        .filter(m => m.id !== 'welcome')
        .concat(userMsg)
        .map(m => ({
          role: m.role,
          content: m.content,
          agentName: m.agentName,
          agentTemplate: m.agentTemplate,
        }));

      const agentPayload = teamAgents.map(a => ({
        clientId: a.clientId,
        name: a.name,
        template: getTemplate(a),
        accessToken: a.mcpAccessToken,
      }));

      const res = await fetch('/api/teams/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatMessages,
          teamId,
          agents: agentPayload,
        }),
      });

      if (!res.ok) throw new Error(`API returned ${res.status}`);

      const data = await res.json();

      // Add agent responses as separate messages
      const agentMessages: TeamMessage[] = (data.responses || []).map((resp: {
        agentId: string; agentName: string; template: string; icon: string; reply: string; actions: ActionLog[];
      }, i: number) => ({
        id: `agent_${Date.now()}_${i}`,
        role: 'assistant' as const,
        content: resp.reply.replace(/\[TASK:\s*.+?\]/g, '').trim(),
        timestamp: new Date(),
        agentName: resp.agentName,
        agentTemplate: resp.template,
        agentIcon: resp.icon,
        agentId: resp.agentId,
        actions: resp.actions,
      }));

      setMessages(prev => [...prev, ...agentMessages]);

      // Handle suggested tasks
      if (data.suggestedTasks && data.suggestedTasks.length > 0) {
        setSuggestedTasks(data.suggestedTasks);
      }
    } catch (error) {
      console.error('Team chat error:', error);
      setMessages(prev => [...prev, {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: `Error: ${String(error)}. Please try again.`,
        timestamp: new Date(),
        agentName: 'System',
        agentTemplate: 'default',
        agentIcon: '⚠️',
      }]);
    } finally {
      setSending(false);
      setRespondingAgents([]);
      inputRef.current?.focus();
    }
  };

  const handleAddTask = async (title?: string, assignTo?: string, priority?: string) => {
    const t = title || taskTitle.trim();
    if (!t || !teamId) return;

    await addTask({
      teamId,
      title: t,
      description: '',
      status: 'pending',
      assignedTo: assignTo || taskAssignTo || null,
      createdBy: 'user',
      priority: (priority || taskPriority) as 'low' | 'medium' | 'high',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    setTaskTitle('');
    setTaskAssignTo('');
    setTaskPriority('medium');
    setShowTaskForm(false);
    await reloadTasks();
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    await updateTask(taskId, updates);
    await reloadTasks();
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
    await reloadTasks();
  };

  const acceptSuggestedTask = async (st: SuggestedTask) => {
    await handleAddTask(st.title, st.assignTo, st.priority);
    setSuggestedTasks(prev => prev.filter(t => t !== st));
  };

  // --- Autonomous Loop ---
  const runAutonomous = async () => {
    if (!autoGoal.trim() || autoRunning || teamAgents.length === 0) return;
    setAutoRunning(true);
    autoStopRef.current = false;
    setAutoIteration(0);

    // Add goal message
    setMessages(prev => [...prev, {
      id: `goal_${Date.now()}`,
      role: 'user',
      content: `Autonomous Goal: ${autoGoal}`,
      timestamp: new Date(),
    }]);

    const agentPayload = teamAgents.map(a => ({
      clientId: a.clientId,
      name: a.name,
      template: getTemplate(a),
      accessToken: a.mcpAccessToken,
    }));

    for (let i = 0; i < MAX_AUTO_ROUNDS; i++) {
      if (autoStopRef.current) {
        setMessages(prev => [...prev, {
          id: `stopped_${Date.now()}`, role: 'assistant',
          content: `Autonomous execution stopped by user at round ${i + 1}.`,
          timestamp: new Date(),
          agentName: 'Coordinator', agentTemplate: 'coordinator', agentIcon: '🎯',
        }]);
        break;
      }

      setAutoIteration(i + 1);

      // Collect current task state
      const currentTasks = tasks.map(t => ({
        id: t.id!, title: t.title, status: t.status, assignedTo: t.assignedTo,
      }));

      // Build recent messages for context
      const recentMessages = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
        agentName: m.agentName,
        agentTemplate: m.agentTemplate,
      }));

      try {
        const res = await fetch('/api/teams/auto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goal: autoGoal,
            agents: agentPayload,
            messages: recentMessages,
            tasks: currentTasks,
            iteration: i,
          }),
        });

        if (!res.ok) throw new Error(`API returned ${res.status}`);
        const data = await res.json();

        // Add coordinator summary
        setMessages(prev => [...prev, {
          id: `auto_summary_${Date.now()}`,
          role: 'assistant',
          content: `**Round ${i + 1}/${MAX_AUTO_ROUNDS}**: ${data.summary}\n\n_Next: ${data.nextAction}_`,
          timestamp: new Date(),
          agentName: 'Coordinator',
          agentTemplate: 'coordinator',
          agentIcon: '🎯',
        }]);

        // Add agent responses
        const agentMessages: TeamMessage[] = (data.responses || []).map((resp: {
          agentId: string; agentName: string; template: string; icon: string; reply: string; actions: ActionLog[];
        }, idx: number) => ({
          id: `auto_agent_${Date.now()}_${idx}`,
          role: 'assistant' as const,
          content: resp.reply.replace(/\[TASK:\s*.+?\]/g, '').trim(),
          timestamp: new Date(),
          agentName: resp.agentName,
          agentTemplate: resp.template,
          agentIcon: resp.icon,
          agentId: resp.agentId,
          actions: resp.actions,
        }));

        setMessages(prev => [...prev, ...agentMessages]);

        // Create new tasks in Firestore
        for (const task of data.newTasks || []) {
          await addTask({
            teamId,
            title: task.title,
            description: '',
            status: 'pending',
            assignedTo: task.assignTo || null,
            createdBy: 'coordinator',
            priority: task.priority || 'medium',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
        }

        // Update task statuses
        for (const id of data.completedTaskIds || []) {
          await updateTask(id, { status: 'completed' });
        }
        for (const id of data.inProgressTaskIds || []) {
          await updateTask(id, { status: 'in_progress' });
        }

        await reloadTasks();

        // Check if done
        if (!data.continue) {
          setMessages(prev => [...prev, {
            id: `done_${Date.now()}`, role: 'assistant',
            content: 'Goal achieved! Autonomous execution complete.',
            timestamp: new Date(),
            agentName: 'Coordinator', agentTemplate: 'coordinator', agentIcon: '🎯',
          }]);
          break;
        }

        // Small delay between rounds for readability
        await new Promise(r => setTimeout(r, 1000));
      } catch (error) {
        console.error('Autonomous round error:', error);
        setMessages(prev => [...prev, {
          id: `auto_error_${Date.now()}`, role: 'assistant',
          content: `Error in round ${i + 1}: ${String(error)}`,
          timestamp: new Date(),
          agentName: 'Coordinator', agentTemplate: 'coordinator', agentIcon: '🎯',
        }]);
        break;
      }
    }

    setAutoRunning(false);
  };

  const stopAutonomous = () => {
    autoStopRef.current = true;
  };

  if (!isConnected || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-kite-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!team) return null;

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/teams" className="text-gray-400 hover:text-white transition text-sm">
            ← Teams
          </Link>
          <div>
            <h1 className="font-bold">{team.name}</h1>
            <p className="text-xs text-gray-500">{teamAgents.length} agents</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {teamAgents.map(a => {
            const tmpl = TEMPLATE_CONFIG[getTemplate(a)] || TEMPLATE_CONFIG['default'];
            return (
              <span key={a.clientId} title={`${a.name} (${tmpl.name})`} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-sm">
                {tmpl.icon}
              </span>
            );
          })}
        </div>
      </div>

      {/* Main content: Chat + Tasks */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Panel */}
        <div className="flex-[3] flex flex-col border-r border-gray-800 min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${msg.role === 'user' ? '' : ''}`}>
                  {/* Agent name header */}
                  {msg.role === 'assistant' && msg.agentName && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{msg.agentIcon || '🤖'}</span>
                      <span className={`text-xs font-medium ${
                        AGENT_COLORS[msg.agentTemplate || 'default']?.text || 'text-gray-400'
                      }`}>
                        {msg.agentName}
                      </span>
                    </div>
                  )}
                  {/* Message bubble */}
                  <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-kite-primary/20 border border-kite-primary/30 rounded-br-md'
                      : `bg-gray-800 border-l-2 ${AGENT_COLORS[msg.agentTemplate || 'default']?.border || 'border-gray-700'} rounded-bl-md`
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-[10px] mt-2 opacity-40">
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  {/* Action cards */}
                  {msg.actions?.map((action, i) => (
                    <ActionCard key={i} action={action} />
                  ))}
                </div>
              </div>
            ))}

            {/* Suggested tasks */}
            {suggestedTasks.length > 0 && (
              <div className="flex justify-start">
                <div className="max-w-[80%] p-3 bg-kite-primary/10 border border-kite-primary/30 rounded-lg">
                  <p className="text-xs font-medium text-kite-primary mb-2">Suggested Tasks:</p>
                  {suggestedTasks.map((st, i) => (
                    <div key={i} className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-300 flex-1">{st.title}</span>
                      <button
                        onClick={() => acceptSuggestedTask(st)}
                        className="text-[10px] px-2 py-0.5 bg-kite-primary/20 hover:bg-kite-primary/30 text-kite-primary rounded transition"
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Thinking indicator */}
            {sending && (
              <div className="flex justify-start">
                <div className="max-w-[80%]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">🧠</span>
                    <span className="text-xs text-gray-400">
                      {respondingAgents.length > 0
                        ? `${respondingAgents.join(' & ')} thinking...`
                        : 'Team is thinking...'}
                    </span>
                  </div>
                  <div className="p-3 bg-gray-800 rounded-2xl rounded-bl-md border-l-2 border-gray-700">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-800 p-4 shrink-0">
            {/* Mode Toggle */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex bg-gray-800 rounded-lg p-0.5">
                <button
                  onClick={() => setAutoMode(false)}
                  className={`px-3 py-1 text-xs rounded-md transition ${!autoMode ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  Chat
                </button>
                <button
                  onClick={() => setAutoMode(true)}
                  className={`px-3 py-1 text-xs rounded-md transition ${autoMode ? 'bg-kite-primary text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  Auto
                </button>
              </div>
              {autoRunning && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <div className="w-2 h-2 bg-kite-primary rounded-full animate-pulse" />
                  <span>Round {autoIteration}/{MAX_AUTO_ROUNDS}</span>
                </div>
              )}
            </div>

            {!autoMode ? (
              /* Chat Mode Input */
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Message your team..."
                  disabled={sending}
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-kite-primary focus:outline-none disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className="px-4 py-2 bg-kite-primary hover:bg-kite-primary/80 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            ) : (
              /* Auto Mode Input */
              <div className="space-y-2">
                <textarea
                  value={autoGoal}
                  onChange={e => setAutoGoal(e.target.value)}
                  placeholder="Set an autonomous goal for your team, e.g. 'Find the best ETH-USDC swap opportunity and execute it safely'"
                  disabled={autoRunning}
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-kite-primary focus:outline-none disabled:opacity-50 text-sm resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={runAutonomous}
                    disabled={autoRunning || !autoGoal.trim()}
                    className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {autoRunning ? `Running... Round ${autoIteration}/${MAX_AUTO_ROUNDS}` : 'Run Autonomously'}
                  </button>
                  {autoRunning && (
                    <button
                      onClick={stopAutonomous}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-medium text-sm transition"
                    >
                      Stop
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Task Panel */}
        <div className="flex-[2] flex flex-col overflow-hidden min-w-[280px]">
          <div className="border-b border-gray-800 px-4 py-3 flex items-center justify-between shrink-0">
            <h2 className="font-semibold text-sm">Tasks</h2>
            <button
              onClick={() => setShowTaskForm(!showTaskForm)}
              className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded transition"
            >
              + Add
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Add task form */}
            {showTaskForm && (
              <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700 space-y-2">
                <input
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  placeholder="Task title"
                  className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-sm focus:border-kite-primary focus:outline-none"
                />
                <div className="flex gap-2">
                  <select
                    value={taskAssignTo}
                    onChange={e => setTaskAssignTo(e.target.value)}
                    className="flex-1 px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-sm focus:border-kite-primary focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {teamAgents.map(a => {
                      const tmpl = TEMPLATE_CONFIG[getTemplate(a)] || TEMPLATE_CONFIG['default'];
                      return <option key={a.clientId} value={a.clientId}>{tmpl.icon} {a.name}</option>;
                    })}
                  </select>
                  <select
                    value={taskPriority}
                    onChange={e => setTaskPriority(e.target.value as 'low' | 'medium' | 'high')}
                    className="px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-sm focus:border-kite-primary focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowTaskForm(false)}
                    className="flex-1 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleAddTask()}
                    disabled={!taskTitle.trim()}
                    className="flex-1 px-2 py-1 text-xs bg-kite-primary hover:bg-kite-primary/80 rounded transition disabled:opacity-50"
                  >
                    Add Task
                  </button>
                </div>
              </div>
            )}

            {/* Task groups */}
            {tasks.length === 0 && !showTaskForm && (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">No tasks yet</p>
                <p className="text-gray-600 text-xs mt-1">Add tasks or let your agents suggest them</p>
              </div>
            )}

            {pendingTasks.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Pending ({pendingTasks.length})</h3>
                <div className="space-y-2">
                  {pendingTasks.map(t => <TaskCard key={t.id} task={t} agents={teamAgents} onUpdate={handleUpdateTask} onDelete={handleDeleteTask} />)}
                </div>
              </div>
            )}

            {inProgressTasks.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-yellow-500/70 uppercase mb-2">In Progress ({inProgressTasks.length})</h3>
                <div className="space-y-2">
                  {inProgressTasks.map(t => <TaskCard key={t.id} task={t} agents={teamAgents} onUpdate={handleUpdateTask} onDelete={handleDeleteTask} />)}
                </div>
              </div>
            )}

            {completedTasks.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-green-500/70 uppercase mb-2">Completed ({completedTasks.length})</h3>
                <div className="space-y-2">
                  {completedTasks.map(t => <TaskCard key={t.id} task={t} agents={teamAgents} onUpdate={handleUpdateTask} onDelete={handleDeleteTask} />)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

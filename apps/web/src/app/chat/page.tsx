'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useAccount } from 'wagmi';
import { useRouter, useSearchParams } from 'next/navigation';

interface ActionLog {
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
  timestamp: string;
  txHash?: string;
  explorerUrl?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  actions?: ActionLog[];
}

interface AgentInfo {
  agentId: string;
  payerAddress: string | null;
  authenticated: boolean;
  tools: { name: string; description: string }[];
  toolCount: number;
  chain: string;
  mcpServer: string;
}

const TEMPLATE_CONFIG: Record<string, { icon: string; name: string; systemPrompt: string }> = {
  'defi-trader': {
    icon: '📈',
    name: 'DeFi Trader',
    systemPrompt: `You are a DeFi Trading Agent powered by Kite Agent Passport. You specialize in yield optimization, token swaps, DEX aggregation, portfolio tracking, and gas optimization. You can make x402 payments on behalf of the user within their spending limits. Be helpful, concise, and knowledgeable about DeFi protocols.`,
  },
  'nft-collector': {
    icon: '🖼️',
    name: 'NFT Collector',
    systemPrompt: `You are an NFT Collector Agent powered by Kite Agent Passport. You specialize in floor price tracking, rarity analysis, marketplace navigation, and portfolio valuation. You can make x402 payments for NFT-related services.`,
  },
  'research-analyst': {
    icon: '🔬',
    name: 'Research Analyst',
    systemPrompt: `You are a Research Analyst Agent powered by Kite Agent Passport. You specialize in protocol documentation analysis, tokenomics evaluation, market research, and whitepaper summarization. You provide thorough, well-researched answers.`,
  },
  'security-auditor': {
    icon: '🛡️',
    name: 'Security Auditor',
    systemPrompt: `You are a Security Auditor Agent powered by Kite Agent Passport. You specialize in smart contract analysis, rug pull detection, risk assessment, and audit report interpretation. You are cautious and thorough.`,
  },
  'social-manager': {
    icon: '📱',
    name: 'Social Manager',
    systemPrompt: `You are a Social Manager Agent powered by Kite Agent Passport. You specialize in Twitter/X monitoring, Farcaster integration, community management, and content drafting.`,
  },
  'dao-delegate': {
    icon: '🏛️',
    name: 'DAO Delegate',
    systemPrompt: `You are a DAO Delegate Agent powered by Kite Agent Passport. You specialize in governance proposal analysis, voting pattern tracking, delegate comparison, and deadline monitoring.`,
  },
  'default': {
    icon: '🤖',
    name: 'Kite Agent',
    systemPrompt: `You are a Kite Agent powered by Kite Agent Passport. You can help users with various tasks and make x402 payments on their behalf within configured spending limits. You are helpful, knowledgeable about Web3 and crypto, and always transparent about your capabilities.`,
  },
};

function ActionCard({ action }: { action: ActionLog }) {
  const isPayment = action.tool === 'approve_payment' || action.tool === 'pay_for_service';
  const isSwap = action.tool === 'get_swap_quote' || action.tool === 'execute_swap';
  const isIdentity = action.tool === 'get_agent_identity';
  const result = action.result as Record<string, unknown>;

  return (
    <div className={`border rounded-lg p-3 text-xs ${
      isPayment ? 'border-green-700 bg-green-900/20' :
      isSwap ? 'border-orange-700 bg-orange-900/20' :
      isIdentity ? 'border-purple-700 bg-purple-900/20' :
      'border-gray-700 bg-gray-800/50'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${
          isPayment ? 'bg-green-400' : isSwap ? 'bg-orange-400' : isIdentity ? 'bg-purple-400' : 'bg-blue-400'
        }`} />
        <span className="font-medium text-gray-300">
          {isPayment ? 'x402 Payment' :
           isSwap ? 'Uniswap Swap' :
           isIdentity ? 'Identity Verification' :
           action.tool.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </span>
        {!!(result as Record<string, unknown>)?.gasless && (
          <span className="px-1.5 py-0.5 bg-kite-primary/20 text-kite-secondary rounded text-[10px]">
            Gasless
          </span>
        )}
      </div>

      {isPayment && (
        <div className="space-y-1 text-gray-400">
          {!!result?.amount && <div>Amount: <span className="text-white">{String(result.amount)}</span></div>}
          {!!result?.service && <div>Service: <span className="text-white">{String(result.service)}</span></div>}
          {!!result?.recipient && (
            <div>To: <span className="font-mono text-white">{String(result.recipient).slice(0, 10)}...{String(result.recipient).slice(-6)}</span></div>
          )}
          {!!result?.x402Flow && (
            <div className="mt-2 space-y-0.5 text-[10px]">
              {Object.values(result.x402Flow as Record<string, string>).map((step, i) => (
                <div key={i} className="flex items-start gap-1">
                  <span className="text-green-400 shrink-0">Step {i + 1}:</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isSwap && (
        <div className="space-y-1 text-gray-400">
          {!!(result?.quote || result?.swap) && (
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">
                {String((result?.quote as Record<string, unknown>)?.tokenIn || (result?.swap as Record<string, unknown>)?.tokenIn || '')}
              </span>
              <span className="text-orange-400">&rarr;</span>
              <span className="text-white font-medium">
                {String((result?.quote as Record<string, unknown>)?.tokenOut || (result?.swap as Record<string, unknown>)?.tokenOut || '')}
              </span>
              <span className="px-1.5 py-0.5 bg-orange-900/30 text-orange-300 rounded text-[10px]">
                {String((result?.quote as Record<string, unknown>)?.chainName || (result?.swap as Record<string, unknown>)?.chainName || 'Ethereum')}
              </span>
            </div>
          )}
          {!!(result?.quote as Record<string, unknown>)?.amountOut && (
            <div>Output: <span className="text-white font-mono">{String((result.quote as Record<string, unknown>).amountOut)}</span></div>
          )}
          {!!(result?.swap as Record<string, unknown>)?.amountOut && (
            <div>Est. Output: <span className="text-white font-mono">{String((result.swap as Record<string, unknown>).amountOut)}</span></div>
          )}
          {!!result?.swapFlow && (
            <div className="mt-2 space-y-0.5 text-[10px]">
              {Object.entries(result.swapFlow as Record<string, string>).map(([key, step], i) => (
                <div key={key} className="flex items-start gap-1">
                  <span className="text-orange-400 shrink-0">Step {i + 1}:</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          )}
          {!!(result?.payment as Record<string, unknown>)?.amount && (
            <div className="mt-1 pt-1 border-t border-orange-900/30">
              <span className="text-orange-300">Service Fee:</span>{' '}
              <span className="text-white">{String((result.payment as Record<string, unknown>).amount)}</span>
              <span className="text-gray-500 ml-2">on {String((result.payment as Record<string, unknown>).chain || 'Kite')}</span>
            </div>
          )}
          {!!(result?.crossChain as Record<string, unknown>)?.narrative && (
            <div className="mt-1 text-[10px] text-orange-300/70 italic">
              {String((result.crossChain as Record<string, unknown>).narrative)}
            </div>
          )}
          <div className="text-[10px] text-gray-600">Source: Uniswap Trading API</div>
        </div>
      )}

      {isIdentity && (
        <div className="space-y-1 text-gray-400">
          {!!result?.payerAddress && (
            <div>Address: <span className="font-mono text-white">{String(result.payerAddress).slice(0, 10)}...{String(result.payerAddress).slice(-6)}</span></div>
          )}
          <div>Chain: <span className="text-white">{String(result?.chain || 'Kite Testnet')}</span></div>
          <div>Authenticated: <span className={result?.authenticated ? 'text-green-400' : 'text-red-400'}>{result?.authenticated ? 'Yes' : 'No'}</span></div>
        </div>
      )}

      {!isPayment && !isIdentity && !isSwap && !!result?.tools && (
        <div className="text-gray-400">
          Tools: <span className="text-white">{String((result.tools as unknown[]).length)} available</span>
        </div>
      )}

      {action.txHash && action.txHash !== 'simulated' && action.txHash !== 'pending' && (
        <div className="mt-2 pt-2 border-t border-gray-700">
          <a
            href={action.explorerUrl || `https://testnet.kitescan.ai/tx/${action.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-kite-secondary hover:text-kite-primary transition flex items-center gap-1"
          >
            View on Explorer &rarr;
            <span className="font-mono">{action.txHash.slice(0, 10)}...</span>
          </a>
        </div>
      )}
    </div>
  );
}

function AgentHeader({
  templateConfig,
  agentInfo,
  agentId,
  onBack,
}: {
  templateConfig: { icon: string; name: string };
  agentInfo: AgentInfo | null;
  agentId: string | null;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-gray-800">
      <button onClick={onBack} className="text-gray-400 hover:text-white transition">
        ← Back
      </button>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-kite-primary/20 rounded-full flex items-center justify-center text-xl">
          {templateConfig.icon}
        </div>
        <div>
          <h1 className="font-semibold">{templateConfig.name} Agent</h1>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500">Kite Agent Passport</p>
            {agentInfo?.authenticated ? (
              <span className="flex items-center gap-1 text-[10px] text-green-400 bg-green-900/30 px-1.5 py-0.5 rounded">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                Verified
              </span>
            ) : agentId ? (
              <span className="flex items-center gap-1 text-[10px] text-yellow-400 bg-yellow-900/30 px-1.5 py-0.5 rounded">
                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full" />
                Connecting
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full" />
                No Agent
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="ml-auto text-right">
        {agentInfo?.payerAddress && (
          <a
            href={`https://testnet.kitescan.ai/address/${agentInfo.payerAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-gray-400 hover:text-kite-secondary transition"
          >
            {agentInfo.payerAddress.slice(0, 6)}...{agentInfo.payerAddress.slice(-4)}
          </a>
        )}
        {agentInfo && (
          <p className="text-[10px] text-gray-600">{agentInfo.toolCount} MCP tools</p>
        )}
      </div>
    </div>
  );
}

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const template = searchParams.get('template') || 'default';
  const agentIdParam = searchParams.get('agent') || null;
  const accessToken = searchParams.get('token') || null;
  const { isConnected, address } = useAccount();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [agentId, setAgentId] = useState<string | null>(agentIdParam);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const templateConfig = TEMPLATE_CONFIG[template] || TEMPLATE_CONFIG['default'];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch agent info on mount
  const fetchAgentInfo = useCallback(async () => {
    if (!agentId) return;
    try {
      const params = new URLSearchParams({ agentId });
      if (accessToken) params.set('accessToken', accessToken);
      const res = await fetch(`/api/agent-info?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAgentInfo(data);
      }
    } catch {
      // Agent info fetch is non-critical
    }
  }, [agentId, accessToken]);

  useEffect(() => {
    fetchAgentInfo();
  }, [fetchAgentInfo]);

  // Redirect to Dashboard if no agent selected
  useEffect(() => {
    if (!agentIdParam) {
      router.replace('/dashboard');
    }
  }, [agentIdParam, router]);

  // Welcome message
  useEffect(() => {
    if (!agentIdParam) return;
    const name = templateConfig.name;
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Hello! I'm your ${name} Agent, powered by Kite Agent Passport.\n\nI can authenticate myself on-chain, execute tasks autonomously, and make x402 payments within your spending rules -- all gasless on Kite.\n\nTry asking me to:\n- "Show me your identity" (agent self-authentication)\n- "What can you do?" (list MCP capabilities)\n- "Get a swap quote for 1 ETH to USDC" (Uniswap live pricing)\n- "Swap 1000 USDC for ETH on Base" (cross-chain DeFi via Uniswap + x402)\n- "Get me premium research" (x402 payment flow)\n- "Check my spending rules" (scoped permissions)\n\nHow can I help you?`,
        timestamp: new Date(),
      },
    ]);
  }, [templateConfig.name, agentIdParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const chatMessages = messages
        .filter(m => m.role !== 'system' && m.id !== 'welcome')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      chatMessages.push({ role: 'user', content: userMessage.content });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatMessages,
          systemPrompt: templateConfig.systemPrompt,
          agentId: agentId || undefined,
          accessToken: accessToken || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: data.reply || "I apologize, I couldn't generate a response.",
        timestamp: new Date(),
        actions: data.actions || [],
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      setError('Failed to get response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="text-6xl mb-6">🔐</div>
        <h1 className="text-3xl font-bold mb-4">Connect Your Wallet</h1>
        <p className="text-gray-400">Connect your wallet to chat with your agent.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-4xl mx-auto">
      <AgentHeader
        templateConfig={templateConfig}
        agentInfo={agentInfo}
        agentId={agentId}
        onBack={() => router.push('/dashboard')}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <div key={message.id}>
            <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] p-4 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-kite-primary text-white rounded-br-md'
                    : 'bg-gray-800 text-gray-100 rounded-bl-md'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs mt-2 opacity-50">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {/* Action cards */}
            {message.actions && message.actions.length > 0 && (
              <div className="mt-2 ml-0 space-y-2 max-w-[80%]">
                {message.actions.map((action, i) => (
                  <ActionCard key={i} action={action} />
                ))}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 p-4 rounded-2xl rounded-bl-md">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-kite-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-kite-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-kite-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-gray-500">Agent executing...</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="bg-red-900/20 border border-red-800 p-3 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask your agent anything..."
            className="flex-1 p-4 bg-gray-900 border border-gray-700 rounded-xl focus:border-kite-primary outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-6 bg-kite-primary hover:bg-kite-secondary rounded-xl font-medium transition disabled:opacity-50"
          >
            Send
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-xs text-gray-500">
            Powered by Kite Agent Passport
            {agentInfo?.authenticated && (
              <span className="text-green-500 ml-2">Agent verified on-chain</span>
            )}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>x402</span>
            <span>|</span>
            <span>Uniswap</span>
            <span>|</span>
            <span>Gasless</span>
            <span>|</span>
            <span>Kite Testnet</span>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="animate-spin text-4xl">🪁</div>
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}

'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useAccount } from 'wagmi';
import { useRouter, useSearchParams } from 'next/navigation';
import OpenAI from 'openai';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

const SYSTEM_PROMPTS: Record<string, string> = {
  'defi-trader': `You are a DeFi Trading Agent powered by Kite Agent Passport. You specialize in:
- Yield optimization and farming strategies
- Token swaps and DEX aggregation
- Portfolio tracking and rebalancing
- Gas optimization for transactions

You can make x402 payments on behalf of the user within their spending limits. When asked to perform actions that require payment, acknowledge the x402 protocol and spending rules.

Be helpful, concise, and knowledgeable about DeFi protocols on Kite Chain and other networks.`,

  'nft-collector': `You are an NFT Collector Agent powered by Kite Agent Passport. You specialize in:
- Floor price tracking across marketplaces
- Rarity analysis and trait evaluation
- Marketplace navigation (OpenSea, Blur, etc.)
- Portfolio valuation

You can make x402 payments for NFT-related services. Be enthusiastic about NFTs but also practical about investments.`,

  'research-analyst': `You are a Research Analyst Agent powered by Kite Agent Passport. You specialize in:
- Protocol documentation analysis
- Tokenomics evaluation
- Market research and trends
- Whitepaper summarization

You provide thorough, well-researched answers. When making claims, be specific about sources and confidence levels.`,

  'security-auditor': `You are a Security Auditor Agent powered by Kite Agent Passport. You specialize in:
- Smart contract analysis
- Rug pull detection patterns
- Risk assessment scoring
- Audit report interpretation

You are cautious and thorough. Always highlight potential risks and never give financial advice. When in doubt, recommend professional audits.`,

  'social-manager': `You are a Social Manager Agent powered by Kite Agent Passport. You specialize in:
- Twitter/X monitoring and engagement
- Farcaster integration
- Community management strategies
- Content drafting and scheduling

You understand crypto culture and can help craft engaging social content while maintaining professionalism.`,

  'dao-delegate': `You are a DAO Delegate Agent powered by Kite Agent Passport. You specialize in:
- Governance proposal analysis
- Voting pattern tracking
- Delegate comparison
- Deadline monitoring

You help users stay informed about governance across multiple DAOs and make informed voting decisions.`,

  'default': `You are a Kite Agent powered by Kite Agent Passport. You can help users with various tasks and make x402 payments on their behalf within configured spending limits.

You are helpful, knowledgeable about Web3 and crypto, and always transparent about your capabilities and limitations.`
};

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const template = searchParams.get('template') || 'default';
  const { isConnected, address } = useAccount();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Welcome message
  useEffect(() => {
    const templateName = template.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Hello! I'm your ${templateName !== 'Default' ? templateName : 'Kite'} Agent. I'm powered by Kite Agent Passport and can help you with tasks, make x402 payments on your behalf within your spending limits. How can I assist you today?`,
        timestamp: new Date(),
      },
    ]);
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      
      if (!apiKey || apiKey === 'your_openai_api_key') {
        // Demo mode - simulate response
        setTimeout(() => {
          const responses = [
            `I understand your request. As a ${template.replace(/-/g, ' ')} agent, I can help with that. Let me analyze the situation...`,
            "I've checked the relevant data. Based on my analysis, here's what I found...",
            "This would require an x402 payment of approximately 0.01 USDC. Your current daily budget allows for this transaction. Shall I proceed?",
            "I'm querying the Kite network for the latest information. One moment...",
            "Based on my knowledge and current market conditions, I recommend the following approach...",
          ];
          
          const assistantMessage: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: responses[Math.floor(Math.random() * responses.length)],
            timestamp: new Date(),
          };
          
          setMessages((prev) => [...prev, assistantMessage]);
          setIsLoading(false);
        }, 1500);
        return;
      }

      const openai = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true, // For demo - in production use backend
      });

      const systemPrompt = SYSTEM_PROMPTS[template] || SYSTEM_PROMPTS['default'];
      
      const chatMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...messages
          .filter(m => m.role !== 'system' && m.id !== 'welcome')
          .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: userMessage.content }
      ];

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: chatMessages,
        max_tokens: 500,
      });

      const assistantContent = response.choices[0]?.message?.content || "I apologize, I couldn't generate a response.";
      
      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
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

  const templateName = template.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-gray-800">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-gray-400 hover:text-white transition"
        >
          ← Back
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-kite-primary/20 rounded-full flex items-center justify-center text-xl">
            {template === 'defi-trader' && '📈'}
            {template === 'nft-collector' && '🖼️'}
            {template === 'research-analyst' && '🔬'}
            {template === 'security-auditor' && '🛡️'}
            {template === 'social-manager' && '📱'}
            {template === 'dao-delegate' && '🏛️'}
            {template === 'default' && '🤖'}
          </div>
          <div>
            <h1 className="font-semibold">{templateName} Agent</h1>
            <p className="text-xs text-gray-500">Powered by Kite Agent Passport</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          <span className="text-sm text-gray-400">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
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
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 p-4 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
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
            onChange={(e) => setInput(e.target.value)}
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
        <p className="text-xs text-gray-500 mt-2 text-center">
          Powered by Kite Agent Passport • x402 payments may apply
        </p>
      </form>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <div className="animate-spin text-4xl">🪁</div>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}

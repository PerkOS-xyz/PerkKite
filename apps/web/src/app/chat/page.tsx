'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useAccount } from 'wagmi';
import { useRouter, useSearchParams } from 'next/navigation';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const agentId = searchParams.get('agent');
  const { isConnected } = useAccount();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Welcome message
  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Hello! I'm your Kite agent. I can help you with tasks and make x402 payments on your behalf within your spending limits. How can I assist you today?`,
        timestamp: new Date(),
      },
    ]);
  }, []);

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

    // Simulate AI response (in production, this would call the MCP endpoint)
    setTimeout(() => {
      const responses = [
        "I understand. Let me check that for you using my available tools.",
        "I can help with that! To proceed, I'll need to make an x402 payment. Your current daily budget allows for this transaction.",
        "I've analyzed your request. Based on my knowledge, here's what I found...",
        "Great question! Let me query the relevant services to get you accurate information.",
        "I'm checking the current market conditions. This may require a small payment to the data provider.",
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
            🤖
          </div>
          <div>
            <h1 className="font-semibold">Kite Agent</h1>
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
              <p className="text-sm leading-relaxed">{message.content}</p>
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
          Messages are processed via Kite MCP • x402 payments may apply
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

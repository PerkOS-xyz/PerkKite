'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';

const templates = [
  {
    id: 'defi-trader',
    name: 'DeFi Trader',
    description: 'Yield optimization, token swaps, and portfolio tracking',
    icon: '📈',
    category: 'defi',
    popular: true,
  },
  {
    id: 'nft-collector',
    name: 'NFT Collector',
    description: 'Floor tracking, rarity analysis, marketplace navigation',
    icon: '🖼️',
    category: 'nft',
    popular: true,
  },
  {
    id: 'research-analyst',
    name: 'Research Analyst',
    description: 'Protocol docs, tokenomics analysis, market research',
    icon: '🔬',
    category: 'research',
    popular: false,
  },
  {
    id: 'security-auditor',
    name: 'Security Auditor',
    description: 'Contract analysis, rug detection, risk assessment',
    icon: '🛡️',
    category: 'security',
    popular: true,
  },
  {
    id: 'social-manager',
    name: 'Social Manager',
    description: 'Twitter monitoring, Farcaster, community management',
    icon: '📱',
    category: 'social',
    popular: false,
  },
  {
    id: 'dao-delegate',
    name: 'DAO Delegate',
    description: 'Governance proposals, voting analysis, delegate tracking',
    icon: '🏛️',
    category: 'governance',
    popular: false,
  },
];

export default function Home() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const handleTemplateClick = (templateId: string, category: string) => {
    if (isConnected) {
      // Go directly to chat with template
      router.push(`/chat?template=${templateId}`);
    } else {
      // Store selection and open connect modal
      localStorage.setItem('pendingTemplate', JSON.stringify({ templateId, category }));
      openConnectModal?.();
    }
  };

  // Check for pending template after connection
  useEffect(() => {
    if (isConnected) {
      const pending = localStorage.getItem('pendingTemplate');
      if (pending) {
        const { templateId } = JSON.parse(pending);
        localStorage.removeItem('pendingTemplate');
        router.push(`/chat?template=${templateId}`);
      }
    }
  }, [isConnected, router]);

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center px-8 py-20 text-center">
        <div className="text-6xl mb-6">🪁</div>
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-kite-primary to-perkos-pink bg-clip-text text-transparent">
          PerkKite
        </h1>
        <p className="text-2xl text-gray-300 mb-2">
          Spark for Kite
        </p>
        <p className="text-lg text-gray-400 max-w-xl mb-8">
          Launch AI agents with verifiable identity and delegated payments powered by Kite Agent Passport
        </p>
        <div className="flex gap-4">
          <Link
            href="/dashboard"
            className="px-8 py-4 bg-kite-primary hover:bg-kite-secondary rounded-lg font-semibold text-lg transition"
          >
            Launch App →
          </Link>
          <a
            href="https://docs.gokite.ai/kite-agent-passport"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 border border-gray-700 hover:border-gray-500 rounded-lg font-semibold text-lg transition"
          >
            Learn More
          </a>
        </div>
      </section>

      {/* Templates Section */}
      <section className="px-8 py-16 bg-gray-900/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Agent Templates</h2>
          <p className="text-gray-400 text-center mb-12">
            Choose a template to get started with pre-configured knowledge
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateClick(template.id, template.category)}
                className="text-left bg-gray-900 rounded-xl border border-gray-800 hover:border-kite-primary transition overflow-hidden group"
              >
                {template.popular && (
                  <div className="bg-gradient-to-r from-kite-primary to-perkos-pink text-xs font-medium py-1 px-3 text-center">
                    🔥 Popular
                  </div>
                )}
                <div className="p-6">
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
                    {template.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{template.name}</h3>
                  <p className="text-gray-400 text-sm">{template.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-8 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="text-4xl mb-4">1️⃣</div>
              <h3 className="text-xl font-semibold mb-2">Choose a Template</h3>
              <p className="text-gray-400">
                Select an agent template with pre-built knowledge for DeFi, NFTs, research, and more.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="text-4xl mb-4">2️⃣</div>
              <h3 className="text-xl font-semibold mb-2">Connect to Kite</h3>
              <p className="text-gray-400">
                Link your Kite Agent Passport for identity and payment authorization.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="text-4xl mb-4">3️⃣</div>
              <h3 className="text-xl font-semibold mb-2">Chat & Transact</h3>
              <p className="text-gray-400">
                Talk to your agent and let it make x402 payments within your spending rules.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Diagram */}
      <section className="px-8 py-16 bg-gray-900/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Architecture</h2>
          
          <div className="relative bg-gray-900 rounded-xl border border-gray-800 p-8 overflow-x-auto">
            <div className="flex items-center justify-between min-w-[600px] gap-4">
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-3xl">👤</div>
                <span className="mt-2 text-sm font-medium">User</span>
                <span className="text-xs text-gray-500">Wallet Owner</span>
              </div>
              <div className="flex-1 flex items-center">
                <div className="h-0.5 flex-1 bg-gradient-to-r from-blue-600 to-kite-primary"></div>
                <div className="text-kite-primary">→</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-kite-primary rounded-xl flex items-center justify-center text-3xl">🪁</div>
                <span className="mt-2 text-sm font-medium">PerkKite</span>
                <span className="text-xs text-gray-500">Templates + Chat</span>
              </div>
              <div className="flex-1 flex items-center">
                <div className="h-0.5 flex-1 bg-gradient-to-r from-kite-primary to-purple-500"></div>
                <div className="text-purple-500">→</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-purple-600 rounded-xl flex items-center justify-center text-3xl">🎫</div>
                <span className="mt-2 text-sm font-medium">Kite Passport</span>
                <span className="text-xs text-gray-500">Identity + Rules</span>
              </div>
              <div className="flex-1 flex items-center">
                <div className="h-0.5 flex-1 bg-gradient-to-r from-purple-500 to-green-500"></div>
                <div className="text-green-500">→</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-green-600 rounded-xl flex items-center justify-center text-3xl">🤖</div>
                <span className="mt-2 text-sm font-medium">AI Agent</span>
                <span className="text-xs text-gray-500">MCP Client</span>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-700">
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-600 rounded-lg flex items-center justify-center text-2xl mx-auto">🌐</div>
                  <span className="text-xs text-gray-400 mt-1 block">x402 Service</span>
                </div>
                <div className="text-yellow-500">⟷</div>
                <div className="px-4 py-2 bg-gray-800 rounded-lg text-sm">
                  <span className="text-yellow-400">402</span> → <span className="text-purple-400">X-PAYMENT</span> → <span className="text-green-400">200 OK</span>
                </div>
                <div className="text-yellow-500">⟷</div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-perkos-pink rounded-lg flex items-center justify-center text-2xl mx-auto">💰</div>
                  <span className="text-xs text-gray-400 mt-1 block">Facilitator</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* x402 Flow */}
      <section className="px-8 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">The x402 Payment Flow</h2>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 text-left font-mono text-sm">
            <div className="space-y-3">
              <p><span className="text-gray-500">1.</span> Agent requests service → <span className="text-yellow-400">402 Payment Required</span></p>
              <p><span className="text-gray-500">2.</span> Agent checks spending rules → <span className="text-blue-400">Within budget? ✓</span></p>
              <p><span className="text-gray-500">3.</span> Kite signs payment authorization → <span className="text-purple-400">X-PAYMENT header</span></p>
              <p><span className="text-gray-500">4.</span> Agent retries with payment → <span className="text-green-400">200 OK + response</span></p>
              <p><span className="text-gray-500">5.</span> Facilitator settles on-chain → <span className="text-kite-primary">USDC transferred</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-8 py-20 text-center bg-gray-900/50">
        <h2 className="text-3xl font-bold mb-4">Ready to Launch Your Agent?</h2>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          Choose a template above or create a custom agent from scratch.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-8 py-4 bg-kite-primary hover:bg-kite-secondary rounded-lg font-semibold text-lg transition"
        >
          Get Started →
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-8 py-8 border-t border-gray-800 text-center text-gray-500 text-sm">
        <p>
          Built with 🪁 Kite Agent Passport | Part of the{' '}
          <a href="https://perkos.xyz" target="_blank" rel="noopener noreferrer" className="text-perkos-pink hover:underline">
            PerkOS
          </a>{' '}
          ecosystem
        </p>
      </footer>
    </main>
  );
}

'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';

interface KnowledgeTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  skills: string[];
  price: string;
  popular: boolean;
}

const templates: KnowledgeTemplate[] = [
  {
    id: 'defi-trader',
    name: 'DeFi Trader',
    description: 'Yield optimization, token swaps, liquidity management, and portfolio tracking.',
    category: 'DeFi',
    icon: '📈',
    skills: ['Swap tokens', 'Find best yields', 'Track portfolio', 'Gas optimization'],
    price: 'Free',
    popular: true,
  },
  {
    id: 'nft-collector',
    name: 'NFT Collector',
    description: 'Floor price tracking, rarity analysis, and marketplace navigation.',
    category: 'NFT',
    icon: '🖼️',
    skills: ['Track floors', 'Analyze rarity', 'Snipe listings', 'Portfolio value'],
    price: 'Free',
    popular: true,
  },
  {
    id: 'research-analyst',
    name: 'Research Analyst',
    description: 'Protocol documentation, tokenomics analysis, and market research.',
    category: 'Research',
    icon: '🔬',
    skills: ['Read docs', 'Analyze tokenomics', 'Compare protocols', 'Summarize whitepapers'],
    price: 'Free',
    popular: false,
  },
  {
    id: 'social-manager',
    name: 'Social Manager',
    description: 'Twitter/X monitoring, Farcaster engagement, and community management.',
    category: 'Social',
    icon: '📱',
    skills: ['Monitor mentions', 'Track influencers', 'Draft posts', 'Engagement analytics'],
    price: '5 USDC',
    popular: false,
  },
  {
    id: 'dao-delegate',
    name: 'DAO Delegate',
    description: 'Governance proposals, voting analysis, and delegate tracking.',
    category: 'Governance',
    icon: '🏛️',
    skills: ['Track proposals', 'Analyze votes', 'Compare delegates', 'Deadline alerts'],
    price: '5 USDC',
    popular: false,
  },
  {
    id: 'security-auditor',
    name: 'Security Auditor',
    description: 'Smart contract analysis, rug pull detection, and risk assessment.',
    category: 'Security',
    icon: '🛡️',
    skills: ['Analyze contracts', 'Check audits', 'Detect rugs', 'Risk scoring'],
    price: '10 USDC',
    popular: true,
  },
];

export default function MarketplacePage() {
  const { isConnected } = useAccount();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['All', 'DeFi', 'NFT', 'Research', 'Social', 'Governance', 'Security'];

  const filteredTemplates = templates.filter((t) => {
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Knowledge Marketplace</h1>
        <p className="text-gray-400">Add skills and knowledge to your Kite agents</p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <input
          type="text"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 p-3 bg-gray-900 border border-gray-800 rounded-lg focus:border-kite-primary outline-none"
        />
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedCategory === cat
                  ? 'bg-kite-primary text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition overflow-hidden"
          >
            {template.popular && (
              <div className="bg-gradient-to-r from-kite-primary to-perkos-pink text-xs font-medium py-1 px-3 text-center">
                🔥 Popular
              </div>
            )}
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl">{template.icon}</div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  template.price === 'Free' ? 'bg-green-600/20 text-green-400' : 'bg-yellow-600/20 text-yellow-400'
                }`}>
                  {template.price}
                </span>
              </div>
              
              <h3 className="text-lg font-semibold mb-2">{template.name}</h3>
              <p className="text-gray-400 text-sm mb-4">{template.description}</p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {template.skills.map((skill) => (
                  <span key={skill} className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400">
                    {skill}
                  </span>
                ))}
              </div>

              <button
                disabled={!isConnected}
                className="w-full py-2 bg-kite-primary hover:bg-kite-secondary rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnected ? 'Add to Agent' : 'Connect Wallet'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Coming Soon */}
      <div className="mt-12 text-center p-8 bg-gray-900/50 rounded-xl border border-dashed border-gray-700">
        <div className="text-4xl mb-4">🚀</div>
        <h3 className="text-xl font-medium mb-2">More Templates Coming Soon</h3>
        <p className="text-gray-400 mb-4">
          Want to create and sell your own knowledge templates?
        </p>
        <a
          href="https://discord.gg/perkos"
          target="_blank"
          rel="noopener noreferrer"
          className="text-kite-primary hover:underline"
        >
          Join our Discord →
        </a>
      </div>
    </div>
  );
}

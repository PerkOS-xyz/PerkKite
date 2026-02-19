'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAccount } from 'wagmi';
import { useRouter, useSearchParams } from 'next/navigation';
import { RUNTIMES, type RuntimeType } from '@perkkite/shared';
import { addAgent } from '@/lib/agents';

const KITE_PORTAL_URL = 'https://x402-portal-eight.vercel.app/';

const templateNames: Record<string, string> = {
  'defi-trader': 'DeFi Trader',
  'nft-collector': 'NFT Collector',
  'research-analyst': 'Research Analyst',
  'security-auditor': 'Security Auditor',
  'social-manager': 'Social Manager',
  'dao-delegate': 'DAO Delegate',
};

function NewAgentContent() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    clientId: '',
    mcpUrl: 'https://neo.dev.gokite.ai/v1/mcp',
    category: 'general',
    runtimeType: 'nano-claw' as RuntimeType,
    dailyBudget: '5',
  });
  const [isLoading, setIsLoading] = useState(false);

  // Check for template from URL or localStorage
  useEffect(() => {
    const templateFromUrl = searchParams.get('template');
    const categoryFromUrl = searchParams.get('category');
    
    if (templateFromUrl) {
      setSelectedTemplate(templateFromUrl);
      setFormData(prev => ({
        ...prev,
        name: templateNames[templateFromUrl] || '',
        category: categoryFromUrl || prev.category,
      }));
    } else {
      // Check localStorage for pending selection
      const pending = localStorage.getItem('pendingTemplate');
      if (pending) {
        const { templateId, category } = JSON.parse(pending);
        setSelectedTemplate(templateId);
        setFormData(prev => ({
          ...prev,
          name: templateNames[templateId] || '',
          category: category || prev.category,
        }));
        localStorage.removeItem('pendingTemplate');
      }
    }
  }, [searchParams]);

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !formData.name || !formData.clientId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await addAgent({
        name: formData.name,
        clientId: formData.clientId,
        mcpUrl: formData.mcpUrl,
        walletAddress: address,
        knowledge: selectedTemplate ? [selectedTemplate] : [],
        createdAt: new Date(),
      });
      
      setStep(4);
    } catch (err) {
      console.error('Error creating agent:', err);
      setError(err instanceof Error ? err.message : 'Failed to save agent. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Require wallet connection
  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="text-6xl mb-6">🔐</div>
        <h1 className="text-3xl font-bold mb-4">Connect Your Wallet</h1>
        <p className="text-gray-400 mb-8">
          Connect your wallet to create and manage your Kite agents.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Add Kite Agent</h1>
      <p className="text-gray-400 mb-8">Link your Kite Agent Passport to PerkKite</p>

      {/* Progress Steps */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded ${
              s <= step ? 'bg-kite-primary' : 'bg-gray-700'
            }`}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Kite Agent Info */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Kite Agent Details</h2>
            
            {selectedTemplate && (
              <div className="p-4 bg-kite-primary/10 border border-kite-primary rounded-lg">
                <p className="text-sm text-kite-primary">
                  <span className="font-medium">🎯 Template:</span> {templateNames[selectedTemplate]}
                </p>
              </div>
            )}
            
            <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
              <p className="text-sm text-blue-300">
                <span className="font-medium">📋 First:</span> Create your agent in the{' '}
                <a href={KITE_PORTAL_URL} target="_blank" rel="noopener noreferrer" className="underline">
                  Kite Portal
                </a>
                , then come back and paste your Client ID here.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Agent Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-kite-primary outline-none"
                placeholder="My Trading Agent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Client ID (from Kite Portal)</label>
              <input
                type="text"
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-kite-primary outline-none font-mono text-sm"
                placeholder="client_agent_yCQRgvatvJD4sQWiVn7vmtjN"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Kite Portal → Agents → Click agent → MCP Config → Copy Client ID
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">MCP URL</label>
              <input
                type="text"
                value={formData.mcpUrl}
                onChange={(e) => setFormData({ ...formData, mcpUrl: e.target.value })}
                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-kite-primary outline-none font-mono text-sm"
              />
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!formData.name || !formData.clientId}
              className="w-full p-3 bg-kite-primary hover:bg-kite-secondary rounded-lg font-medium transition disabled:opacity-50"
            >
              Next: Select Category
            </button>
          </div>
        )}

        {/* Step 2: Category */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Agent Category</h2>
            
            <div className="grid grid-cols-2 gap-4">
              {['general', 'defi', 'nft', 'social', 'research', 'security'].map((cat) => (
                <label
                  key={cat}
                  className={`p-4 border rounded-lg cursor-pointer transition text-center ${
                    formData.category === cat
                      ? 'border-kite-primary bg-kite-primary/10'
                      : 'border-gray-700 hover:border-gray-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="category"
                    value={cat}
                    checked={formData.category === cat}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="sr-only"
                  />
                  <div className="text-2xl mb-2">
                    {cat === 'general' && '🤖'}
                    {cat === 'defi' && '📈'}
                    {cat === 'nft' && '🖼️'}
                    {cat === 'social' && '📱'}
                    {cat === 'research' && '🔬'}
                    {cat === 'security' && '🛡️'}
                  </div>
                  <span className="capitalize font-medium">{cat}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 p-3 border border-gray-700 hover:border-gray-500 rounded-lg font-medium transition"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 p-3 bg-kite-primary hover:bg-kite-secondary rounded-lg font-medium transition"
              >
                Next: Confirm
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Confirm Agent</h2>

            <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Name:</span>
                  <span className="font-medium">{formData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Client ID:</span>
                  <span className="font-mono text-xs">{formData.clientId.slice(0, 20)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Category:</span>
                  <span className="capitalize">{formData.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Wallet:</span>
                  <span className="font-mono text-xs">{address?.slice(0, 10)}...</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
              <h3 className="font-medium mb-2">🔐 Kite Agent Passport</h3>
              <p className="text-sm text-gray-400">
                Your agent&apos;s identity and spending rules are managed by Kite. 
                PerkKite adds knowledge customization and a chat interface.
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
                <p className="text-sm text-red-400">❌ {error}</p>
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 p-3 border border-gray-700 hover:border-gray-500 rounded-lg font-medium transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 p-3 bg-kite-primary hover:bg-kite-secondary rounded-lg font-medium transition disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Add Agent'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="text-center space-y-6">
            <div className="text-6xl">🪁</div>
            <h2 className="text-2xl font-semibold">Agent Added!</h2>
            <p className="text-gray-400">
              <strong className="text-white">{formData.name}</strong> is now linked to your wallet.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="block w-full px-6 py-3 bg-kite-primary hover:bg-kite-secondary rounded-lg font-medium transition"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => router.push('/marketplace')}
                className="block w-full px-6 py-3 border border-gray-700 hover:border-gray-500 rounded-lg font-medium transition"
              >
                Add Knowledge →
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

export default function NewAgentPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="animate-spin text-4xl mb-4">🪁</div>
        <p className="text-gray-400">Loading...</p>
      </div>
    }>
      <NewAgentContent />
    </Suspense>
  );
}

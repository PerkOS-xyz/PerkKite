'use client';

import { useState } from 'react';
import { RUNTIMES, type RuntimeType } from '@perkkite/shared';

// Kite Portal URL for real agent creation
const KITE_PORTAL_URL = 'https://x402-portal-eight.vercel.app/';

export default function NewAgentPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'general',
    runtimeType: 'nano-claw' as RuntimeType,
    dailyBudget: '5',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate creation delay
    await new Promise(r => setTimeout(r, 1500));
    
    // For MVP: Show success and redirect to Kite Portal
    setStep(4);
    setIsLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Create New Agent</h1>
      <p className="text-gray-400 mb-8">Launch an AI agent with Kite Agent Passport</p>

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
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Agent Details</h2>
            
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-kite-primary outline-none"
                placeholder="My AI Agent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-kite-primary outline-none h-24"
                placeholder="What does your agent do?"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-kite-primary outline-none"
              >
                <option value="general">General</option>
                <option value="defi">DeFi</option>
                <option value="nft">NFT</option>
                <option value="social">Social</option>
                <option value="data">Data</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!formData.name || !formData.description}
              className="w-full p-3 bg-kite-primary hover:bg-kite-secondary rounded-lg font-medium transition disabled:opacity-50"
            >
              Next: Select Runtime
            </button>
          </div>
        )}

        {/* Step 2: Runtime Selection */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Select Runtime</h2>
            
            <div className="grid gap-4">
              {Object.values(RUNTIMES).map((runtime) => (
                <label
                  key={runtime.id}
                  className={`p-4 border rounded-lg cursor-pointer transition ${
                    formData.runtimeType === runtime.id
                      ? 'border-kite-primary bg-kite-primary/10'
                      : 'border-gray-700 hover:border-gray-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="runtime"
                    value={runtime.id}
                    checked={formData.runtimeType === runtime.id}
                    onChange={(e) => setFormData({ ...formData, runtimeType: e.target.value as RuntimeType })}
                    className="sr-only"
                  />
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{runtime.name}</h3>
                      <p className="text-sm text-gray-400">{runtime.description}</p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <div>{runtime.resources.cpu}</div>
                      <div>{runtime.resources.memory}</div>
                    </div>
                  </div>
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
                Next: Spending Rules
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Spending Rules */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Spending Rules</h2>
            <p className="text-gray-400">Set limits for your agent&apos;s transactions</p>

            <div>
              <label className="block text-sm font-medium mb-2">Daily Budget (USDC)</label>
              <input
                type="number"
                value={formData.dailyBudget}
                onChange={(e) => setFormData({ ...formData, dailyBudget: e.target.value })}
                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-kite-primary outline-none"
                min="1"
                step="1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Maximum amount your agent can spend per 24 hours
              </p>
            </div>

            <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
              <h3 className="font-medium mb-2">🔐 Kite Agent Passport</h3>
              <p className="text-sm text-gray-400">
                Your agent will receive a smart contract wallet with programmable 
                spending rules enforced on-chain. You maintain full control and can 
                revoke access at any time.
              </p>
            </div>

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
                {isLoading ? 'Creating...' : 'Create Agent'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="text-center space-y-6">
            <div className="text-6xl">🪁</div>
            <h2 className="text-2xl font-semibold">Agent Ready!</h2>
            <p className="text-gray-400">
              Your agent <strong className="text-white">{formData.name}</strong> configuration is ready.
            </p>
            
            <div className="p-4 bg-gray-900 rounded-lg border border-gray-700 text-left">
              <h3 className="font-medium mb-3">📋 Agent Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Name:</span>
                  <span>{formData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Category:</span>
                  <span className="capitalize">{formData.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Runtime:</span>
                  <span>{RUNTIMES[formData.runtimeType]?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Daily Budget:</span>
                  <span>{formData.dailyBudget} USDC</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <a
                href={KITE_PORTAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-6 py-3 bg-kite-primary hover:bg-kite-secondary rounded-lg font-medium transition"
              >
                Complete Setup in Kite Portal →
              </a>
              <a
                href="/dashboard"
                className="block w-full px-6 py-3 border border-gray-700 hover:border-gray-500 rounded-lg font-medium transition"
              >
                Go to Dashboard
              </a>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

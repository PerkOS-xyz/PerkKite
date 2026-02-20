'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { DeploymentStep, LaunchedAgent } from '@/lib/launched-agents';

const KITE_PORTAL_URL = 'https://x402-portal-eight.vercel.app/';

const TEMPLATES = [
  { id: 'defi-trader',      icon: '📈', name: 'DeFi Trader',       desc: 'Yield optimization, token swaps, DEX aggregation, portfolio tracking', specialty: 'defi' },
  { id: 'nft-collector',    icon: '🖼️', name: 'NFT Collector',     desc: 'Floor price tracking, rarity analysis, marketplace navigation', specialty: 'nft' },
  { id: 'research-analyst', icon: '🔬', name: 'Research Analyst',   desc: 'Protocol docs, tokenomics evaluation, market research, whitepaper analysis', specialty: 'research' },
  { id: 'security-auditor', icon: '🛡️', name: 'Security Auditor',  desc: 'Smart contract analysis, rug detection, risk assessment, audit reports', specialty: 'security' },
  { id: 'social-manager',   icon: '📱', name: 'Social Manager',     desc: 'Twitter/X monitoring, Farcaster integration, community management', specialty: 'social' },
  { id: 'dao-delegate',     icon: '🏛️', name: 'DAO Delegate',      desc: 'Governance proposals, voting analysis, delegate tracking, deadline monitoring', specialty: 'governance' },
];

const AWS_REGIONS = [
  { id: 'us-east-1', name: 'US East (N. Virginia)' },
  { id: 'us-west-2', name: 'US West (Oregon)' },
  { id: 'eu-west-1', name: 'EU (Ireland)' },
  { id: 'ap-southeast-1', name: 'Asia Pacific (Singapore)' },
];

export default function LaunchPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(1);

  // Step 1: Template
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Step 2: Configuration
  const [agentName, setAgentName] = useState('');
  const [clientId, setClientId] = useState('');
  const [uniswapApiKey, setUniswapApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Step 3: SSH & AWS
  const [awsRegion, setAwsRegion] = useState('us-east-1');
  const [sshKeys, setSshKeys] = useState<{ publicKey: string; privateKeyPem: string; fingerprint: string } | null>(null);
  const [generatingKeys, setGeneratingKeys] = useState(false);
  const [keyDownloaded, setKeyDownloaded] = useState(false);

  // Step 5: Deployment
  const [launchedAgentId, setLaunchedAgentId] = useState<string | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<LaunchedAgent | null>(null);
  const [deploying, setDeploying] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pre-fill from URL params (coming from dashboard)
  useEffect(() => {
    const paramClientId = searchParams.get('clientId');
    const paramName = searchParams.get('name');
    if (paramClientId) setClientId(paramClientId);
    if (paramName) setAgentName(paramName);
  }, [searchParams]);

  // Pre-fill name from template
  useEffect(() => {
    if (selectedTemplate) {
      const tmpl = TEMPLATES.find(t => t.id === selectedTemplate);
      if (tmpl && !agentName) setAgentName(tmpl.name);
    }
  }, [selectedTemplate, agentName]);

  // Poll deployment status
  const startPolling = useCallback((id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/launch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'status', launchedAgentId: id }),
        });
        if (res.ok) {
          const data = await res.json();
          setDeploymentStatus(data.launchedAgent);
          if (data.launchedAgent.status === 'active' || data.launchedAgent.status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current);
            if (data.launchedAgent.status === 'active') {
              setTimeout(() => setStep(6), 500);
            }
          }
        }
      } catch { /* continue polling */ }
    }, 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // --- Handlers ---

  const handleGenerateKeys = async () => {
    setGeneratingKeys(true);
    try {
      const res = await fetch('/api/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_keys', agentName }),
      });
      const data = await res.json();
      setSshKeys(data);
    } catch (e) {
      console.error('Key generation failed:', e);
    } finally {
      setGeneratingKeys(false);
    }
  };

  const handleDownloadKey = () => {
    if (!sshKeys) return;
    const blob = new Blob([sshKeys.privateKeyPem], { type: 'application/x-pem-file' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `perkkite-${agentName.toLowerCase().replace(/\s+/g, '-')}.pem`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setKeyDownloaded(true);
  };

  const handleDeploy = async () => {
    if (!address || !selectedTemplate || !agentName || !clientId) return;
    setDeploying(true);
    setStep(5);

    try {
      const res = await fetch('/api/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deploy',
          agentName,
          templateId: selectedTemplate,
          clientId,
          walletAddress: address,
          uniswapApiKey: uniswapApiKey || undefined,
          awsRegion,
          sshPublicKey: sshKeys?.publicKey,
          sshKeyFingerprint: sshKeys?.fingerprint || '',
        }),
      });

      const data = await res.json();
      setLaunchedAgentId(data.launchedAgentId);
      startPolling(data.launchedAgentId);
    } catch (e) {
      console.error('Deploy failed:', e);
    } finally {
      setDeploying(false);
    }
  };

  // --- Helpers ---

  const selectedTmpl = TEMPLATES.find(t => t.id === selectedTemplate);

  const getStepDotStyle = (s: DeploymentStep) => {
    switch (s.status) {
      case 'completed': return 'bg-green-400';
      case 'running': return 'bg-yellow-400 animate-pulse';
      case 'failed': return 'bg-red-400';
      default: return 'bg-gray-600';
    }
  };

  const getStepIcon = (s: DeploymentStep) => {
    const icons: Record<string, string> = {
      provisioning: '🖥️', installing_node: '📦', installing_oc: '🦞',
      writing_config: '⚙️', installing_skill: '🪁', setting_env: '🔧',
      starting_daemon: '🚀', health_check: '✅',
    };
    return icons[s.step] || '📋';
  };

  // --- Not connected ---
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl mb-4">🚀</p>
          <h2 className="text-2xl font-bold mb-2">Agent Launcher</h2>
          <p className="text-gray-400">Connect your wallet to launch OpenClaw agents</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition">
            ← Dashboard
          </Link>
          <h1 className="text-3xl font-bold mt-2">Launch OpenClaw Agent</h1>
          <p className="text-gray-400 mt-1">Deploy an autonomous agent to EC2 with MCP + Uniswap</p>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-1.5 mb-8">
          {[1, 2, 3, 4, 5, 6].map(s => (
            <div
              key={s}
              className={`h-2 flex-1 rounded ${s <= step ? 'bg-kite-primary' : 'bg-gray-700'}`}
            />
          ))}
        </div>

        {/* Step 1: Template Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Select Agent Template</h2>
            <p className="text-sm text-gray-400">Choose the type of autonomous agent to deploy</p>

            <div className="grid grid-cols-2 gap-4">
              {TEMPLATES.map(tmpl => (
                <button
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl.id)}
                  className={`p-4 rounded-xl border text-left transition ${
                    selectedTemplate === tmpl.id
                      ? 'border-kite-primary bg-kite-primary/10'
                      : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                  }`}
                >
                  <div className="text-2xl mb-2">{tmpl.icon}</div>
                  <h3 className="font-medium">{tmpl.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tmpl.desc}</p>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!selectedTemplate}
              className="w-full p-3 bg-kite-primary hover:bg-kite-primary/80 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next: Configure Agent
            </button>
          </div>
        )}

        {/* Step 2: Agent Configuration */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Configure Agent</h2>

            {selectedTmpl && (
              <div className="p-3 bg-kite-primary/10 border border-kite-primary/30 rounded-lg flex items-center gap-3">
                <span className="text-2xl">{selectedTmpl.icon}</span>
                <div>
                  <p className="font-medium text-sm">{selectedTmpl.name}</p>
                  <p className="text-xs text-gray-400">{selectedTmpl.desc}</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Agent Name</label>
              <input
                value={agentName}
                onChange={e => setAgentName(e.target.value)}
                placeholder="My Trading Agent"
                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-kite-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Kite Client ID</label>
              <input
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                placeholder="client_agent_yCQRgvatvJD4sQWiVn7vmtjN"
                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-kite-primary focus:outline-none font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get this from the{' '}
                <a href={KITE_PORTAL_URL} target="_blank" rel="noopener noreferrer" className="text-kite-primary hover:underline">
                  Kite Portal
                </a>
                {' '}→ Agents → MCP Config
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Uniswap API Key (Optional)</label>
              <div className="relative">
                <input
                  value={uniswapApiKey}
                  onChange={e => setUniswapApiKey(e.target.value)}
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="Your Uniswap Trading API key"
                  className="w-full p-3 pr-16 bg-gray-900 border border-gray-700 rounded-lg focus:border-kite-primary focus:outline-none font-mono text-sm"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white"
                >
                  {showApiKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enables Uniswap swap quotes and execution. Get one at hub.uniswap.org
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 p-3 border border-gray-700 hover:border-gray-500 rounded-lg font-medium transition"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!agentName.trim() || !clientId.trim()}
                className="flex-1 p-3 bg-kite-primary hover:bg-kite-primary/80 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: AWS Setup
              </button>
            </div>
          </div>
        )}

        {/* Step 3: SSH Key Generation & AWS Region */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">AWS & SSH Setup</h2>

            <div>
              <label className="block text-sm font-medium mb-2">AWS Region</label>
              <select
                value={awsRegion}
                onChange={e => setAwsRegion(e.target.value)}
                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-kite-primary focus:outline-none"
              >
                {AWS_REGIONS.map(r => (
                  <option key={r.id} value={r.id}>{r.name} ({r.id})</option>
                ))}
              </select>
            </div>

            <div className="p-4 bg-gray-900 rounded-xl border border-gray-700">
              <h3 className="font-medium mb-3">SSH Key Pair</h3>

              {!sshKeys ? (
                <div>
                  <p className="text-sm text-gray-400 mb-3">
                    Generate an SSH key pair for secure access to your EC2 instance. The private key will be available for download once.
                  </p>
                  <button
                    onClick={handleGenerateKeys}
                    disabled={generatingKeys}
                    className="w-full p-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg font-medium transition disabled:opacity-50"
                  >
                    {generatingKeys ? 'Generating...' : 'Generate SSH Key Pair'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-green-400">✓</span>
                    <span className="text-gray-300">Key pair generated</span>
                  </div>

                  <div className="p-3 bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Fingerprint</p>
                    <p className="font-mono text-xs text-gray-300">{sshKeys.fingerprint}</p>
                  </div>

                  <button
                    onClick={handleDownloadKey}
                    className={`w-full p-3 rounded-lg font-medium transition ${
                      keyDownloaded
                        ? 'bg-green-900/30 border border-green-700 text-green-400'
                        : 'bg-kite-primary hover:bg-kite-primary/80'
                    }`}
                  >
                    {keyDownloaded ? '✓ Private Key Downloaded' : 'Download Private Key (.pem)'}
                  </button>

                  <div className="p-3 bg-yellow-900/20 border border-yellow-800/50 rounded-lg">
                    <p className="text-xs text-yellow-400">
                      Save this key securely. PerkKite does not store your private key. You will need it to SSH into your instance.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(2)}
                className="flex-1 p-3 border border-gray-700 hover:border-gray-500 rounded-lg font-medium transition"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!sshKeys || !keyDownloaded}
                className="flex-1 p-3 bg-kite-primary hover:bg-kite-primary/80 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Review
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Deploy */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Review & Deploy</h2>

            <div className="p-4 bg-gray-900 rounded-xl border border-gray-700 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Template</span>
                <span className="flex items-center gap-2">
                  <span>{selectedTmpl?.icon}</span>
                  <span className="font-medium">{selectedTmpl?.name}</span>
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Agent Name</span>
                <span className="font-medium">{agentName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Client ID</span>
                <span className="font-mono text-xs">{clientId.slice(0, 24)}...</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">AWS Region</span>
                <span>{AWS_REGIONS.find(r => r.id === awsRegion)?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">SSH Key</span>
                <span className="font-mono text-xs">{sshKeys?.fingerprint.slice(0, 20)}...</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Uniswap API Key</span>
                <span>{uniswapApiKey ? '••••••••' : 'Not provided'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Wallet</span>
                <span className="font-mono text-xs">{address?.slice(0, 10)}...</span>
              </div>
            </div>

            <div className="p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
              <h3 className="font-medium text-blue-300 text-sm mb-2">What happens next</h3>
              <p className="text-xs text-blue-200/70">
                PerkKite&apos;s orchestration agent will deploy an OpenClaw agent to an EC2 Ubuntu instance.
                It will install Node.js, OpenClaw, configure MCP to connect back to PerkKite, add the Uniswap skill,
                and start the agent daemon. The agent will have access to all 8 PerkKite tools and can communicate
                with your other agents.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(3)}
                className="flex-1 p-3 border border-gray-700 hover:border-gray-500 rounded-lg font-medium transition"
              >
                Back
              </button>
              <button
                onClick={handleDeploy}
                disabled={deploying}
                className="flex-1 p-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium transition disabled:opacity-50"
              >
                {deploying ? 'Deploying...' : 'Deploy Agent'}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Deployment Progress */}
        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Deploying Agent</h2>
            <p className="text-sm text-gray-400">
              PerkKite orchestration agent is deploying <strong className="text-white">{agentName}</strong>
            </p>

            <div className="p-6 bg-gray-900 rounded-xl border border-gray-700">
              <div className="space-y-4">
                {(deploymentStatus?.deploymentLog || INITIAL_DEPLOYMENT_STEPS).map((s, i) => (
                  <div key={s.step} className="flex items-start gap-4">
                    {/* Timeline connector */}
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${getStepDotStyle(s)}`} />
                      {i < 7 && (
                        <div className={`w-0.5 h-8 mt-1 ${
                          s.status === 'completed' ? 'bg-green-400/30' : 'bg-gray-700'
                        }`} />
                      )}
                    </div>

                    {/* Step content */}
                    <div className="flex-1 -mt-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{getStepIcon(s)}</span>
                        <span className={`text-sm font-medium ${
                          s.status === 'completed' ? 'text-green-400' :
                          s.status === 'running' ? 'text-yellow-400' :
                          s.status === 'failed' ? 'text-red-400' :
                          'text-gray-500'
                        }`}>
                          {s.label}
                        </span>
                        {s.status === 'running' && (
                          <span className="text-xs text-yellow-400/60">working...</span>
                        )}
                      </div>
                      {s.detail && (
                        <p className="text-xs text-gray-500 mt-0.5 ml-6">{s.detail}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {deploymentStatus?.status === 'failed' && (
              <div className="p-4 bg-red-900/20 border border-red-800/50 rounded-lg">
                <p className="text-sm text-red-400">Deployment failed. Check the logs above for details.</p>
                <button
                  onClick={() => { setStep(4); setDeploymentStatus(null); }}
                  className="mt-2 text-sm text-red-300 hover:text-red-200 underline"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 6: Completion */}
        {step === 6 && deploymentStatus && (
          <div className="space-y-6 text-center">
            <div className="text-6xl">{selectedTmpl?.icon || '🚀'}</div>
            <h2 className="text-2xl font-bold">Agent Deployed!</h2>
            <p className="text-gray-400">
              <strong className="text-white">{agentName}</strong> is live and connected to PerkKite
            </p>

            <div className="p-4 bg-gray-900 rounded-xl border border-gray-700 text-left space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Status</span>
                <span className="flex items-center gap-2 text-green-400">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Connected to PerkKite MCP
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Instance ID</span>
                <span className="font-mono text-xs">{deploymentStatus.instanceId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Public IP</span>
                <span className="font-mono text-xs">{deploymentStatus.instanceIp}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Region</span>
                <span>{AWS_REGIONS.find(r => r.id === awsRegion)?.name}</span>
              </div>
            </div>

            <div className="p-3 bg-gray-800 rounded-lg text-left">
              <p className="text-xs text-gray-500 mb-1">SSH Access</p>
              <code className="text-xs text-gray-300 font-mono">
                ssh -i perkkite-{agentName.toLowerCase().replace(/\s+/g, '-')}.pem ubuntu@{deploymentStatus.instanceIp}
              </code>
            </div>

            <div className="space-y-3 pt-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="block w-full px-6 py-3 bg-kite-primary hover:bg-kite-primary/80 rounded-lg font-medium transition"
              >
                View in Dashboard
              </button>
              <button
                onClick={() => {
                  setStep(1);
                  setSelectedTemplate(null);
                  setAgentName('');
                  setClientId('');
                  setUniswapApiKey('');
                  setSshKeys(null);
                  setKeyDownloaded(false);
                  setLaunchedAgentId(null);
                  setDeploymentStatus(null);
                }}
                className="block w-full px-6 py-3 border border-gray-700 hover:border-gray-500 rounded-lg font-medium transition"
              >
                Launch Another Agent
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Fallback steps for initial render before polling starts
const INITIAL_DEPLOYMENT_STEPS: DeploymentStep[] = [
  { step: 'provisioning',    label: 'Creating EC2 Instance',        status: 'running' },
  { step: 'installing_node', label: 'Installing Node.js 20+',       status: 'pending' },
  { step: 'installing_oc',   label: 'Installing OpenClaw',           status: 'pending' },
  { step: 'writing_config',  label: 'Writing OpenClaw Config',       status: 'pending' },
  { step: 'installing_skill',label: 'Installing PerkKite Skill',     status: 'pending' },
  { step: 'setting_env',     label: 'Setting Environment Variables', status: 'pending' },
  { step: 'starting_daemon', label: 'Starting Agent Daemon',         status: 'pending' },
  { step: 'health_check',    label: 'Verifying Connection',          status: 'pending' },
];

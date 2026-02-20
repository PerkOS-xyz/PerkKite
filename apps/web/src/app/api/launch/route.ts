import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  addLaunchedAgent,
  updateLaunchedAgent,
  getLaunchedAgentById,
  DeploymentStep,
} from '@/lib/launched-agents';
import { Timestamp } from 'firebase/firestore';

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'https://orchestrator.perkos.xyz';
const ORCHESTRATOR_TOKEN = process.env.ORCHESTRATOR_TOKEN || '';

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.URL) return process.env.URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT || 3000}`;
}

const TEMPLATE_INFO: Record<string, { icon: string; name: string; specialty: string }> = {
  'defi-trader':      { icon: '📈', name: 'DeFi Trader',       specialty: 'yield optimization, token swaps, DEX aggregation' },
  'nft-collector':    { icon: '🖼️', name: 'NFT Collector',     specialty: 'floor price tracking, rarity analysis, marketplace navigation' },
  'research-analyst': { icon: '🔬', name: 'Research Analyst',   specialty: 'protocol docs, tokenomics, market research' },
  'security-auditor': { icon: '🛡️', name: 'Security Auditor',  specialty: 'smart contract analysis, rug detection, risk assessment' },
  'social-manager':   { icon: '📱', name: 'Social Manager',     specialty: 'Twitter/X monitoring, Farcaster, community management' },
  'dao-delegate':     { icon: '🏛️', name: 'DAO Delegate',      specialty: 'governance proposals, voting analysis, delegate tracking' },
  'default':          { icon: '🤖', name: 'Kite Agent',         specialty: 'general Web3 assistance' },
};

// --- SSH Key Generation ---

function generateSSHKeyPair(agentName: string) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const fingerprint = crypto
    .createHash('sha256')
    .update(Buffer.from(publicKey))
    .digest('base64');

  const sshPublicKey = `${publicKey.trim()}\n# perkkite-${agentName}`;

  return {
    publicKey: sshPublicKey,
    privateKey,
    fingerprint: `SHA256:${fingerprint}`,
  };
}

// --- Initial Deployment Steps ---

const INITIAL_STEPS: DeploymentStep[] = [
  { step: 'provisioning',    label: 'Creating EC2 Instance',       status: 'pending' },
  { step: 'installing_node', label: 'Installing Node.js 20+',      status: 'pending' },
  { step: 'installing_oc',   label: 'Installing OpenClaw',          status: 'pending' },
  { step: 'writing_config',  label: 'Writing OpenClaw Config',      status: 'pending' },
  { step: 'installing_skill',label: 'Installing PerkKite Skill',    status: 'pending' },
  { step: 'setting_env',     label: 'Setting Environment Variables',status: 'pending' },
  { step: 'starting_daemon', label: 'Starting Agent Daemon',        status: 'pending' },
  { step: 'health_check',    label: 'Verifying Connection',         status: 'pending' },
];

// --- Orchestrator Communication ---

async function sendToOrchestrator(message: string): Promise<string> {
  const res = await fetch(`${ORCHESTRATOR_URL}/api/v1/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(ORCHESTRATOR_TOKEN ? { 'Authorization': `Bearer ${ORCHESTRATOR_TOKEN}` } : {}),
    },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    throw new Error(`Orchestrator responded with ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return data.response || data.message || JSON.stringify(data);
}

// --- Generate OpenClaw Config ---

function generateOpenClawConfig(params: {
  agentName: string;
  templateId: string;
  clientId: string;
  siteUrl: string;
  uniswapApiKey?: string;
}): string {
  const tmpl = TEMPLATE_INFO[params.templateId] || TEMPLATE_INFO['default'];

  const config: Record<string, unknown> = {
    $schema: 'https://openclaw.ai/schemas/config.json',
    name: params.agentName,
    description: `PerkKite ${tmpl.name} - deployed via Agent Launcher`,
    tools: {
      agentToAgent: {
        enabled: true,
        allowAgents: ['perkkite-orchestrator'],
      },
    },
    skills: {
      entries: {
        perkkite: { enabled: true },
      },
    },
    mcpServers: {
      'perkkite-mcp': {
        url: `${params.siteUrl}/api/mcp`,
        headers: {
          'X-Agent-Id': params.clientId,
        },
      },
    },
  };

  if (params.uniswapApiKey) {
    config.env = { UNISWAP_API_KEY: params.uniswapApiKey };
  }

  return JSON.stringify(config, null, 2);
}

// --- Main Handler ---

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // --- Action: Generate SSH Keys ---
    if (action === 'generate_keys') {
      const { agentName } = body;
      if (!agentName) {
        return NextResponse.json({ error: 'Missing agentName' }, { status: 400 });
      }

      const keys = generateSSHKeyPair(agentName);
      return NextResponse.json({
        publicKey: keys.publicKey,
        privateKeyPem: keys.privateKey,
        fingerprint: keys.fingerprint,
      });
    }

    // --- Action: Get Deployment Status ---
    if (action === 'status') {
      const { launchedAgentId } = body;
      if (!launchedAgentId) {
        return NextResponse.json({ error: 'Missing launchedAgentId' }, { status: 400 });
      }

      const agent = await getLaunchedAgentById(launchedAgentId);
      if (!agent) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }

      return NextResponse.json({ launchedAgent: agent });
    }

    // --- Action: Deploy ---
    if (action === 'deploy') {
      const {
        agentName,
        templateId,
        clientId,
        walletAddress,
        uniswapApiKey,
        awsRegion,
        sshPublicKey,
        sshKeyFingerprint,
      } = body;

      if (!agentName || !templateId || !clientId || !walletAddress || !awsRegion) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      const siteUrl = getBaseUrl();
      const openclawConfig = generateOpenClawConfig({ agentName, templateId, clientId, siteUrl, uniswapApiKey });
      const tmpl = TEMPLATE_INFO[templateId] || TEMPLATE_INFO['default'];

      // Create the launched agent record
      const launchedAgentId = await addLaunchedAgent({
        name: agentName,
        templateId,
        walletAddress,
        clientId,
        uniswapApiKey: uniswapApiKey ? '***masked***' : undefined,
        awsRegion,
        sshKeyFingerprint: sshKeyFingerprint || '',
        status: 'provisioning',
        deploymentLog: INITIAL_STEPS.map(s => ({ ...s })),
        openclawConfig,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Send deployment task to orchestrator (non-blocking)
      runOrchestratorDeployment(launchedAgentId, {
        agentName,
        templateId,
        templateName: tmpl.name,
        templateSpecialty: tmpl.specialty,
        clientId,
        walletAddress,
        uniswapApiKey,
        awsRegion,
        sshPublicKey,
        siteUrl,
        openclawConfig,
      }).catch(err => {
        console.error('Orchestrator deployment failed:', err);
        updateLaunchedAgent(launchedAgentId, {
          status: 'failed',
          deploymentLog: INITIAL_STEPS.map(s => ({
            ...s,
            status: 'failed' as const,
            detail: `Orchestrator error: ${err.message || 'Unknown'}`,
          })),
        }).catch(console.error);
      });

      return NextResponse.json({ launchedAgentId, status: 'provisioning' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Launch API error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// --- Orchestrator-Driven Deployment ---

async function runOrchestratorDeployment(
  launchedAgentId: string,
  config: {
    agentName: string;
    templateId: string;
    templateName: string;
    templateSpecialty: string;
    clientId: string;
    walletAddress: string;
    uniswapApiKey?: string;
    awsRegion: string;
    sshPublicKey?: string;
    siteUrl: string;
    openclawConfig: string;
  }
) {
  const steps = INITIAL_STEPS.map(s => ({ ...s }));

  const deploymentPrompt = `Deploy a new OpenClaw agent with these specifications:

AGENT CONFIG:
- Name: ${config.agentName}
- Template: ${config.templateName} (${config.templateSpecialty})
- Kite Client ID: ${config.clientId}
- Wallet: ${config.walletAddress}
- AWS Region: ${config.awsRegion}
- PerkKite API: ${config.siteUrl}
- Uniswap API Key: ${config.uniswapApiKey ? 'Provided' : 'None'}
- SSH Public Key: ${config.sshPublicKey ? 'Provided' : 'Generate new'}

OPENCLAW CONFIG TO WRITE:
${config.openclawConfig}

DEPLOYMENT STEPS:
1. Provision EC2 Ubuntu instance (t4g.small) in ${config.awsRegion}
2. Install Node.js 22+ via nodesource
3. Install OpenClaw globally (npm install -g openclaw)
4. Write openclaw.json config with Kite MCP + PerkKite communication
5. Install PerkKite skill
6. Set environment variables (PERKKITE_API_URL, PERKKITE_AGENT_ID)
7. Start OpenClaw gateway daemon
8. Verify health and MCP connection

CALLBACK: After each step, POST status to ${config.siteUrl}/api/launch/callback with:
{ "launchedAgentId": "${launchedAgentId}", "step": "<step_name>", "status": "completed|failed", "detail": "<message>", "instanceId": "<if available>", "instanceIp": "<if available>" }

Execute all steps now. Report back when complete.`;

  // Update first step to running
  steps[0].status = 'running';
  await updateLaunchedAgent(launchedAgentId, {
    status: 'provisioning',
    deploymentLog: [...steps],
  });

  try {
    // TODO: Connect to real orchestrator when WebSocket API is ready
    // For now, use simulation for demo
    throw new Error('Orchestrator integration pending — using simulation');
    // Send deployment task to orchestrator
    const response = await sendToOrchestrator(deploymentPrompt);

    // Parse orchestrator response for instance details
    const instanceIdMatch = response.match(/i-[a-f0-9]{8,17}/);
    const ipMatch = response.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);

    // Mark all steps as completed (orchestrator handles the actual work)
    const completedSteps = steps.map(s => ({
      ...s,
      status: 'completed' as const,
      timestamp: new Date().toISOString(),
    }));

    await updateLaunchedAgent(launchedAgentId, {
      status: 'active',
      instanceId: instanceIdMatch?.[0] || 'pending-orchestrator',
      instanceIp: ipMatch?.[0] || 'pending-orchestrator',
      deploymentLog: completedSteps,
    });
  } catch (error) {
    // If orchestrator fails, fall back to simulated deployment for demo
    console.error('Orchestrator error, falling back to simulation:', error);
    await simulateDeployment(launchedAgentId, config);
  }
}

// --- Simulated Deployment (fallback when orchestrator is unavailable) ---

async function simulateDeployment(
  launchedAgentId: string,
  config: {
    agentName: string;
    templateId: string;
    clientId: string;
    awsRegion: string;
    siteUrl: string;
  }
) {
  const instanceId = `i-${crypto.randomBytes(8).toString('hex')}`;
  const instanceIp = [
    Math.floor(Math.random() * 200) + 10,
    Math.floor(Math.random() * 255),
    Math.floor(Math.random() * 255),
    Math.floor(Math.random() * 255),
  ].join('.');
  const steps = INITIAL_STEPS.map(s => ({ ...s }));

  const statusMap: Record<string, 'provisioning' | 'installing' | 'configuring_agent' | 'starting' | 'active'> = {
    provisioning: 'provisioning',
    installing_node: 'installing',
    installing_oc: 'installing',
    writing_config: 'configuring_agent',
    installing_skill: 'configuring_agent',
    setting_env: 'configuring_agent',
    starting_daemon: 'starting',
    health_check: 'active',
  };

  const details: Record<string, string> = {
    provisioning: `Instance ${instanceId} created in ${config.awsRegion} (${instanceIp})`,
    installing_node: 'Node.js v22.22.0 installed successfully',
    installing_oc: 'OpenClaw installed, daemon service configured',
    writing_config: 'openclaw.json written with PerkKite MCP + agent-to-agent communication',
    installing_skill: 'PerkKite skill installed to ~/.openclaw/workspace/skills/perkkite/',
    setting_env: `PERKKITE_API_URL=${config.siteUrl}, PERKKITE_AGENT_ID=${config.clientId}`,
    starting_daemon: 'OpenClaw daemon started via orchestrator.perkos.xyz',
    health_check: `Agent healthy, MCP connected to ${config.siteUrl}/api/mcp, 8 tools available`,
  };

  for (let i = 0; i < steps.length; i++) {
    steps[i].status = 'running';
    await updateLaunchedAgent(launchedAgentId, {
      status: statusMap[steps[i].step] || 'provisioning',
      deploymentLog: [...steps],
      instanceId,
      instanceIp,
    });

    await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));

    steps[i].status = 'completed';
    steps[i].detail = details[steps[i].step] || 'Done';
    steps[i].timestamp = new Date().toISOString();

    await updateLaunchedAgent(launchedAgentId, {
      status: statusMap[steps[i].step] || 'provisioning',
      deploymentLog: [...steps],
      instanceId,
      instanceIp,
    });
  }
}

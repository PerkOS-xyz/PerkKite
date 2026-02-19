import { Router } from 'express';
import type { Agent, CreateAgentInput } from '@perkkite/shared';
import { createAgentWallet, getAgentVaultInfo, KITE_ADDRESSES } from '../services/kite';

export const agentsRouter = Router();

// In-memory store (replace with Firestore in production)
const agents: Map<string, Agent> = new Map();

// GET /api/agents - List user agents
agentsRouter.get('/', async (req, res) => {
  const userAddress = req.headers['x-wallet-address'] as string;
  
  const userAgents = Array.from(agents.values())
    .filter(a => a.userId === userAddress);
  
  res.json({ agents: userAgents });
});

// POST /api/agents - Create agent with AA wallet
agentsRouter.post('/', async (req, res) => {
  try {
    const input: CreateAgentInput = req.body;
    const userAddress = req.headers['x-wallet-address'] as string;
    
    if (!userAddress) {
      return res.status(401).json({ error: 'Wallet address required' });
    }
    
    // Create AA wallet for the agent
    const walletResult = await createAgentWallet(userAddress, false);
    
    const agent: Agent = {
      id: `agent_${Date.now()}`,
      userId: userAddress,
      name: input.name,
      description: input.description,
      category: input.category,
      status: 'draft',
      walletAddress: userAddress,
      runtimeType: input.runtimeType,
      createdAt: new Date(),
      updatedAt: new Date(),
      // @ts-ignore - extended fields
      aaWalletAddress: walletResult.aaWalletAddress,
    };
    
    agents.set(agent.id, agent);
    
    res.status(201).json({ 
      agent,
      kiteAddresses: KITE_ADDRESSES,
    });
  } catch (error) {
    console.error('Create agent error:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

// GET /api/agents/:id - Get agent details
agentsRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  const agent = agents.get(id);
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  res.json({ agent });
});

// POST /api/agents/:id/vault - Deploy vault for agent
agentsRouter.post('/:id/vault', async (req, res) => {
  try {
    const { id } = req.params;
    const { signature } = req.body; // Pre-signed message from client
    
    const agent = agents.get(id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // For demo: return placeholder (real impl needs signature handling)
    res.json({ 
      message: 'Vault deployment requires client-side signing',
      agent,
      instructions: {
        step1: 'Call getAAWalletAddress(signerAddress) on client',
        step2: 'Sign the vault deployment UserOp',
        step3: 'Submit via sendUserOperationAndWait',
      }
    });
  } catch (error) {
    console.error('Deploy vault error:', error);
    res.status(500).json({ error: 'Failed to deploy vault' });
  }
});

// GET /api/agents/:id/vault - Get vault info
agentsRouter.get('/:id/vault', async (req, res) => {
  try {
    const { id } = req.params;
    const agent = agents.get(id);
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // @ts-ignore
    const vaultAddress = agent.vaultAddress;
    if (!vaultAddress) {
      return res.json({ vault: null, message: 'No vault deployed' });
    }
    
    const vaultInfo = await getAgentVaultInfo(vaultAddress);
    res.json({ vault: vaultInfo });
  } catch (error) {
    console.error('Get vault error:', error);
    res.status(500).json({ error: 'Failed to get vault info' });
  }
});

// DELETE /api/agents/:id - Delete agent
agentsRouter.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const deleted = agents.delete(id);
  
  res.json({ deleted, id });
});

import { Router } from 'express';
import type { Agent, CreateAgentInput } from '@perkkite/shared';

export const agentsRouter = Router();

// GET /api/agents - List user agents
agentsRouter.get('/', async (_req, res) => {
  // TODO: Get from Firestore
  const agents: Agent[] = [];
  res.json({ agents });
});

// POST /api/agents - Create agent
agentsRouter.post('/', async (req, res) => {
  const input: CreateAgentInput = req.body;
  
  // TODO: Create in Firestore + register with Kite
  const agent: Partial<Agent> = {
    id: `agent_${Date.now()}`,
    name: input.name,
    description: input.description,
    status: 'draft',
  };
  
  res.status(201).json({ agent });
});

// GET /api/agents/:id - Get agent
agentsRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  // TODO: Get from Firestore
  res.json({ agent: null, message: `Agent ${id} not found` });
});

// DELETE /api/agents/:id - Delete agent
agentsRouter.delete('/:id', async (req, res) => {
  const { id } = req.params;
  // TODO: Delete from Firestore
  res.json({ deleted: true, id });
});

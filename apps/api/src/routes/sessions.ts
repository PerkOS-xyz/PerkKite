import { Router } from 'express';
import type { Session, CreateSessionInput } from '@perkkite/shared';

export const sessionsRouter = Router();

// GET /api/sessions - List sessions
sessionsRouter.get('/', async (_req, res) => {
  // TODO: Get from Firestore
  const sessions: Session[] = [];
  res.json({ sessions });
});

// POST /api/sessions - Create session (Kite Passport)
sessionsRouter.post('/', async (req, res) => {
  const input: CreateSessionInput = req.body;
  
  // TODO: Create session with Kite Passport API
  const session: Partial<Session> = {
    id: `session_${Date.now()}`,
    agentId: input.agentId,
    maxSpend: input.maxSpend,
    status: 'active',
  };
  
  res.status(201).json({ session });
});

// GET /api/sessions/:id - Get session
sessionsRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  res.json({ session: null, message: `Session ${id} not found` });
});

// DELETE /api/sessions/:id - Revoke session
sessionsRouter.delete('/:id', async (req, res) => {
  const { id } = req.params;
  // TODO: Revoke via Kite Passport
  res.json({ revoked: true, id });
});

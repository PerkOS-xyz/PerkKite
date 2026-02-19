import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { agentsRouter } from './routes/agents';
import { sessionsRouter } from './routes/sessions';
import { vaultsRouter } from './routes/vaults';

export const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'perkkite-api' });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/vaults', vaultsRouter);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

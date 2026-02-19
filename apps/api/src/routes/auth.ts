import { Router } from 'express';

export const authRouter = Router();

// POST /api/auth/verify - Verify wallet signature
authRouter.post('/verify', async (req, res) => {
  const { address, signature, message } = req.body;
  
  // TODO: Implement EIP-712 signature verification
  res.json({ 
    verified: true, 
    address,
    message: 'Signature verification not yet implemented'
  });
});

// POST /api/auth/session - Create session token
authRouter.post('/session', async (req, res) => {
  const { address } = req.body;
  
  // TODO: Create JWT session
  res.json({ 
    token: 'placeholder-token',
    address,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  });
});

import { Router } from 'express';
import { getAAClient, getAgentVaultInfo, KITE_ADDRESSES } from '../services/kite';

export const vaultsRouter = Router();

// GET /api/vaults/config - Get Kite configuration
vaultsRouter.get('/config', async (_req, res) => {
  res.json({
    addresses: KITE_ADDRESSES,
    network: 'kite_testnet',
    rpcUrl: process.env.KITE_RPC_URL || 'https://rpc-testnet.gokite.ai',
    bundlerUrl: process.env.KITE_BUNDLER_URL || 'https://bundler-service.staging.gokite.ai/rpc/',
  });
});

// POST /api/vaults/aa-address - Get AA wallet address
vaultsRouter.post('/aa-address', async (req, res) => {
  try {
    const { signerAddress } = req.body;
    
    if (!signerAddress) {
      return res.status(400).json({ error: 'signerAddress required' });
    }
    
    const client = getAAClient();
    const aaWalletAddress = await client.getAAWalletAddress(signerAddress);
    
    res.json({ 
      signerAddress,
      aaWalletAddress,
    });
  } catch (error) {
    console.error('Get AA address error:', error);
    res.status(500).json({ error: 'Failed to get AA address' });
  }
});

// GET /api/vaults/:address - Get vault details
vaultsRouter.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    const vaultInfo = await getAgentVaultInfo(address);
    
    res.json({
      address,
      ...vaultInfo,
      formattedRules: vaultInfo.rules.map(r => ({
        timeWindowHours: Number(r.timeWindow) / 3600,
        budgetFormatted: (Number(r.budget) / 1e18).toFixed(2),
        targetProviders: r.targetProviders,
      })),
    });
  } catch (error) {
    console.error('Get vault error:', error);
    res.status(500).json({ error: 'Failed to get vault info' });
  }
});

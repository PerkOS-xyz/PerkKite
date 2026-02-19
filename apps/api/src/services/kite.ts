import { KiteAAClient, KITE_ADDRESSES, type SpendingRule } from '@perkkite/kite-sdk';

// Kite Testnet Configuration
const KITE_CONFIG = {
  apiKey: process.env.KITE_API_KEY || '',
  apiUrl: process.env.KITE_API_URL || 'https://api.gokite.ai',
  chainId: parseInt(process.env.KITE_CHAIN_ID || '2368'),
  rpcUrl: process.env.KITE_RPC_URL || 'https://rpc-testnet.gokite.ai',
  bundlerUrl: process.env.KITE_BUNDLER_URL || 'https://bundler-service.staging.gokite.ai/rpc/',
};

// Singleton AA client
let aaClient: KiteAAClient | null = null;

export function getAAClient(): KiteAAClient {
  if (!aaClient) {
    aaClient = new KiteAAClient(KITE_CONFIG);
  }
  return aaClient;
}

export interface CreateAgentWalletResult {
  aaWalletAddress: string;
  vaultAddress?: string;
  txHash?: string;
}

/**
 * Create an AA wallet and optionally deploy a vault for an agent
 */
export async function createAgentWallet(
  signerAddress: string,
  deployVault: boolean = false,
  signFunction?: (hash: string) => Promise<string>
): Promise<CreateAgentWalletResult> {
  const client = getAAClient();
  
  // Get AA wallet address (deterministic, no tx needed)
  const aaWalletAddress = await client.getAAWalletAddress(signerAddress);
  
  const result: CreateAgentWalletResult = { aaWalletAddress };
  
  // Deploy vault if requested and sign function provided
  if (deployVault && signFunction) {
    const vaultResult = await client.deployAgentVault(signerAddress, signFunction);
    result.vaultAddress = vaultResult.vaultAddress;
    result.txHash = vaultResult.txHash;
  }
  
  return result;
}

/**
 * Set spending rules for an agent vault
 */
export async function setAgentSpendingRules(
  signerAddress: string,
  vaultAddress: string,
  dailyBudget: string,  // in token units (e.g., "100")
  signFunction: (hash: string) => Promise<string>
): Promise<{ txHash: string }> {
  const client = getAAClient();
  
  const rules: SpendingRule[] = [{
    timeWindow: BigInt(86400),  // 24 hours
    budget: BigInt(Math.floor(parseFloat(dailyBudget) * 1e18)),
    initialWindowStartTime: BigInt(Math.floor(Date.now() / 1000)),
    targetProviders: [],  // no restrictions
  }];
  
  return client.setSpendingRules(signerAddress, vaultAddress, rules, signFunction);
}

/**
 * Get agent vault info
 */
export async function getAgentVaultInfo(vaultAddress: string) {
  const client = getAAClient();
  
  const [rules, balance] = await Promise.all([
    client.getSpendingRules(vaultAddress),
    client.getVaultBalance(vaultAddress),
  ]);
  
  return { rules, balance };
}

export { KITE_ADDRESSES };

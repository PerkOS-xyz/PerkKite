export interface KiteConfig {
  // Kite MCP
  mcpUrl?: string;
  clientId?: string;
  
  // x402 Facilitator
  facilitatorUrl?: string;
  
  // Chain config (optional, defaults to testnet)
  chainId?: number;
  rpcUrl?: string;
  
  // Legacy (for backwards compat)
  apiKey?: string;
  apiUrl?: string;
  bundlerUrl?: string;
}

export interface PassportSession {
  id: string;
  userId: string;
  agentId: string;
  maxSpend: string;
  timeLimit: number;
  merchantRestrictions?: string[];
  signature: string;
  expiresAt: string;
}

export interface PaymentIntent {
  amount: string;
  recipient: string;
  sessionId: string;
  delegationId?: string;
}

export interface AgentRegistration {
  agentId: string;
  name: string;
  walletAddress: string;
  aaWalletAddress?: string;
  vaultAddress?: string;
  registeredAt: string;
}

// Account Abstraction Types
export interface SpendingRule {
  timeWindow: bigint;        // seconds (e.g., 86400 = 24h)
  budget: bigint;            // token amount in wei
  initialWindowStartTime: bigint;
  targetProviders: string[]; // allowed addresses
}

export interface AgentVault {
  vaultAddress: string;
  ownerAddress: string;
  aaWalletAddress: string;
  spendingRules: SpendingRule[];
  balance: string;
  deployedAt: string;
}

export interface UserOperation {
  target: string;
  value: bigint;
  callData: string;
}

export interface BatchOperation {
  targets: string[];
  values: bigint[];
  callDatas: string[];
}

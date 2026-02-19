export interface KiteConfig {
  apiKey: string;
  apiUrl: string;
  chainId: number;
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
  registeredAt: string;
}

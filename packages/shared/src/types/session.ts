export interface Session {
  id: string;
  agentId: string;
  userId: string;
  status: SessionStatus;
  maxSpend: string; // USDC amount
  timeLimit: number; // seconds
  merchantRestrictions?: string[];
  createdAt: Date;
  expiresAt: Date;
}

export type SessionStatus = 'active' | 'expired' | 'revoked';

export interface CreateSessionInput {
  agentId: string;
  maxSpend: string;
  timeLimit: number;
  merchantRestrictions?: string[];
}

export interface Delegation {
  id: string;
  sessionId: string;
  amount: string;
  recipient: string;
  status: DelegationStatus;
  signature?: string;
  createdAt: Date;
}

export type DelegationStatus = 'pending' | 'approved' | 'executed' | 'rejected';

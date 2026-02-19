export interface Payment {
  id: string;
  agentId: string;
  sessionId: string;
  delegationId: string;
  amount: string;
  currency: 'USDC';
  counterparty: string;
  skillName?: string;
  status: PaymentStatus;
  txHash?: string;
  createdAt: Date;
}

export type PaymentStatus = 'pending' | 'completed' | 'failed';

export interface PaymentHistory {
  payments: Payment[];
  totalSpent: string;
  count: number;
}

export interface Agent {
  id: string;
  userId: string;
  name: string;
  description: string;
  category: string;
  status: AgentStatus;
  walletAddress: string;
  kiteAgentId?: string;
  runtimeType: RuntimeType;
  endpoint?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AgentStatus = 'draft' | 'deploying' | 'active' | 'paused' | 'error';

export type RuntimeType = 
  | 'tiny-claw' 
  | 'pico-claw' 
  | 'nano-claw' 
  | 'iron-claw' 
  | 'open-claw' 
  | 'nanobot';

export interface CreateAgentInput {
  name: string;
  description: string;
  category: string;
  runtimeType: RuntimeType;
}

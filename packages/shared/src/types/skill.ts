export interface Skill {
  id: string;
  agentId: string;
  name: string;
  description: string;
  price?: string; // USDC, undefined = free
  handler: SkillHandler;
  webhookUrl?: string;
  tags: string[];
  published: boolean;
  createdAt: Date;
}

export type SkillHandler = 'placeholder' | 'webhook' | 'script';

export interface CreateSkillInput {
  name: string;
  description: string;
  price?: string;
  handler: SkillHandler;
  webhookUrl?: string;
  tags?: string[];
}

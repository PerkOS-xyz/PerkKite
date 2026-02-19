import { RuntimeType } from '../types/agent';

export interface RuntimeConfig {
  id: RuntimeType;
  name: string;
  description: string;
  resources: {
    cpu: string;
    memory: string;
    storage: string;
  };
}

export const RUNTIMES: Record<RuntimeType, RuntimeConfig> = {
  'tiny-claw': {
    id: 'tiny-claw',
    name: 'Tiny Claw',
    description: 'Minimal footprint, basic tasks',
    resources: { cpu: '0.5 vCPU', memory: '512MB', storage: '1GB' },
  },
  'pico-claw': {
    id: 'pico-claw',
    name: 'Pico Claw',
    description: 'Lightweight, simple automation',
    resources: { cpu: '1 vCPU', memory: '1GB', storage: '5GB' },
  },
  'nano-claw': {
    id: 'nano-claw',
    name: 'Nano Claw',
    description: 'Standard workloads',
    resources: { cpu: '2 vCPU', memory: '2GB', storage: '10GB' },
  },
  'iron-claw': {
    id: 'iron-claw',
    name: 'Iron Claw',
    description: 'High performance tasks',
    resources: { cpu: '4 vCPU', memory: '4GB', storage: '20GB' },
  },
  'open-claw': {
    id: 'open-claw',
    name: 'Open Claw',
    description: 'Full OpenClaw runtime',
    resources: { cpu: '4 vCPU', memory: '8GB', storage: '50GB' },
  },
  'nanobot': {
    id: 'nanobot',
    name: 'Nanobot',
    description: 'Specialized micro-agent',
    resources: { cpu: '0.25 vCPU', memory: '256MB', storage: '512MB' },
  },
};

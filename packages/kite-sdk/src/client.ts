import type { KiteConfig, AgentRegistration } from './types';

// Kite Testnet Constants
export const KITE_TESTNET = {
  MCP_URL: 'https://neo.dev.gokite.ai/v1/mcp',
  FACILITATOR_URL: 'https://facilitator.pieverse.io',
  FACILITATOR_ADDRESS: '0x12343e649e6b2b2b77649DFAb88f103c02F3C78b',
  TOKEN_ADDRESS: '0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63',
  CHAIN_ID: 2368,
  RPC_URL: 'https://rpc-testnet.gokite.ai',
  EXPLORER: 'https://testnet.kitescan.ai',
};

export interface X402PaymentRequest {
  scheme: 'gokite-aa';
  network: 'kite-testnet';
  maxAmountRequired: string;
  resource: string;
  description: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  merchantName: string;
}

export interface X402SettleRequest {
  authorization: Record<string, unknown>;
  signature: string;
  network: 'kite-testnet';
}

export class KiteClient {
  private config: KiteConfig;
  private mcpUrl: string;
  private facilitatorUrl: string;

  constructor(config: KiteConfig) {
    this.config = config;
    this.mcpUrl = config.mcpUrl || KITE_TESTNET.MCP_URL;
    this.facilitatorUrl = config.facilitatorUrl || KITE_TESTNET.FACILITATOR_URL;
  }

  /**
   * Create a 402 Payment Required response
   */
  create402Response(params: {
    resource: string;
    amount: string;
    payTo: string;
    description: string;
    merchantName: string;
  }): X402PaymentRequest {
    return {
      scheme: 'gokite-aa',
      network: 'kite-testnet',
      maxAmountRequired: params.amount,
      resource: params.resource,
      description: params.description,
      payTo: params.payTo,
      maxTimeoutSeconds: 300,
      asset: KITE_TESTNET.TOKEN_ADDRESS,
      merchantName: params.merchantName,
    };
  }

  /**
   * Verify and settle a payment via Pieverse facilitator
   */
  async settlePayment(xPaymentHeader: string): Promise<{ success: boolean; txHash?: string }> {
    try {
      const decoded = JSON.parse(Buffer.from(xPaymentHeader, 'base64').toString());
      
      const response = await fetch(`${this.facilitatorUrl}/v2/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorization: decoded.authorization,
          signature: decoded.signature,
          network: 'kite-testnet',
        }),
      });

      if (!response.ok) {
        throw new Error(`Settlement failed: ${response.status}`);
      }

      const result = await response.json();
      return { success: true, txHash: result.txHash };
    } catch (error) {
      console.error('Payment settlement error:', error);
      return { success: false };
    }
  }

  /**
   * Register an agent (placeholder for future Kite API)
   */
  async registerAgent(name: string, walletAddress: string): Promise<AgentRegistration> {
    console.log(`Registering agent: ${name} (${walletAddress})`);
    
    return {
      agentId: `client_agent_${Date.now()}`,
      name,
      walletAddress,
      registeredAt: new Date().toISOString(),
    };
  }

  async getAgent(agentId: string): Promise<AgentRegistration | null> {
    console.log(`Fetching agent: ${agentId}`);
    return null;
  }
}

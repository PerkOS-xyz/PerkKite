import { ethers } from 'ethers';
import type { KiteConfig, SpendingRule, AgentVault, UserOperation } from './types';

// Kite Testnet Addresses
export const KITE_ADDRESSES = {
  settlementToken: '0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63',
  settlementContract: '0x8d9FaD78d5Ce247aA01C140798B9558fd64a63E3',
  vaultImplementation: '0xB5AAFCC6DD4DFc2B80fb8BCcf406E1a2Fd559e23',
} as const;

export class KiteAAClient {
  private config: KiteConfig;
  private provider: ethers.JsonRpcProvider;
  private sdk: any; // GokiteAASDK type

  constructor(config: KiteConfig) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
  }

  /**
   * Initialize the AA SDK (lazy load to avoid SSR issues)
   */
  private async getSDK() {
    if (!this.sdk) {
      // Dynamic import for the AA SDK
      const { GokiteAASDK } = await import('gokite-aa-sdk');
      this.sdk = new GokiteAASDK(
        'kite_testnet',
        this.config.rpcUrl,
        this.config.bundlerUrl
      );
    }
    return this.sdk;
  }

  /**
   * Get the AA wallet address for a given EOA signer
   */
  async getAAWalletAddress(signerAddress: string): Promise<string> {
    const sdk = await this.getSDK();
    return sdk.getAccountAddress(signerAddress);
  }

  /**
   * Deploy a new agent vault (proxy contract)
   */
  async deployAgentVault(
    signerAddress: string,
    signFunction: (hash: string) => Promise<string>
  ): Promise<{ vaultAddress: string; txHash: string }> {
    const sdk = await this.getSDK();
    const aaWallet = await this.getAAWalletAddress(signerAddress);

    // Encode the vault deployment call
    const vaultInterface = new ethers.Interface([
      'function performCreate(address implementation, bytes calldata initData) returns (address)'
    ]);
    
    const initData = ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'address'],
      [KITE_ADDRESSES.settlementToken, aaWallet]
    );

    const callData = vaultInterface.encodeFunctionData('performCreate', [
      KITE_ADDRESSES.vaultImplementation,
      initData
    ]);

    const result = await sdk.sendUserOperationAndWait(
      signerAddress,
      { target: aaWallet, value: 0n, callData },
      signFunction
    );

    if (result.status.status !== 'success') {
      throw new Error(`Vault deployment failed: ${result.status.reason}`);
    }

    // Parse vault address from logs (simplified)
    const vaultAddress = result.status.logs?.[0]?.address || 'pending';

    return {
      vaultAddress,
      txHash: result.status.transactionHash,
    };
  }

  /**
   * Configure spending rules for an agent vault
   */
  async setSpendingRules(
    signerAddress: string,
    vaultAddress: string,
    rules: SpendingRule[],
    signFunction: (hash: string) => Promise<string>
  ): Promise<{ txHash: string }> {
    const sdk = await this.getSDK();

    const vaultInterface = new ethers.Interface([
      'function configureSpendingRules((uint256 timeWindow, uint256 budget, uint256 initialWindowStartTime, address[] targetProviders)[] rules)'
    ]);

    const formattedRules = rules.map(rule => ({
      timeWindow: rule.timeWindow,
      budget: rule.budget,
      initialWindowStartTime: rule.initialWindowStartTime,
      targetProviders: rule.targetProviders,
    }));

    const callData = vaultInterface.encodeFunctionData('configureSpendingRules', [formattedRules]);

    const result = await sdk.sendUserOperationAndWait(
      signerAddress,
      { target: vaultAddress, value: 0n, callData },
      signFunction
    );

    if (result.status.status !== 'success') {
      throw new Error(`Setting rules failed: ${result.status.reason}`);
    }

    return { txHash: result.status.transactionHash };
  }

  /**
   * Get spending rules from a vault
   */
  async getSpendingRules(vaultAddress: string): Promise<SpendingRule[]> {
    const vaultInterface = new ethers.Interface([
      'function getSpendingRules() view returns ((uint256 timeWindow, uint256 budget, uint256 initialWindowStartTime, address[] targetProviders)[])'
    ]);

    const contract = new ethers.Contract(vaultAddress, vaultInterface, this.provider);
    const rules = await contract.getSpendingRules();

    return rules.map((r: any) => ({
      timeWindow: r.timeWindow,
      budget: r.budget,
      initialWindowStartTime: r.initialWindowStartTime,
      targetProviders: [...r.targetProviders],
    }));
  }

  /**
   * Get vault token balance
   */
  async getVaultBalance(vaultAddress: string): Promise<string> {
    const tokenInterface = new ethers.Interface([
      'function balanceOf(address account) view returns (uint256)'
    ]);

    const token = new ethers.Contract(
      KITE_ADDRESSES.settlementToken,
      tokenInterface,
      this.provider
    );

    const balance = await token.balanceOf(vaultAddress);
    return ethers.formatUnits(balance, 18);
  }

  /**
   * Send a gasless transaction via the bundler
   */
  async sendTransaction(
    signerAddress: string,
    operation: UserOperation,
    signFunction: (hash: string) => Promise<string>
  ): Promise<{ txHash: string; success: boolean }> {
    const sdk = await this.getSDK();

    const result = await sdk.sendUserOperationAndWait(
      signerAddress,
      operation,
      signFunction
    );

    return {
      txHash: result.status.transactionHash || '',
      success: result.status.status === 'success',
    };
  }
}

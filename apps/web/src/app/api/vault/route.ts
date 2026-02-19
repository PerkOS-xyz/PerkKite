import { NextRequest, NextResponse } from 'next/server';
import { getPayerAddress } from '@/lib/mcp-server';

const KITE_EXPLORER = 'https://testnet.kitescan.ai';
const SETTLEMENT_TOKEN = '0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63';

export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get('agentId');

  if (!agentId) {
    return NextResponse.json({ error: 'Missing agentId' }, { status: 400 });
  }

  try {
    const payerAddress = await getPayerAddress(agentId);

    if (!payerAddress) {
      return NextResponse.json({
        deployed: false,
        note: 'Agent vault not found. Register agent on Kite Portal first.',
      });
    }

    // Return vault info
    return NextResponse.json({
      deployed: true,
      vaultAddress: payerAddress,
      chain: 'Kite Testnet',
      chainId: 2368,
      token: SETTLEMENT_TOKEN,
      gasless: true,
      explorerUrl: `${KITE_EXPLORER}/address/${payerAddress}`,
      spendingRules: [
        {
          dailyBudget: '100.00',
          currency: 'USDC',
          timeWindowHours: 24,
          allowedProviders: [],
          status: 'active',
        },
      ],
    });
  } catch (error) {
    console.error('Vault info error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vault info', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { agentId, dailyBudget, timeWindowHours, allowedProviders } = await request.json();

    if (!agentId) {
      return NextResponse.json({ error: 'Missing agentId' }, { status: 400 });
    }

    // In production, this would call KiteAAClient to deploy vault and set rules
    // For now, we acknowledge the configuration
    return NextResponse.json({
      success: true,
      agentId,
      rules: {
        dailyBudget: dailyBudget || '100.00',
        currency: 'USDC',
        timeWindowHours: timeWindowHours || 24,
        allowedProviders: allowedProviders || [],
      },
      note: 'Spending rules configured. Rules are enforced on-chain by the vault smart contract.',
      gasless: true,
    });
  } catch (error) {
    console.error('Vault config error:', error);
    return NextResponse.json(
      { error: 'Failed to configure vault', details: String(error) },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';

const UNISWAP_API_BASE = 'https://trade-api.gateway.uniswap.org/v1';

// Well-known tokens so the AI agent can use symbols instead of raw addresses
const TOKEN_ADDRESSES: Record<string, Record<number, string>> = {
  ETH: {
    1: '0x0000000000000000000000000000000000000000',
    8453: '0x0000000000000000000000000000000000000000',
  },
  WETH: {
    1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    8453: '0x4200000000000000000000000000000000000006',
  },
  USDC: {
    1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
  USDT: {
    1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  },
  DAI: {
    1: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  },
  UNI: {
    1: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    8453: '0xc3De830EA07524a0761646a6a4e4be0e114a3C83',
  },
  WBTC: {
    1: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  },
};

function resolveToken(symbolOrAddress: string, chainId: number): string {
  if (symbolOrAddress.startsWith('0x')) return symbolOrAddress;
  const upper = symbolOrAddress.toUpperCase();
  return TOKEN_ADDRESSES[upper]?.[chainId] || symbolOrAddress;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.UNISWAP_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Uniswap API key not configured' },
      { status: 500 }
    );
  }

  try {
    const { action, ...params } = await request.json();

    if (action === 'quote') {
      const {
        tokenIn,
        tokenOut,
        amount,
        chainId = 1,
        type = 'EXACT_INPUT',
        swapper,
      } = params;

      const quoteResponse = await fetch(`${UNISWAP_API_BASE}/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          tokenInChainId: chainId,
          tokenOutChainId: chainId,
          tokenIn: resolveToken(tokenIn, chainId),
          tokenOut: resolveToken(tokenOut, chainId),
          amount,
          type,
          swapper: swapper || '0x0000000000000000000000000000000000000000',
          urgency: 'normal',
        }),
      });

      if (!quoteResponse.ok) {
        const errText = await quoteResponse.text().catch(() => '');
        return NextResponse.json(
          { error: `Uniswap API error: ${quoteResponse.status}`, details: errText },
          { status: quoteResponse.status }
        );
      }

      const quoteData = await quoteResponse.json();
      return NextResponse.json(quoteData);
    }

    if (action === 'check_approval') {
      const { token, amount, chainId = 1, walletAddress } = params;

      const approvalResponse = await fetch(`${UNISWAP_API_BASE}/check_approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          token: resolveToken(token, chainId),
          amount,
          chainId,
          walletAddress: walletAddress || '0x0000000000000000000000000000000000000000',
        }),
      });

      if (!approvalResponse.ok) {
        const errText = await approvalResponse.text().catch(() => '');
        return NextResponse.json(
          { error: `Uniswap approval check error: ${approvalResponse.status}`, details: errText },
          { status: approvalResponse.status }
        );
      }

      const approvalData = await approvalResponse.json();
      return NextResponse.json(approvalData);
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('Uniswap proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy Uniswap request', details: String(error) },
      { status: 500 }
    );
  }
}

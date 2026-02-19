import { NextRequest, NextResponse } from 'next/server';

const SETTLEMENT_TOKEN = '0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63';
const FACILITATOR_URL = 'https://facilitator.pieverse.io';

// Simulated x402 paid services
const SERVICES: Record<string, { name: string; price: string; payTo: string; data: string }> = {
  'premium-research': {
    name: 'Premium Protocol Research',
    price: '5000000', // 5 USDC (6 decimals)
    payTo: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    data: JSON.stringify({
      report: 'Kite L1 Analysis',
      metrics: { blockTime: '2.3s', tps: 450, dailyAgents: 15000, monthlySettlement: '$2.4M' },
      recommendation: 'Strong fundamentals for agent commerce infrastructure.',
    }),
  },
  'security-audit': {
    name: 'Smart Contract Security Audit',
    price: '10000000', // 10 USDC
    payTo: '0x8d9FaD78d5Ce247aA01C140798B9558fd64a63E3',
    data: JSON.stringify({
      audit: 'Vault Contract Audit',
      findings: { critical: 0, high: 0, medium: 0, low: 2 },
      riskLevel: 'LOW',
      recommendation: 'Add ReentrancyGuard and event emissions.',
    }),
  },
  'market-data': {
    name: 'Real-Time Market Data',
    price: '2000000', // 2 USDC
    payTo: '0xB5AAFCC6DD4DFc2B80fb8BCcf406E1a2Fd559e23',
    data: JSON.stringify({
      pair: 'KITE/USDC',
      price: 0.0842,
      change24h: '+12.3%',
      volume: '$1.2M',
      gas: '0 (gasless)',
    }),
  },
};

// Demo x402 service endpoint
// Without X-PAYMENT header: returns 402 Payment Required
// With X-PAYMENT header: validates and returns the paid content
export async function POST(request: NextRequest) {
  const { service } = await request.json();
  const xPayment = request.headers.get('X-PAYMENT');

  const svc = SERVICES[service];
  if (!svc) {
    return NextResponse.json({ error: `Unknown service: ${service}` }, { status: 404 });
  }

  // If no payment header, return 402 Payment Required
  if (!xPayment) {
    const paymentRequired = {
      x402Version: 1,
      accepts: [
        {
          scheme: 'gokite-aa',
          network: 'kite-testnet',
          maxAmountRequired: svc.price,
          resource: `/api/x402/${service}`,
          description: svc.name,
          payTo: svc.payTo,
          maxTimeoutSeconds: 300,
          asset: SETTLEMENT_TOKEN,
          extra: { merchantName: 'PerkKite', gasless: true },
        },
      ],
    };

    return NextResponse.json(paymentRequired, {
      status: 402,
      headers: {
        'PAYMENT-REQUIRED': Buffer.from(JSON.stringify(paymentRequired)).toString('base64'),
      },
    });
  }

  // Payment header present - validate and settle
  try {
    const decoded = JSON.parse(Buffer.from(xPayment, 'base64').toString());

    // In production, we'd call the facilitator to verify + settle
    // For the demo, we validate the structure and simulate settlement
    if (decoded.authorization && decoded.signature) {
      // Try real settlement via Pieverse facilitator
      try {
        const settleResponse = await fetch(`${FACILITATOR_URL}/v2/settle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            authorization: decoded.authorization,
            signature: decoded.signature,
            network: 'kite-testnet',
          }),
        });

        if (settleResponse.ok) {
          const settleResult = await settleResponse.json() as { txHash?: string };
          return NextResponse.json({
            success: true,
            service: svc.name,
            txHash: settleResult.txHash,
            data: JSON.parse(svc.data),
          }, {
            headers: {
              'X-PAYMENT-RESPONSE': Buffer.from(JSON.stringify({
                success: true,
                txHash: settleResult.txHash,
              })).toString('base64'),
            },
          });
        }
      } catch {
        // Facilitator unavailable, fall through to simulated settlement
      }
    }

    // Simulated settlement for demo purposes
    return NextResponse.json({
      success: true,
      service: svc.name,
      txHash: `0x${Date.now().toString(16)}${'0'.repeat(40)}`,
      settled: 'simulated',
      data: JSON.parse(svc.data),
    });
  } catch {
    return NextResponse.json({ error: 'Invalid X-PAYMENT header' }, { status: 400 });
  }
}

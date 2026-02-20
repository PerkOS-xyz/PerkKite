import { NextRequest, NextResponse } from 'next/server';
import { getPayerAddress, listMCPTools } from '@/lib/mcp-server';

export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get('agentId');
  const accessToken = request.nextUrl.searchParams.get('accessToken') || undefined;

  if (!agentId) {
    return NextResponse.json({ error: 'Missing agentId' }, { status: 400 });
  }

  try {
    const [payerAddress, tools] = await Promise.allSettled([
      getPayerAddress(agentId, accessToken),
      listMCPTools(agentId, accessToken),
    ]);

    const address = payerAddress.status === 'fulfilled' ? payerAddress.value : null;
    const toolList = tools.status === 'fulfilled' ? tools.value : [];

    return NextResponse.json({
      agentId,
      payerAddress: address,
      authenticated: !!address,
      tools: toolList.map(t => ({ name: t.name, description: t.description })),
      toolCount: toolList.length,
      chain: 'Kite Testnet',
      chainId: 2368,
      mcpServer: process.env.KITE_API_KEY ? 'production' : 'development',
    });
  } catch (error) {
    console.error('Agent info error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent info', details: String(error) },
      { status: 500 }
    );
  }
}

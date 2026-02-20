import { NextRequest, NextResponse } from 'next/server';

const DEV_MCP_URL = 'https://neo.dev.gokite.ai/v1/mcp';

function getMCPConfig(agentId: string, accessToken?: string): { url: string; headers: Record<string, string> } {
  const apiKey = process.env.KITE_API_KEY;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (apiKey) {
    return {
      url: `https://mcp.prod.gokite.ai/${apiKey}/mcp`,
      headers,
    };
  }

  // OAuth Bearer token from Kite Portal
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  headers['X-Agent-Id'] = agentId;

  return {
    url: process.env.KITE_MCP_URL || DEV_MCP_URL,
    headers,
  };
}

// MCP JSON-RPC proxy to Kite
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, accessToken, method, params } = body;

    if (!agentId) {
      return NextResponse.json({ error: 'Missing agentId' }, { status: 400 });
    }

    const { url, headers } = getMCPConfig(agentId, accessToken);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params: params || {},
      }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('MCP proxy error:', error);
    return NextResponse.json(
      { error: 'MCP request failed', details: String(error) },
      { status: 500 }
    );
  }
}

// Get available MCP tools
export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get('agentId');
  const accessToken = request.nextUrl.searchParams.get('accessToken') || undefined;

  if (!agentId) {
    return NextResponse.json({ error: 'Missing agentId query param' }, { status: 400 });
  }

  const { url, headers } = getMCPConfig(agentId, accessToken);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/list',
        params: {},
      }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('MCP tools list error:', error);
    return NextResponse.json(
      { error: 'Failed to list tools', details: String(error) },
      { status: 500 }
    );
  }
}

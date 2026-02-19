import { NextRequest, NextResponse } from 'next/server';

const KITE_MCP_URL = 'https://neo.dev.gokite.ai/v1/mcp';

// MCP JSON-RPC proxy to Kite
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, method, params } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: 'Missing agentId' },
        { status: 400 }
      );
    }

    // Build MCP JSON-RPC request
    const mcpRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params: params || {},
    };

    const response = await fetch(KITE_MCP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-Id': agentId,
      },
      body: JSON.stringify(mcpRequest),
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

  if (!agentId) {
    return NextResponse.json(
      { error: 'Missing agentId query param' },
      { status: 400 }
    );
  }

  // List tools via MCP
  const mcpRequest = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/list',
    params: {},
  };

  try {
    const response = await fetch(KITE_MCP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-Id': agentId,
      },
      body: JSON.stringify(mcpRequest),
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

// Server-side MCP client for Kite integration
// This file is used by API routes only (not the browser)

const DEV_MCP_URL = 'https://neo.dev.gokite.ai/v1/mcp';

function getMCPUrl(): string {
  const apiKey = process.env.KITE_API_KEY;
  if (apiKey) {
    return `https://mcp.prod.gokite.ai/${apiKey}/mcp`;
  }
  return process.env.KITE_MCP_URL || DEV_MCP_URL;
}

function getMCPHeaders(agentId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  // Dev endpoint uses X-Agent-Id header; prod endpoint uses API key in URL
  if (!process.env.KITE_API_KEY && agentId) {
    headers['X-Agent-Id'] = agentId;
  }
  return headers;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

interface MCPResponse<T = unknown> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: { code: number; message: string };
}

export async function callMCPTool(
  agentId: string,
  toolName: string,
  args: Record<string, unknown> = {}
): Promise<unknown> {
  const url = getMCPUrl();
  const response = await fetch(url, {
    method: 'POST',
    headers: getMCPHeaders(agentId),
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    }),
  });

  if (!response.ok) {
    throw new Error(`MCP request failed: ${response.status} ${response.statusText}`);
  }

  const data: MCPResponse = await response.json();
  if (data.error) {
    throw new Error(`MCP error: ${data.error.message}`);
  }
  return data.result;
}

export async function listMCPTools(agentId: string): Promise<MCPTool[]> {
  const url = getMCPUrl();
  const response = await fetch(url, {
    method: 'POST',
    headers: getMCPHeaders(agentId),
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/list',
      params: {},
    }),
  });

  if (!response.ok) {
    throw new Error(`MCP tools list failed: ${response.status}`);
  }

  const data: MCPResponse<{ tools: MCPTool[] }> = await response.json();
  if (data.error) {
    throw new Error(`MCP error: ${data.error.message}`);
  }
  return data.result?.tools || [];
}

export async function getPayerAddress(agentId: string): Promise<string | null> {
  try {
    const result = await callMCPTool(agentId, 'get_payer_addr', {});
    return (result as { address?: string })?.address || null;
  } catch {
    return null;
  }
}

export async function approvePayment(
  agentId: string,
  amount: string,
  recipient: string
): Promise<unknown> {
  return callMCPTool(agentId, 'approve_payment', { amount, recipient });
}

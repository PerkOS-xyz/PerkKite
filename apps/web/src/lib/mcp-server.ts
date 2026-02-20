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

function getMCPHeaders(agentId?: string, accessToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  // OAuth Bearer token (from Kite Portal MCP Config)
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  // Dev endpoint also accepts X-Agent-Id header as fallback
  if (agentId) {
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
  args: Record<string, unknown> = {},
  accessToken?: string
): Promise<unknown> {
  const url = getMCPUrl();
  const response = await fetch(url, {
    method: 'POST',
    headers: getMCPHeaders(agentId, accessToken),
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`MCP request failed: ${response.status} ${text || response.statusText}`);
  }

  const data: MCPResponse = await response.json();
  if (data.error) {
    throw new Error(`MCP error: ${data.error.message}`);
  }

  // MCP standard tools/call wraps results in { content: [{type:'text', text:'...'}] }
  // Unwrap to return the actual parsed content for callers
  const result = data.result as { content?: Array<{ type: string; text: string }> } | undefined;
  if (result?.content?.[0]?.text) {
    try {
      return JSON.parse(result.content[0].text);
    } catch {
      return result.content[0].text;
    }
  }
  return data.result;
}

export async function listMCPTools(agentId: string, accessToken?: string): Promise<MCPTool[]> {
  const url = getMCPUrl();
  const response = await fetch(url, {
    method: 'POST',
    headers: getMCPHeaders(agentId, accessToken),
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/list',
      params: {},
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`MCP tools list failed: ${response.status} ${text || response.statusText}`);
  }

  const data: MCPResponse<{ tools: MCPTool[] }> = await response.json();
  if (data.error) {
    console.log('MCP tools/list error:', data.error.message);
    throw new Error(`MCP error: ${data.error.message}`);
  }
  const tools = data.result?.tools || [];
  if (tools.length === 0) {
    console.log('MCP tools/list raw result:', JSON.stringify(data.result));
  }
  return tools;
}

export async function getPayerAddress(agentId: string, accessToken?: string): Promise<string | null> {
  try {
    const raw = await callMCPTool(agentId, 'get_payer_addr', {}, accessToken);
    // If result is a string directly (e.g. just the address)
    if (typeof raw === 'string' && raw.startsWith('0x')) return raw;
    // Handle various response shapes: docs say { payer_addr: "0x..." }
    const result = raw as Record<string, unknown>;
    const addr = result?.payer_addr || result?.address || result?.payerAddress || result?.payer_address;
    if (typeof addr === 'string' && addr.startsWith('0x')) return addr;
    console.log('get_payer_addr result:', JSON.stringify(raw));
    return null;
  } catch (err) {
    console.log('get_payer_addr error:', String(err));
    return null;
  }
}

export async function approvePayment(
  agentId: string,
  payerAddr: string,
  payeeAddr: string,
  amount: string,
  tokenType: string = 'USDC',
  accessToken?: string
): Promise<unknown> {
  // Kite docs: approve_payment({ payer_addr, payee_addr, amount, token_type })
  return callMCPTool(agentId, 'approve_payment', {
    payer_addr: payerAddr,
    payee_addr: payeeAddr,
    amount,
    token_type: tokenType,
  }, accessToken);
}

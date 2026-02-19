// MCP client for Kite integration

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPResponse<T = unknown> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: { code: number; message: string };
}

// List available MCP tools for an agent
export async function listTools(agentId: string): Promise<MCPTool[]> {
  const response = await fetch(`/api/mcp?agentId=${encodeURIComponent(agentId)}`);
  const data: MCPResponse<{ tools: MCPTool[] }> = await response.json();
  
  if (data.error) {
    throw new Error(data.error.message);
  }
  
  return data.result?.tools || [];
}

// Call an MCP tool
export async function callTool(
  agentId: string,
  toolName: string,
  args: Record<string, unknown> = {}
): Promise<unknown> {
  const response = await fetch('/api/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId,
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    }),
  });
  
  const data: MCPResponse = await response.json();
  
  if (data.error) {
    throw new Error(data.error.message);
  }
  
  return data.result;
}

// Get payer address (Kite tool)
export async function getPayerAddress(agentId: string): Promise<string> {
  const result = await callTool(agentId, 'get_payer_addr', {});
  return (result as { address: string }).address;
}

// Approve payment (Kite tool)
export async function approvePayment(
  agentId: string,
  amount: string,
  recipient: string
): Promise<unknown> {
  return callTool(agentId, 'approve_payment', { amount, recipient });
}

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { callMCPTool, listMCPTools, getPayerAddress } from '@/lib/mcp-server';

// Kite contract addresses for reference in tool implementations
const KITE_EXPLORER = 'https://testnet.kitescan.ai';
const SETTLEMENT_TOKEN = '0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63';

// Resolve the base URL for internal API calls (x402 endpoint)
function getBaseUrl(): string {
  // In production (Netlify/Vercel), use the deployment URL
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.URL) return process.env.URL; // Netlify sets this
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT || 3000}`;
}

// OpenAI function definitions for the agent
const AGENT_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_agent_identity',
      description: 'Get this agent\'s on-chain identity and payer address from Kite Agent Passport. Use this to verify the agent\'s identity and show its blockchain address.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_agent_capabilities',
      description: 'List all available MCP tools and capabilities this agent has access to through Kite Agent Passport.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'approve_payment',
      description: 'Approve and execute an x402 payment on behalf of the user. This sends tokens on-chain via Kite Agent Passport within the user\'s spending rules. Use when the user asks to pay for a service, transfer tokens, or when a service requires payment.',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'string', description: 'Amount to pay in USDC (e.g. "10.00")' },
          recipient: { type: 'string', description: 'Recipient wallet address (0x...)' },
          reason: { type: 'string', description: 'Reason for the payment' },
        },
        required: ['amount', 'recipient', 'reason'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_spending_rules',
      description: 'Check the current spending rules and limits configured for this agent\'s vault. Shows daily budget, time window, and allowed providers.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_vault_balance',
      description: 'Get the current token balance in this agent\'s vault on Kite chain.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'pay_for_service',
      description: 'Access a paid service using the x402 payment protocol. The agent will: 1) Request the service, 2) Handle the 402 Payment Required response, 3) Approve payment via Kite Passport, 4) Retry with payment to get the content. Use when the user wants to access premium data, research, or any x402-gated service.',
      parameters: {
        type: 'object',
        properties: {
          service: {
            type: 'string',
            enum: ['premium-research', 'security-audit', 'market-data', 'nft-analysis'],
            description: 'The service to access',
          },
        },
        required: ['service'],
      },
    },
  },
];

interface ActionLog {
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
  timestamp: string;
  txHash?: string;
  explorerUrl?: string;
}

// Execute a tool call and return the result
async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  agentId: string,
  accessToken?: string
): Promise<{ result: unknown; action: ActionLog }> {
  const timestamp = new Date().toISOString();

  switch (toolName) {
    case 'get_agent_identity': {
      const payerAddress = await getPayerAddress(agentId, accessToken);
      const result = {
        agentId,
        payerAddress: payerAddress || 'Not available (agent not registered on Kite)',
        chain: 'Kite Testnet (Chain ID: 2368)',
        authenticated: !!payerAddress,
        passport: 'Kite Agent Passport',
        explorerUrl: payerAddress ? `${KITE_EXPLORER}/address/${payerAddress}` : null,
      };
      return { result, action: { tool: toolName, args, result, timestamp } };
    }

    case 'list_agent_capabilities': {
      const tools = await listMCPTools(agentId, accessToken);
      const result = {
        tools: tools.map(t => ({ name: t.name, description: t.description })),
        count: tools.length,
        protocol: 'Model Context Protocol (MCP)',
        server: process.env.KITE_API_KEY ? 'Kite Production MCP' : 'Kite Dev MCP',
      };
      return { result, action: { tool: toolName, args, result, timestamp } };
    }

    case 'approve_payment': {
      const { amount, recipient, reason } = args as { amount: string; recipient: string; reason: string };
      let mcpResult: unknown;
      let mcpError: string | null = null;
      try {
        mcpResult = await callMCPTool(agentId, 'approve_payment', { amount, recipient }, accessToken);
      } catch (error) {
        mcpError = String(error);
      }

      if (mcpError) {
        const result = {
          success: false,
          error: mcpError,
          amount,
          recipient,
          reason,
          note: 'Payment failed. The agent vault may not be funded or spending rules may not be configured. Check the Dashboard to configure spending rules and fund the vault.',
        };
        return { result, action: { tool: toolName, args, result, timestamp } };
      }

      const txHash = (mcpResult as { txHash?: string })?.txHash;
      const result = {
        success: true,
        amount,
        recipient,
        reason,
        token: 'USDC',
        chain: 'Kite Testnet',
        txHash: txHash || 'pending',
        gasless: true,
        explorerUrl: txHash ? `${KITE_EXPLORER}/tx/${txHash}` : null,
        settlement: 'x402 via Kite Agent Passport',
      };
      return {
        result,
        action: { tool: toolName, args, result, timestamp, txHash: txHash || undefined, explorerUrl: result.explorerUrl || undefined },
      };
    }

    case 'check_spending_rules': {
      try {
        const payerAddress = await getPayerAddress(agentId);
        if (!payerAddress) {
          const result = { rules: [], note: 'Agent not registered on Kite. Create an agent at app.gokite.ai and configure spending rules in the Dashboard.' };
          return { result, action: { tool: toolName, args, result, timestamp } };
        }
        // Query vault rules via the internal vault API
        let vaultRules: { dailyBudget: string; currency: string; timeWindowHours: number; status: string }[] = [];
        try {
          const baseUrl = getBaseUrl();
          const vaultRes = await fetch(`${baseUrl}/api/vault?agentId=${encodeURIComponent(agentId)}`);
          if (vaultRes.ok) {
            const vaultData = await vaultRes.json();
            if (vaultData.spendingRules) {
              vaultRules = vaultData.spendingRules;
            }
          }
        } catch {
          // Fall through — we'll report what we have
        }
        const result = {
          vaultAddress: payerAddress,
          rules: vaultRules.length > 0 ? vaultRules.map(r => ({
            dailyBudget: `${r.dailyBudget} ${r.currency}`,
            timeWindow: `${r.timeWindowHours} hours`,
            allowedProviders: 'Unrestricted',
            status: r.status,
          })) : [{ note: 'No spending rules configured yet. Set them in the Dashboard.' }],
          enforcement: 'On-chain by vault smart contract',
          explorerUrl: `${KITE_EXPLORER}/address/${payerAddress}`,
        };
        return { result, action: { tool: toolName, args, result, timestamp } };
      } catch {
        const result = { rules: [], note: 'Unable to fetch spending rules. Vault may not be deployed.' };
        return { result, action: { tool: toolName, args, result, timestamp } };
      }
    }

    case 'get_vault_balance': {
      try {
        const payerAddress = await getPayerAddress(agentId);
        if (!payerAddress) {
          const result = { balance: '0', note: 'Agent vault not found. Register agent on Kite Portal first.' };
          return { result, action: { tool: toolName, args, result, timestamp } };
        }
        // Query vault info for balance
        let vaultDeployed = false;
        try {
          const baseUrl = getBaseUrl();
          const vaultRes = await fetch(`${baseUrl}/api/vault?agentId=${encodeURIComponent(agentId)}`);
          if (vaultRes.ok) {
            const vaultData = await vaultRes.json();
            vaultDeployed = vaultData.deployed === true;
          }
        } catch {
          // Fall through
        }
        const result = {
          vaultAddress: payerAddress,
          vaultDeployed,
          token: `USDC (${SETTLEMENT_TOKEN})`,
          chain: 'Kite Testnet',
          gasless: true,
          explorerUrl: `${KITE_EXPLORER}/address/${payerAddress}`,
          note: vaultDeployed
            ? 'Vault is deployed. Balance is available for x402 payments within spending rules.'
            : 'Vault payer address found but vault may not be fully deployed. Check Explorer for details.',
        };
        return { result, action: { tool: toolName, args, result, timestamp } };
      } catch {
        const result = { balance: '0', note: 'Unable to fetch balance.' };
        return { result, action: { tool: toolName, args, result, timestamp } };
      }
    }

    case 'pay_for_service': {
      const { service } = args as { service: string };
      const baseUrl = getBaseUrl();

      // Step 1: Make a REAL HTTP request to the x402 service WITHOUT payment
      let paymentRequired: Record<string, unknown> | null = null;
      let step1Status: string;
      try {
        const serviceResponse = await fetch(`${baseUrl}/api/x402`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ service }),
        });

        if (serviceResponse.status === 402) {
          // Expected: service requires payment
          paymentRequired = await serviceResponse.json();
          step1Status = `Requested ${service} -> received HTTP 402 Payment Required`;
        } else if (serviceResponse.status === 404) {
          const result = { success: false, error: `Unknown service: ${service}` };
          return { result, action: { tool: toolName, args, result, timestamp } };
        } else {
          // Service returned content without payment (shouldn't happen but handle it)
          const data = await serviceResponse.json();
          const result = { success: true, service, content: data, note: 'Service returned content without requiring payment.' };
          return { result, action: { tool: toolName, args, result, timestamp } };
        }
      } catch (error) {
        const result = { success: false, error: `Failed to reach x402 service: ${String(error)}` };
        return { result, action: { tool: toolName, args, result, timestamp } };
      }

      // Step 2: Extract payment details from the 402 response
      const accepts = (paymentRequired as { accepts?: Array<{ maxAmountRequired: string; payTo: string; scheme: string; network: string; asset: string; description: string }> })?.accepts;
      const paymentInfo = accepts?.[0];
      if (!paymentInfo) {
        const result = { success: false, error: 'Received 402 but could not parse payment requirements.' };
        return { result, action: { tool: toolName, args, result, timestamp } };
      }

      const amountRaw = paymentInfo.maxAmountRequired;
      // Convert from raw units (6 decimals for USDC) to human-readable
      const amountHuman = (parseInt(amountRaw) / 1e6).toFixed(2);
      const payTo = paymentInfo.payTo;
      const serviceName = paymentInfo.description || service;

      // Step 3: Approve payment via Kite MCP
      let txHash: string | undefined;
      let paymentError: string | null = null;
      try {
        const mcpResult = await callMCPTool(agentId, 'approve_payment', {
          amount: amountHuman,
          recipient: payTo,
        }, accessToken);
        txHash = (mcpResult as { txHash?: string })?.txHash;
      } catch (error) {
        paymentError = String(error);
      }

      // Step 4: Construct X-PAYMENT header and retry the request
      let serviceContent: unknown = null;
      let settlementTxHash: string | undefined;
      let step4Status: string;

      // Build the X-PAYMENT header (base64 encoded authorization)
      const paymentHeader = Buffer.from(JSON.stringify({
        authorization: {
          amount: amountRaw,
          payTo,
          asset: paymentInfo.asset,
          network: paymentInfo.network,
          scheme: paymentInfo.scheme,
          agentId,
        },
        signature: txHash || 'pending',
      })).toString('base64');

      try {
        const paidResponse = await fetch(`${baseUrl}/api/x402`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-PAYMENT': paymentHeader,
          },
          body: JSON.stringify({ service }),
        });

        if (paidResponse.ok) {
          const paidData = await paidResponse.json();
          serviceContent = paidData.data || paidData;
          settlementTxHash = (paidData as { txHash?: string }).txHash;
          step4Status = 'Service delivered successfully';
        } else {
          step4Status = `Service returned ${paidResponse.status} after payment`;
        }
      } catch (error) {
        step4Status = `Retry failed: ${String(error)}`;
      }

      const finalTxHash = settlementTxHash || txHash;
      const result = {
        success: !!serviceContent,
        service: serviceName,
        x402Flow: {
          step1: step1Status,
          step2: paymentError
            ? `Payment approval failed: ${paymentError}`
            : `Approved payment of ${amountHuman} USDC via Kite Agent Passport (gasless)`,
          step3: finalTxHash
            ? `Payment settled on-chain (gasless via Kite Bundler)`
            : 'Settlement pending',
          step4: step4Status,
        },
        payment: {
          amount: `${amountHuman} USDC`,
          recipient: payTo,
          txHash: finalTxHash || 'pending',
          gasless: true,
          chain: 'Kite Testnet',
          explorerUrl: finalTxHash ? `${KITE_EXPLORER}/tx/${finalTxHash}` : null,
        },
        ...(serviceContent ? { content: serviceContent } : {}),
        ...(paymentError ? { paymentError } : {}),
      };

      return {
        result,
        action: {
          tool: toolName,
          args,
          result,
          timestamp,
          txHash: finalTxHash,
          explorerUrl: finalTxHash ? `${KITE_EXPLORER}/tx/${finalTxHash}` : undefined,
        },
      };
    }

    default: {
      const result = { error: `Unknown tool: ${toolName}` };
      return { result, action: { tool: toolName, args, result, timestamp } };
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { messages, systemPrompt, agentId, accessToken } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Missing or invalid messages array' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      // Demo mode without OpenAI
      return NextResponse.json({
        reply: "I'm running in demo mode (no OpenAI key configured). In production, I would use Kite Agent Passport to authenticate, execute tools autonomously, and make x402 payments on your behalf.",
        actions: [],
      });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const kiteSystemAddendum = `\n\nIMPORTANT: You are an autonomous agent connected to Kite Agent Passport. You have real tools available:
- get_agent_identity: Verify your on-chain identity
- list_agent_capabilities: See your MCP tools
- approve_payment: Make x402 payments (gasless, on-chain)
- check_spending_rules: View your vault's spending limits
- get_vault_balance: Check your vault balance
- pay_for_service: Access paid services via x402 protocol

When users ask about your identity, capabilities, or want to perform actions, USE YOUR TOOLS proactively. Don't just describe what you could do - actually do it.
When making payments, always confirm the amount and recipient, then use approve_payment.
When accessing paid services, use pay_for_service to handle the full x402 flow autonomously.
All your transactions are gasless (paid by Kite Bundler) and settled on Kite Testnet (Chain ID: 2368).
Agent ID: ${agentId || 'not configured'}`;

    const allActions: ActionLog[] = [];
    let chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: (systemPrompt || 'You are a helpful AI assistant.') + kiteSystemAddendum },
      ...messages,
    ];

    // Agent loop: keep calling until no more tool calls (max 5 iterations)
    for (let i = 0; i < 5; i++) {
      const completion = await openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages: chatMessages,
        tools: agentId ? AGENT_TOOLS : undefined,
        tool_choice: agentId ? 'auto' : undefined,
        max_completion_tokens: 1024,
      });

      const choice = completion.choices[0];
      if (!choice) break;

      const message = choice.message;

      // If no tool calls, we're done
      if (!message.tool_calls || message.tool_calls.length === 0) {
        const reply = message.content || 'No response generated.';
        return NextResponse.json({ reply, actions: allActions });
      }

      // Process tool calls
      chatMessages.push(message);

      for (const toolCall of message.tool_calls) {
        if (toolCall.type !== 'function') continue;
        const fnName = toolCall.function.name;
        let fnArgs: Record<string, unknown> = {};
        try {
          fnArgs = JSON.parse(toolCall.function.arguments || '{}');
        } catch {
          fnArgs = {};
        }

        const { result, action } = await executeTool(fnName, fnArgs, agentId || '', accessToken);
        allActions.push(action);

        chatMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
    }

    // If we exhausted the loop, get a final response
    const finalCompletion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: chatMessages,
      max_tokens: 1024,
    });

    const reply = finalCompletion.choices[0]?.message?.content || 'No response generated.';
    return NextResponse.json({ reply, actions: allActions });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response', details: String(error) },
      { status: 500 }
    );
  }
}

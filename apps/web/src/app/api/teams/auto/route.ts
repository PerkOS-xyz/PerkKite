import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { callMCPTool, listMCPTools, getPayerAddress } from '@/lib/mcp-server';

const KITE_EXPLORER = 'https://testnet.kitescan.ai';
const SETTLEMENT_TOKEN = '0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63';

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.URL) return process.env.URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT || 3000}`;
}

const TEMPLATE_SPECIALTIES: Record<string, { icon: string; name: string; specialty: string; systemPrompt: string }> = {
  'defi-trader': { icon: '📈', name: 'DeFi Trader', specialty: 'yield optimization, token swaps, DEX aggregation, portfolio tracking', systemPrompt: 'You are a DeFi Trading Agent powered by Kite Agent Passport. You specialize in yield optimization, token swaps, DEX aggregation, portfolio tracking, and gas optimization.' },
  'nft-collector': { icon: '🖼️', name: 'NFT Collector', specialty: 'floor price tracking, rarity analysis, marketplace navigation', systemPrompt: 'You are an NFT Collector Agent powered by Kite Agent Passport. You specialize in floor price tracking, rarity analysis, marketplace navigation, and portfolio valuation.' },
  'research-analyst': { icon: '🔬', name: 'Research Analyst', specialty: 'protocol docs, tokenomics, market research, whitepaper analysis', systemPrompt: 'You are a Research Analyst Agent powered by Kite Agent Passport. You specialize in protocol documentation analysis, tokenomics evaluation, market research, and whitepaper summarization.' },
  'security-auditor': { icon: '🛡️', name: 'Security Auditor', specialty: 'smart contract analysis, rug detection, risk assessment', systemPrompt: 'You are a Security Auditor Agent powered by Kite Agent Passport. You specialize in smart contract analysis, rug pull detection, risk assessment, and audit report interpretation.' },
  'social-manager': { icon: '📱', name: 'Social Manager', specialty: 'Twitter/X monitoring, Farcaster, community management', systemPrompt: 'You are a Social Manager Agent powered by Kite Agent Passport. You specialize in Twitter/X monitoring, Farcaster integration, community management, and content drafting.' },
  'dao-delegate': { icon: '🏛️', name: 'DAO Delegate', specialty: 'governance proposals, voting analysis, delegate tracking', systemPrompt: 'You are a DAO Delegate Agent powered by Kite Agent Passport. You specialize in governance proposal analysis, voting pattern tracking, delegate comparison, and deadline monitoring.' },
  'default': { icon: '🤖', name: 'Kite Agent', specialty: 'general Web3 assistance', systemPrompt: 'You are a Kite Agent powered by Kite Agent Passport. You are helpful, knowledgeable about Web3 and crypto.' },
};

const AGENT_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  { type: 'function', function: { name: 'get_agent_identity', description: "Get this agent's on-chain identity and payer address from Kite Agent Passport.", parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'list_agent_capabilities', description: 'List all available MCP tools and capabilities this agent has.', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'approve_payment', description: 'Approve and execute an x402 payment on behalf of the user.', parameters: { type: 'object', properties: { amount: { type: 'string', description: 'Amount in USDC' }, recipient: { type: 'string', description: 'Recipient address (0x...)' }, reason: { type: 'string', description: 'Reason for payment' } }, required: ['amount', 'recipient', 'reason'] } } },
  { type: 'function', function: { name: 'check_spending_rules', description: "Check spending rules and limits for this agent's vault.", parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'get_vault_balance', description: "Get the current token balance in this agent's vault.", parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'pay_for_service', description: 'Access a paid service using the x402 payment protocol.', parameters: { type: 'object', properties: { service: { type: 'string', enum: ['premium-research', 'security-audit', 'market-data', 'nft-analysis'], description: 'The service to access' } }, required: ['service'] } } },
  { type: 'function', function: { name: 'get_swap_quote', description: 'Get a real-time swap quote from Uniswap Trading API.', parameters: { type: 'object', properties: { tokenIn: { type: 'string', description: 'Input token symbol or address' }, tokenOut: { type: 'string', description: 'Output token symbol or address' }, amount: { type: 'string', description: 'Amount in smallest unit' }, chainId: { type: 'number', description: 'Chain ID (default: 1)' } }, required: ['tokenIn', 'tokenOut', 'amount'] } } },
  { type: 'function', function: { name: 'execute_swap', description: 'Execute a token swap via Uniswap + x402 payment on Kite.', parameters: { type: 'object', properties: { tokenIn: { type: 'string', description: 'Input token symbol or address' }, tokenOut: { type: 'string', description: 'Output token symbol or address' }, amount: { type: 'string', description: 'Amount in smallest unit' }, chainId: { type: 'number', description: 'Chain ID (default: 1)' } }, required: ['tokenIn', 'tokenOut', 'amount'] } } },
];

interface ActionLog {
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
  timestamp: string;
  txHash?: string;
  explorerUrl?: string;
}

// executeTool — same as teams/chat/route.ts
async function executeTool(toolName: string, args: Record<string, unknown>, agentId: string, accessToken?: string): Promise<{ result: unknown; action: ActionLog }> {
  const timestamp = new Date().toISOString();
  switch (toolName) {
    case 'get_agent_identity': {
      const payerAddress = await getPayerAddress(agentId, accessToken);
      const result = { agentId, payerAddress: payerAddress || 'Not available', chain: 'Kite Testnet (Chain ID: 2368)', authenticated: !!payerAddress, passport: 'Kite Agent Passport', explorerUrl: payerAddress ? `${KITE_EXPLORER}/address/${payerAddress}` : null };
      return { result, action: { tool: toolName, args, result, timestamp } };
    }
    case 'list_agent_capabilities': {
      const tools = await listMCPTools(agentId, accessToken);
      const result = { tools: tools.map(t => ({ name: t.name, description: t.description })), count: tools.length, protocol: 'Model Context Protocol (MCP)', server: process.env.KITE_API_KEY ? 'Kite Production MCP' : 'Kite Dev MCP' };
      return { result, action: { tool: toolName, args, result, timestamp } };
    }
    case 'approve_payment': {
      const { amount, recipient, reason } = args as { amount: string; recipient: string; reason: string };
      let mcpResult: unknown; let mcpError: string | null = null;
      try { mcpResult = await callMCPTool(agentId, 'approve_payment', { amount, recipient }, accessToken); } catch (error) { mcpError = String(error); }
      if (mcpError) { const result = { success: false, error: mcpError, amount, recipient, reason }; return { result, action: { tool: toolName, args, result, timestamp } }; }
      const txHash = (mcpResult as { txHash?: string })?.txHash;
      const result = { success: true, amount, recipient, reason, token: 'USDC', chain: 'Kite Testnet', txHash: txHash || 'pending', gasless: true, explorerUrl: txHash ? `${KITE_EXPLORER}/tx/${txHash}` : null, settlement: 'x402 via Kite Agent Passport' };
      return { result, action: { tool: toolName, args, result, timestamp, txHash: txHash || undefined, explorerUrl: result.explorerUrl || undefined } };
    }
    case 'check_spending_rules': {
      const payerAddress = await getPayerAddress(agentId);
      if (!payerAddress) { const result = { rules: [], note: 'Agent not registered on Kite.' }; return { result, action: { tool: toolName, args, result, timestamp } }; }
      let vaultRules: { dailyBudget: string; currency: string; timeWindowHours: number; status: string }[] = [];
      try { const baseUrl = getBaseUrl(); const vaultRes = await fetch(`${baseUrl}/api/vault?agentId=${encodeURIComponent(agentId)}`); if (vaultRes.ok) { const d = await vaultRes.json(); if (d.spendingRules) vaultRules = d.spendingRules; } } catch { /* fall through */ }
      const result = { vaultAddress: payerAddress, rules: vaultRules.length > 0 ? vaultRules.map(r => ({ dailyBudget: `${r.dailyBudget} ${r.currency}`, timeWindow: `${r.timeWindowHours} hours`, status: r.status })) : [{ note: 'No spending rules configured.' }], enforcement: 'On-chain by vault smart contract', explorerUrl: `${KITE_EXPLORER}/address/${payerAddress}` };
      return { result, action: { tool: toolName, args, result, timestamp } };
    }
    case 'get_vault_balance': {
      const payerAddress = await getPayerAddress(agentId);
      if (!payerAddress) { const result = { balance: '0', note: 'Agent vault not found.' }; return { result, action: { tool: toolName, args, result, timestamp } }; }
      let vaultDeployed = false;
      try { const baseUrl = getBaseUrl(); const vaultRes = await fetch(`${baseUrl}/api/vault?agentId=${encodeURIComponent(agentId)}`); if (vaultRes.ok) { const d = await vaultRes.json(); vaultDeployed = d.deployed === true; } } catch { /* fall through */ }
      const result = { vaultAddress: payerAddress, vaultDeployed, token: `USDC (${SETTLEMENT_TOKEN})`, chain: 'Kite Testnet', gasless: true, explorerUrl: `${KITE_EXPLORER}/address/${payerAddress}` };
      return { result, action: { tool: toolName, args, result, timestamp } };
    }
    case 'pay_for_service': {
      const { service } = args as { service: string }; const baseUrl = getBaseUrl();
      let paymentRequired: Record<string, unknown> | null = null; let step1Status: string;
      try { const serviceResponse = await fetch(`${baseUrl}/api/x402`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ service }) }); if (serviceResponse.status === 402) { paymentRequired = await serviceResponse.json(); step1Status = `Requested ${service} -> HTTP 402`; } else if (serviceResponse.status === 404) { const result = { success: false, error: `Unknown service: ${service}` }; return { result, action: { tool: toolName, args, result, timestamp } }; } else { const data = await serviceResponse.json(); const result = { success: true, service, content: data }; return { result, action: { tool: toolName, args, result, timestamp } }; } } catch (error) { const result = { success: false, error: `Failed: ${String(error)}` }; return { result, action: { tool: toolName, args, result, timestamp } }; }
      const accepts = (paymentRequired as { accepts?: Array<{ maxAmountRequired: string; payTo: string; scheme: string; network: string; asset: string; description: string }> })?.accepts; const paymentInfo = accepts?.[0];
      if (!paymentInfo) { const result = { success: false, error: 'Could not parse 402.' }; return { result, action: { tool: toolName, args, result, timestamp } }; }
      const amountRaw = paymentInfo.maxAmountRequired; const amountHuman = (parseInt(amountRaw) / 1e6).toFixed(2); const payTo = paymentInfo.payTo;
      let txHash: string | undefined; let paymentError: string | null = null;
      try { const mcpResult = await callMCPTool(agentId, 'approve_payment', { amount: amountHuman, recipient: payTo }, accessToken); txHash = (mcpResult as { txHash?: string })?.txHash; } catch (error) { paymentError = String(error); }
      const paymentHeader = Buffer.from(JSON.stringify({ authorization: { amount: amountRaw, payTo, asset: paymentInfo.asset, network: paymentInfo.network, scheme: paymentInfo.scheme, agentId }, signature: txHash || 'pending' })).toString('base64');
      let serviceContent: unknown = null; let settlementTxHash: string | undefined; let step4Status: string;
      try { const paidResponse = await fetch(`${baseUrl}/api/x402`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-PAYMENT': paymentHeader }, body: JSON.stringify({ service }) }); if (paidResponse.ok) { const d = await paidResponse.json(); serviceContent = d.data || d; settlementTxHash = (d as { txHash?: string }).txHash; step4Status = 'Service delivered'; } else { step4Status = `Service returned ${paidResponse.status}`; } } catch (error) { step4Status = `Failed: ${String(error)}`; }
      const finalTxHash = settlementTxHash || txHash;
      const result = { success: !!serviceContent, service: paymentInfo.description || service, x402Flow: { step1: step1Status, step2: paymentError ? `Payment failed: ${paymentError}` : `Approved ${amountHuman} USDC via Kite (gasless)`, step3: finalTxHash ? 'Settled on-chain' : 'Settlement pending', step4: step4Status }, payment: { amount: `${amountHuman} USDC`, recipient: payTo, txHash: finalTxHash || 'pending', gasless: true, chain: 'Kite Testnet', explorerUrl: finalTxHash ? `${KITE_EXPLORER}/tx/${finalTxHash}` : null }, ...(serviceContent ? { content: serviceContent } : {}) };
      return { result, action: { tool: toolName, args, result, timestamp, txHash: finalTxHash, explorerUrl: finalTxHash ? `${KITE_EXPLORER}/tx/${finalTxHash}` : undefined } };
    }
    case 'get_swap_quote': {
      const { tokenIn, tokenOut, amount, chainId = 1 } = args as { tokenIn: string; tokenOut: string; amount: string; chainId?: number };
      const chainName = chainId === 1 ? 'Ethereum' : chainId === 8453 ? 'Base' : chainId === 137 ? 'Polygon' : chainId === 42161 ? 'Arbitrum' : chainId === 10 ? 'Optimism' : `Chain ${chainId}`;
      try { const baseUrl = getBaseUrl(); const quoteRes = await fetch(`${baseUrl}/api/uniswap`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'quote', tokenIn, tokenOut, amount, chainId }) }); if (!quoteRes.ok) { const result = { success: false, error: `Uniswap API returned ${quoteRes.status}`, tokenIn, tokenOut, amount, chainId, chainName }; return { result, action: { tool: toolName, args, result, timestamp } }; } const quoteData = await quoteRes.json(); const result = { success: true, quote: { tokenIn, tokenOut, amountIn: amount, amountOut: quoteData.quote?.output?.amount || quoteData.amountOut || 'N/A', chainId, chainName, gasFeeEstimate: quoteData.quote?.gasFee || 'N/A' }, source: 'Uniswap Trading API' }; return { result, action: { tool: toolName, args, result, timestamp } }; } catch (error) { const result = { success: false, error: `Failed: ${String(error)}`, tokenIn, tokenOut, amount, chainId, chainName }; return { result, action: { tool: toolName, args, result, timestamp } }; }
    }
    case 'execute_swap': {
      const { tokenIn, tokenOut, amount, chainId = 1 } = args as { tokenIn: string; tokenOut: string; amount: string; chainId?: number };
      const chainName = chainId === 1 ? 'Ethereum' : chainId === 8453 ? 'Base' : chainId === 137 ? 'Polygon' : chainId === 42161 ? 'Arbitrum' : chainId === 10 ? 'Optimism' : `Chain ${chainId}`;
      let quoteData: Record<string, unknown> | null = null; let step1Status: string;
      try { const baseUrl = getBaseUrl(); const quoteRes = await fetch(`${baseUrl}/api/uniswap`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'quote', tokenIn, tokenOut, amount, chainId }) }); if (quoteRes.ok) { quoteData = await quoteRes.json(); step1Status = `Fetched live quote on ${chainName}: ${tokenIn} -> ${tokenOut}`; } else { step1Status = `Quote failed (${quoteRes.status})`; } } catch (error) { step1Status = `Failed: ${String(error)}`; }
      if (!quoteData) { const result = { success: false, service: 'Uniswap Swap', swapFlow: { step1: step1Status, step2: 'Skipped', step3: 'Skipped' }, tokenIn, tokenOut, amount, chainId, chainName }; return { result, action: { tool: toolName, args, result, timestamp } }; }
      const amountOut = quoteData.quote ? ((quoteData.quote as Record<string, unknown>).output as Record<string, unknown>)?.amount || 'N/A' : quoteData.amountOut || 'N/A';
      const swapServiceFee = '1.00'; const swapServiceRecipient = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
      let txHash: string | undefined; let paymentError: string | null = null; let step2Status: string;
      try { const mcpResult = await callMCPTool(agentId, 'approve_payment', { amount: swapServiceFee, recipient: swapServiceRecipient }, accessToken); txHash = (mcpResult as { txHash?: string })?.txHash; step2Status = `Approved ${swapServiceFee} USDC swap fee via x402 on Kite (gasless)`; } catch (error) { paymentError = String(error); step2Status = `Payment failed: ${paymentError}`; }
      const step3Status = txHash ? `Swap authorized. Production would submit to Uniswap on ${chainName}.` : 'Swap not submitted (payment pending).';
      const result = { success: !!quoteData && !paymentError, service: 'Uniswap Swap', swap: { tokenIn, tokenOut, amountIn: amount, amountOut: String(amountOut), chainId, chainName, source: 'Uniswap Trading API' }, swapFlow: { step1: step1Status, step2: step2Status, step3: step3Status }, payment: { amount: `${swapServiceFee} USDC`, recipient: swapServiceRecipient, txHash: txHash || 'pending', gasless: true, chain: 'Kite Testnet', explorerUrl: txHash ? `${KITE_EXPLORER}/tx/${txHash}` : null }, crossChain: { priceDiscovery: chainName, settlement: 'Kite Testnet', narrative: 'AI agent discovers swap price via Uniswap, pays via x402 + Kite Agent Passport' } };
      return { result, action: { tool: toolName, args, result, timestamp, txHash: txHash || undefined, explorerUrl: txHash ? `${KITE_EXPLORER}/tx/${txHash}` : undefined } };
    }
    default: { const result = { error: `Unknown tool: ${toolName}` }; return { result, action: { tool: toolName, args, result, timestamp } }; }
  }
}

// --- Autonomous Coordinator Tools ---

const COORDINATOR_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'route_to_agents',
      description: 'Route work to specific agent(s) for this round. Each agent will execute autonomously with their full tool set.',
      parameters: {
        type: 'object',
        properties: {
          agents: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                clientId: { type: 'string', description: 'Agent clientId' },
                instruction: { type: 'string', description: 'Specific instruction for the agent this round' },
              },
              required: ['clientId', 'instruction'],
            },
          },
        },
        required: ['agents'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_tasks',
      description: 'Create new tasks for the team to track progress toward the goal.',
      parameters: {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Task title' },
                assignTo: { type: 'string', description: 'Agent clientId to assign to' },
                priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Priority level' },
              },
              required: ['title', 'assignTo', 'priority'],
            },
          },
        },
        required: ['tasks'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'orchestrate',
      description: 'Make the orchestration decision for this round: summarize what happened, update task statuses, and decide whether to continue.',
      parameters: {
        type: 'object',
        properties: {
          completedTaskIds: { type: 'array', items: { type: 'string' }, description: 'Task IDs completed this round' },
          inProgressTaskIds: { type: 'array', items: { type: 'string' }, description: 'Task IDs now in progress' },
          summary: { type: 'string', description: 'Summary of what happened this round' },
          nextAction: { type: 'string', description: 'What the team should do next (or "Goal achieved" if done)' },
          continue: { type: 'boolean', description: 'true if more work is needed, false if goal is achieved' },
        },
        required: ['summary', 'nextAction', 'continue'],
      },
    },
  },
];

interface AgentInfo {
  clientId: string;
  name: string;
  template: string;
  accessToken?: string;
}

interface TaskState {
  id: string;
  title: string;
  status: string;
  assignedTo: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { goal, agents, messages, tasks, iteration } = await request.json() as {
      goal: string;
      agents: AgentInfo[];
      messages: { role: string; content: string; agentName?: string }[];
      tasks: TaskState[];
      iteration: number;
    };

    if (!goal || !agents || agents.length === 0) {
      return NextResponse.json({ error: 'Missing goal or agents' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        responses: [], newTasks: [], completedTaskIds: [], inProgressTaskIds: [],
        continue: false, summary: 'Demo mode (no OpenAI key).', nextAction: 'Configure OPENAI_API_KEY.',
      });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Build task state summary
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const completedTasks = tasks.filter(t => t.status === 'completed');

    const taskSummary = [
      pendingTasks.length > 0 ? `Pending: ${pendingTasks.map(t => `"${t.title}" (id:${t.id})`).join(', ')}` : 'Pending: none',
      inProgressTasks.length > 0 ? `In Progress: ${inProgressTasks.map(t => `"${t.title}" (id:${t.id})`).join(', ')}` : 'In Progress: none',
      completedTasks.length > 0 ? `Completed: ${completedTasks.map(t => `"${t.title}"`).join(', ')}` : 'Completed: none',
    ].join('\n');

    const agentDescriptions = agents.map(a => {
      const tmpl = TEMPLATE_SPECIALTIES[a.template] || TEMPLATE_SPECIALTIES['default'];
      return `- ${tmpl.name} (clientId: ${a.clientId}): ${tmpl.specialty}`;
    }).join('\n');

    const coordinatorPrompt = `You are an autonomous team coordinator. You are working toward a goal set by the user.

GOAL: ${goal}

CURRENT STATE:
- Round: ${iteration + 1} of 10
- ${taskSummary}

AVAILABLE AGENTS:
${agentDescriptions}

YOUR JOB THIS ROUND:
1. Analyze the goal and current state
2. If new sub-tasks are needed, call create_tasks to break the goal into actionable steps
3. Call route_to_agents to assign work to the right agent(s) with specific instructions
4. Call orchestrate to summarize what you're doing, update task statuses, and decide if more rounds are needed

IMPORTANT:
- Always call route_to_agents with at least one agent
- Always call orchestrate as your final tool call
- Set continue=false in orchestrate when the goal is fully achieved
- Set continue=true if more work is needed
- Be efficient — don't create unnecessary tasks or rounds
- On the first round, create tasks to break down the goal
- On subsequent rounds, work through pending tasks and complete them`;

    // Include recent messages for context
    const recentMessages = messages.slice(-10).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.agentName ? `[${m.agentName}]: ${m.content}` : m.content,
    }));

    const coordinatorMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: coordinatorPrompt },
      ...recentMessages,
    ];

    // Coordinator call — let it call multiple tools
    let routedAgents: { clientId: string; instruction: string }[] = [];
    let newTasks: { title: string; assignTo: string; priority: string }[] = [];
    let orchestration = { completedTaskIds: [] as string[], inProgressTaskIds: [] as string[], summary: '', nextAction: '', continue: true };

    // Loop to handle sequential tool calls from coordinator
    for (let i = 0; i < 5; i++) {
      const completion = await openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages: coordinatorMessages,
        tools: COORDINATOR_TOOLS,
        tool_choice: 'auto',
        max_completion_tokens: 512,
      });

      const choice = completion.choices[0];
      if (!choice) break;
      const message = choice.message;

      if (!message.tool_calls || message.tool_calls.length === 0) {
        // No more tool calls — use content as summary if we don't have one
        if (!orchestration.summary && message.content) {
          orchestration.summary = message.content;
          orchestration.nextAction = 'Processing...';
        }
        break;
      }

      coordinatorMessages.push(message);

      for (const toolCall of message.tool_calls) {
        if (toolCall.type !== 'function') continue;
        let fnArgs: Record<string, unknown> = {};
        try { fnArgs = JSON.parse(toolCall.function.arguments || '{}'); } catch { fnArgs = {}; }

        switch (toolCall.function.name) {
          case 'route_to_agents': {
            routedAgents = (fnArgs.agents as { clientId: string; instruction: string }[]) || [];
            coordinatorMessages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify({ routed: routedAgents.length }) });
            break;
          }
          case 'create_tasks': {
            newTasks = (fnArgs.tasks as { title: string; assignTo: string; priority: string }[]) || [];
            coordinatorMessages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify({ created: newTasks.length }) });
            break;
          }
          case 'orchestrate': {
            orchestration = {
              completedTaskIds: (fnArgs.completedTaskIds as string[]) || [],
              inProgressTaskIds: (fnArgs.inProgressTaskIds as string[]) || [],
              summary: (fnArgs.summary as string) || '',
              nextAction: (fnArgs.nextAction as string) || '',
              continue: fnArgs.continue !== false,
            };
            coordinatorMessages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify({ ok: true }) });
            break;
          }
        }
      }
    }

    // Fallback: if coordinator didn't route to any agents, route to all
    if (routedAgents.length === 0) {
      routedAgents = agents.map(a => ({ clientId: a.clientId, instruction: `Work toward the goal: ${goal}` }));
    }

    // Ensure summary exists
    if (!orchestration.summary) {
      orchestration.summary = `Round ${iteration + 1}: Processing goal "${goal}"`;
      orchestration.nextAction = 'Agents are working...';
    }

    // Filter to valid agents
    const validAgentIds = new Set(agents.map(a => a.clientId));
    routedAgents = routedAgents.filter(r => validAgentIds.has(r.clientId));
    if (routedAgents.length === 0) {
      routedAgents = agents.map(a => ({ clientId: a.clientId, instruction: `Work toward the goal: ${goal}` }));
    }

    // Execute selected agents in parallel
    const teamMemberList = agents.map(a => {
      const tmpl = TEMPLATE_SPECIALTIES[a.template] || TEMPLATE_SPECIALTIES['default'];
      return `${tmpl.icon} ${tmpl.name}`;
    }).join(', ');

    const agentResponses = await Promise.all(
      routedAgents.map(async (routed) => {
        const agent = agents.find(a => a.clientId === routed.clientId);
        if (!agent) return null;
        const tmpl = TEMPLATE_SPECIALTIES[agent.template] || TEMPLATE_SPECIALTIES['default'];

        const agentAddendum = `\n\nYou are part of an autonomous team: ${teamMemberList}.
AUTONOMOUS GOAL: ${goal}
YOUR INSTRUCTION THIS ROUND: ${routed.instruction}

Execute your instruction using your tools. Be thorough and proactive.
Focus on YOUR specialty (${tmpl.specialty}).
If you think a follow-up task is needed, include [TASK: description] in your response.

Available tools: get_agent_identity, list_agent_capabilities, approve_payment, check_spending_rules, get_vault_balance, pay_for_service, get_swap_quote, execute_swap
All transactions are gasless on Kite Testnet. Agent ID: ${agent.clientId}`;

        const agentMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
          { role: 'system', content: tmpl.systemPrompt + agentAddendum },
          { role: 'user', content: routed.instruction },
        ];

        const allActions: ActionLog[] = [];

        for (let j = 0; j < 5; j++) {
          const completion = await openai.chat.completions.create({
            model: 'gpt-5-mini',
            messages: agentMessages,
            tools: AGENT_TOOLS,
            tool_choice: 'auto',
            max_completion_tokens: 512,
          });

          const choice = completion.choices[0];
          if (!choice) break;
          const message = choice.message;

          if (!message.tool_calls || message.tool_calls.length === 0) {
            return { agentId: agent.clientId, agentName: agent.name, template: agent.template, icon: tmpl.icon, reply: message.content || 'Done.', actions: allActions };
          }

          agentMessages.push(message);
          for (const toolCall of message.tool_calls) {
            if (toolCall.type !== 'function') continue;
            let fnArgs: Record<string, unknown> = {};
            try { fnArgs = JSON.parse(toolCall.function.arguments || '{}'); } catch { fnArgs = {}; }
            const { result, action } = await executeTool(toolCall.function.name, fnArgs, agent.clientId, agent.accessToken);
            allActions.push(action);
            agentMessages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(result) });
          }
        }

        const finalCompletion = await openai.chat.completions.create({
          model: 'gpt-5-mini', messages: agentMessages, max_tokens: 512,
        });
        return { agentId: agent.clientId, agentName: agent.name, template: agent.template, icon: tmpl.icon, reply: finalCompletion.choices[0]?.message?.content || 'Done.', actions: allActions };
      })
    );

    const validResponses = agentResponses.filter(Boolean);

    // Extract bonus tasks from agent replies
    for (const resp of validResponses) {
      if (!resp) continue;
      const taskMatches = resp.reply.matchAll(/\[TASK:\s*(.+?)\]/g);
      for (const match of taskMatches) {
        newTasks.push({ title: match[1].trim(), assignTo: resp.agentId, priority: 'medium' });
      }
    }

    return NextResponse.json({
      responses: validResponses,
      newTasks,
      completedTaskIds: orchestration.completedTaskIds,
      inProgressTaskIds: orchestration.inProgressTaskIds,
      continue: orchestration.continue,
      summary: orchestration.summary,
      nextAction: orchestration.nextAction,
    });
  } catch (error) {
    console.error('Autonomous API error:', error);
    return NextResponse.json(
      { error: 'Autonomous execution failed', details: String(error), responses: [], newTasks: [], completedTaskIds: [], inProgressTaskIds: [], continue: false, summary: `Error: ${String(error)}`, nextAction: 'Fix the error and retry.' },
      { status: 500 }
    );
  }
}

import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center px-8 py-24 text-center">
        <div className="text-6xl mb-6">🪁</div>
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-kite-primary to-perkos-pink bg-clip-text text-transparent">
          PerkKite
        </h1>
        <p className="text-2xl text-gray-300 mb-2">
          Spark for Kite
        </p>
        <p className="text-lg text-gray-400 max-w-xl mb-8">
          Launch AI agents with verifiable identity and delegated payments powered by Kite Agent Passport
        </p>
        <div className="flex gap-4">
          <Link
            href="/agents/new"
            className="px-8 py-4 bg-kite-primary hover:bg-kite-secondary rounded-lg font-semibold text-lg transition"
          >
            Create Agent →
          </Link>
          <a
            href="https://docs.gokite.ai/kite-agent-passport"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 border border-gray-700 hover:border-gray-500 rounded-lg font-semibold text-lg transition"
          >
            Learn More
          </a>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-8 py-16 bg-gray-900/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="text-4xl mb-4">1️⃣</div>
              <h3 className="text-xl font-semibold mb-2">Configure Your Agent</h3>
              <p className="text-gray-400">
                Set your agent&apos;s name, category, runtime, and daily spending limits through our wizard.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="text-4xl mb-4">2️⃣</div>
              <h3 className="text-xl font-semibold mb-2">Connect to Kite</h3>
              <p className="text-gray-400">
                Register your agent on Kite Agent Passport and get your MCP configuration for AI clients.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="text-4xl mb-4">3️⃣</div>
              <h3 className="text-xl font-semibold mb-2">Start Transacting</h3>
              <p className="text-gray-400">
                Your agent can now make x402 payments to services within your defined spending rules.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Diagram */}
      <section className="px-8 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Architecture</h2>
          
          {/* Diagram */}
          <div className="relative bg-gray-900 rounded-xl border border-gray-800 p-8 overflow-x-auto">
            <div className="flex items-center justify-between min-w-[600px] gap-4">
              {/* User */}
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-3xl">
                  👤
                </div>
                <span className="mt-2 text-sm font-medium">User</span>
                <span className="text-xs text-gray-500">Wallet Owner</span>
              </div>

              {/* Arrow */}
              <div className="flex-1 flex items-center">
                <div className="h-0.5 flex-1 bg-gradient-to-r from-blue-600 to-kite-primary"></div>
                <div className="text-kite-primary">→</div>
              </div>

              {/* PerkKite */}
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-kite-primary rounded-xl flex items-center justify-center text-3xl">
                  🪁
                </div>
                <span className="mt-2 text-sm font-medium">PerkKite</span>
                <span className="text-xs text-gray-500">Agent Launcher</span>
              </div>

              {/* Arrow */}
              <div className="flex-1 flex items-center">
                <div className="h-0.5 flex-1 bg-gradient-to-r from-kite-primary to-purple-500"></div>
                <div className="text-purple-500">→</div>
              </div>

              {/* Kite Passport */}
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-purple-600 rounded-xl flex items-center justify-center text-3xl">
                  🎫
                </div>
                <span className="mt-2 text-sm font-medium">Kite Passport</span>
                <span className="text-xs text-gray-500">Identity + Rules</span>
              </div>

              {/* Arrow */}
              <div className="flex-1 flex items-center">
                <div className="h-0.5 flex-1 bg-gradient-to-r from-purple-500 to-green-500"></div>
                <div className="text-green-500">→</div>
              </div>

              {/* AI Agent */}
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-green-600 rounded-xl flex items-center justify-center text-3xl">
                  🤖
                </div>
                <span className="mt-2 text-sm font-medium">AI Agent</span>
                <span className="text-xs text-gray-500">MCP Client</span>
              </div>
            </div>

            {/* Bottom flow - Services */}
            <div className="mt-8 pt-8 border-t border-gray-700">
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-600 rounded-lg flex items-center justify-center text-2xl mx-auto">
                    🌐
                  </div>
                  <span className="text-xs text-gray-400 mt-1 block">x402 Service</span>
                </div>
                <div className="text-yellow-500">⟷</div>
                <div className="px-4 py-2 bg-gray-800 rounded-lg text-sm">
                  <span className="text-yellow-400">402</span> → <span className="text-purple-400">X-PAYMENT</span> → <span className="text-green-400">200 OK</span>
                </div>
                <div className="text-yellow-500">⟷</div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-perkos-pink rounded-lg flex items-center justify-center text-2xl mx-auto">
                    💰
                  </div>
                  <span className="text-xs text-gray-400 mt-1 block">Facilitator</span>
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-6 mt-6 text-sm text-gray-400">
            <span>🔵 Owns wallet</span>
            <span>🟢 Configures agent</span>
            <span>🟣 Enforces rules</span>
            <span>🟡 Settles payments</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-8 py-16 bg-gray-900/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why PerkKite?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 bg-gray-900 rounded-xl border border-gray-800">
              <div className="text-2xl mb-3">🔐</div>
              <h3 className="text-lg font-semibold mb-2">Secure by Design</h3>
              <p className="text-gray-400 text-sm">
                On-chain spending rules enforced by smart contracts. Your agent can only spend within the limits you set.
              </p>
            </div>
            <div className="p-6 bg-gray-900 rounded-xl border border-gray-800">
              <div className="text-2xl mb-3">⚡</div>
              <h3 className="text-lg font-semibold mb-2">x402 Native</h3>
              <p className="text-gray-400 text-sm">
                Built on the x402 payment protocol. Your agent pays for services with HTTP 402 responses — no API keys needed.
              </p>
            </div>
            <div className="p-6 bg-gray-900 rounded-xl border border-gray-800">
              <div className="text-2xl mb-3">🪁</div>
              <h3 className="text-lg font-semibold mb-2">Kite Agent Passport</h3>
              <p className="text-gray-400 text-sm">
                3-tier identity model: User → Agent → Session. Full control with programmable delegations.
              </p>
            </div>
            <div className="p-6 bg-gray-900 rounded-xl border border-gray-800">
              <div className="text-2xl mb-3">🤖</div>
              <h3 className="text-lg font-semibold mb-2">MCP Ready</h3>
              <p className="text-gray-400 text-sm">
                Connect to Claude Desktop, Cursor, or any MCP-compatible AI client with one-click configuration.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* x402 Flow */}
      <section className="px-8 py-16 bg-gray-900/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">The x402 Payment Flow</h2>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 text-left font-mono text-sm">
            <div className="space-y-3">
              <p><span className="text-gray-500">1.</span> Agent requests service → <span className="text-yellow-400">402 Payment Required</span></p>
              <p><span className="text-gray-500">2.</span> Agent checks spending rules → <span className="text-blue-400">Within budget? ✓</span></p>
              <p><span className="text-gray-500">3.</span> Kite signs payment authorization → <span className="text-purple-400">X-PAYMENT header</span></p>
              <p><span className="text-gray-500">4.</span> Agent retries with payment → <span className="text-green-400">200 OK + response</span></p>
              <p><span className="text-gray-500">5.</span> Facilitator settles on-chain → <span className="text-kite-primary">USDC transferred</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-8 py-24 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Launch Your Agent?</h2>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          Create your first AI agent with secure, delegated payments in minutes.
        </p>
        <Link
          href="/agents/new"
          className="inline-block px-8 py-4 bg-kite-primary hover:bg-kite-secondary rounded-lg font-semibold text-lg transition"
        >
          Get Started →
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-8 py-8 border-t border-gray-800 text-center text-gray-500 text-sm">
        <p>
          Built with 🪁 Kite Agent Passport | Part of the{' '}
          <a href="https://perkos.xyz" target="_blank" rel="noopener noreferrer" className="text-perkos-pink hover:underline">
            PerkOS
          </a>{' '}
          ecosystem
        </p>
      </footer>
    </main>
  );
}

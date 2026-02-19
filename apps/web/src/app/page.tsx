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

      {/* Features */}
      <section className="px-8 py-16">
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

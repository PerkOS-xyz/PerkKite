export default function Dashboard() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-400">Manage your AI agents</p>
        </div>
        <a
          href="/agents/new"
          className="px-4 py-2 bg-kite-primary hover:bg-kite-secondary rounded-lg font-medium transition"
        >
          + New Agent
        </a>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 bg-gray-900 rounded-xl border border-gray-800">
          <h3 className="text-lg font-semibold mb-2">🤖 Agents</h3>
          <p className="text-3xl font-bold">0</p>
        </div>
        <div className="p-6 bg-gray-900 rounded-xl border border-gray-800">
          <h3 className="text-lg font-semibold mb-2">🎫 Sessions</h3>
          <p className="text-3xl font-bold">0</p>
        </div>
        <div className="p-6 bg-gray-900 rounded-xl border border-gray-800">
          <h3 className="text-lg font-semibold mb-2">💰 Spent</h3>
          <p className="text-3xl font-bold">$0.00</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/agents/new"
            className="p-4 border border-gray-700 rounded-lg hover:border-kite-primary transition group"
          >
            <h3 className="font-semibold group-hover:text-kite-primary">🚀 Launch Agent</h3>
            <p className="text-sm text-gray-400">Create a new AI agent with Kite Passport</p>
          </a>
          <a
            href="https://docs.gokite.ai/kite-agent-passport"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 border border-gray-700 rounded-lg hover:border-kite-primary transition group"
          >
            <h3 className="font-semibold group-hover:text-kite-primary">📚 Documentation</h3>
            <p className="text-sm text-gray-400">Learn about Kite Agent Passport</p>
          </a>
        </div>
      </div>

      {/* Agents List Placeholder */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Your Agents</h2>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
          <p className="text-gray-400 mb-4">No agents yet. Create your first agent to get started!</p>
          <a
            href="/agents/new"
            className="inline-block px-6 py-3 bg-kite-primary hover:bg-kite-secondary rounded-lg font-medium transition"
          >
            Create Agent
          </a>
        </div>
      </div>
    </div>
  );
}

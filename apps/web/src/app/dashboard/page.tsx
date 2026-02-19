export default function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <p className="text-gray-400">Connect your wallet to get started.</p>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
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
    </div>
  );
}

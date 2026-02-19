export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-kite-primary to-perkos-pink bg-clip-text text-transparent">
          🪁 PerkKite
        </h1>
        <p className="text-xl text-gray-400 max-w-md">
          Spark for Kite — Launch AI agents with verifiable identity and delegated payments
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <a
            href="/dashboard"
            className="px-6 py-3 bg-kite-primary hover:bg-kite-secondary rounded-lg font-medium transition"
          >
            Launch App
          </a>
          <a
            href="https://docs.gokite.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 border border-gray-700 hover:border-gray-500 rounded-lg font-medium transition"
          >
            Kite Docs
          </a>
        </div>
      </div>
    </main>
  );
}

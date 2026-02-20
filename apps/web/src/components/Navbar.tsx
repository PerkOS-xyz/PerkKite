'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function Navbar() {
  return (
    <nav className="border-b border-gray-800 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          <span>🪁</span>
          <span className="bg-gradient-to-r from-kite-primary to-perkos-pink bg-clip-text text-transparent">
            PerkKite
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-gray-400 hover:text-white transition">
            Dashboard
          </Link>
          <Link href="/marketplace" className="text-gray-400 hover:text-white transition">
            Marketplace
          </Link>
          <ConnectButton showBalance={false} />
        </div>
      </div>
    </nav>
  );
}

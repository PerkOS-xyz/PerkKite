'use client';

import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, getDefaultConfig, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

// Kite Mainnet
const kiteMainnet = {
  id: 2366,
  name: 'Kite',
  nativeCurrency: { name: 'KITE', symbol: 'KITE', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.gokite.ai'] },
  },
  blockExplorers: {
    default: { name: 'KiteScan', url: 'https://kitescan.ai' },
  },
} as const;

// Kite Testnet
const kiteTestnet = {
  id: 2368,
  name: 'Kite Testnet',
  nativeCurrency: { name: 'KITE', symbol: 'KITE', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc-testnet.gokite.ai'] },
  },
  blockExplorers: {
    default: { name: 'KiteScan Testnet', url: 'https://testnet.kitescan.ai' },
  },
  testnet: true,
} as const;

const config = getDefaultConfig({
  appName: 'PerkKite',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo',
  chains: [kiteTestnet, kiteMainnet], // Testnet first for development
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#8B7355', // Kite brown
            accentColorForeground: 'white',
            borderRadius: 'medium',
          })}
          initialChain={kiteTestnet}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

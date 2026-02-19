export const KITE_CHAIN = {
  id: 2368, // Kite testnet chain ID (placeholder)
  name: 'Kite Testnet',
  network: 'kite-testnet',
  nativeCurrency: {
    name: 'Kite',
    symbol: 'KITE',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://rpc-testnet.gokite.ai'] },
    public: { http: ['https://rpc-testnet.gokite.ai'] },
  },
  blockExplorers: {
    default: { name: 'Kite Explorer', url: 'https://testnet.kitescan.ai' },
  },
  testnet: true,
} as const;

export const USDC_ADDRESS = '0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63';

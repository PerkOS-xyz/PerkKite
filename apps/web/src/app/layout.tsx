import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'PerkKite - Spark for Kite',
  description: 'Launch AI agents with Kite Agent Passport',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white min-h-screen">
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}

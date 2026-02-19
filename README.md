<div align="center">

# 🪁 PerkKite

### Spark for Kite — Agent Launcher on Kite Agent Passport

**Launch AI agents with verifiable identity, delegated payments, and programmable governance.**

[![Kite](https://img.shields.io/badge/Kite-Agent_Passport-7C3AED?style=for-the-badge)](https://gokite.ai)
[![PerkOS](https://img.shields.io/badge/PerkOS-Powered-EB1B69?style=for-the-badge)](https://perkos.xyz)

</div>

---

## Features

- 🔐 **Wallet Auth** — Connect with RainbowKit + wagmi
- 🎫 **Kite Passport** — Verifiable agent identity
- 💰 **Delegated Payments** — Sessions with spending rules
- 🛠️ **MCP Integration** — `kite.pay()` for any agent
- 📋 **Skills Management** — YAML-based skill definitions

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local

# Start development
pnpm dev
```

## Project Structure

```
perkkite/
├── apps/
│   ├── web/        # Next.js frontend
│   └── api/        # Express backend
├── packages/
│   ├── shared/     # Shared types
│   └── kite-sdk/   # Kite Passport wrapper
└── docs/           # Documentation
```

## Tech Stack

- **Frontend:** Next.js 15, React, Tailwind CSS, shadcn/ui
- **Auth:** RainbowKit + wagmi
- **Backend:** Express, TypeScript
- **Database:** Firebase Firestore
- **Payments:** Kite Agent Passport

---

Built for ETH Denver 2026 🏔️ — Powered by PerkOS × Kite

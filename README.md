# Revisa Tu Carro

Progressive Web App (PWA) to track car and motorcycle maintenance in Colombia and know, after each service, how many kilometers or how much time remain before it is due again — whichever comes first.

> **Status: planning.** The MVP specification is approved, but there is no application code yet. The setup steps below describe the planned workflow and will be finalized when the project scaffold is created.

## Features

### MVP
- Email + password sign-in.
- Register cars and motorcycles (license plate optional).
- Odometer readings in kilometers, with validation (readings can't go backwards).
- Configurable maintenance rules per vehicle: interval by km, by months, or both (whichever comes first).
- Editable interval suggestions based on the manufacturer's spec sheet — always confirmed by the user.
- Service history (date, km, type, cost, workshop, notes).
- Dashboard of upcoming services: remaining km, remaining days, estimated due date, and status (`ok`, `due soon`, `overdue`).

### Roadmap
- **Phase 2:** Web Push reminders (iPhone requires iOS 16.4+ and the app installed on the Home Screen).
- **Phase 3:** Paid subscription on the hosted service — first vehicle free, additional vehicles paid.
- **Later:** shared vehicles / multiple members per account.

Out of scope for now: file attachments, offline editing, units other than km.

## Tech stack (planned)

| Layer | Technology |
|---|---|
| Frontend + server logic | [Next.js](https://nextjs.org/) (App Router) + TypeScript |
| Database | PostgreSQL via [Supabase](https://supabase.com/) |
| Authentication | Supabase Auth (email + password) |
| Authorization | Server-side checks + PostgreSQL Row Level Security (RLS) |
| Hosting | [Vercel](https://vercel.com/) (initial option) |
| Tests | Vitest (unit/integration), Playwright (end-to-end) |

Exact versions will be pinned in `package.json` and the lockfile when the scaffold is created.

## Getting started (planned)

### Prerequisites
- Node.js (current LTS)
- Git
- A Supabase project, or Docker + Supabase CLI for a local database

### Setup
```bash
git clone https://github.com/diegofandino/revisa-tu-carro-col.git
cd revisa-tu-carro-col
cp .env.example .env.local   # fill in your own values; never commit this file
npm install
npm run dev                  # http://localhost:3000
```

### Environment variables (planned)
| Variable | Exposed to browser | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase publishable (anon) key; access is restricted by RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | **No — server only** | Admin key for trusted server jobs; never use it in client code |

Only `.env.example` (with fictitious values) is tracked in Git.

### Scripts (planned)
| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run lint` | Lint |
| `npm run typecheck` | TypeScript type check |
| `npm test` | Unit and integration tests |
| `npm run build` | Production build |

## Project structure
```
AGENTS.md       Instructions for AI coding agents working on this repo
```

## Development workflow
The project follows Spec-Driven Development: approved spec → small tasks → implementation with tests → independent review → owner review. See [`AGENTS.md`](AGENTS.md).

## Security
Please **do not open public issues for security problems**. Report them privately through GitHub's [private vulnerability reporting](https://github.com/diegofandino/revisa-tu-carro-col/security/advisories/new).

## Contributing
External contributions are not being accepted at this time. A contribution process (including a contributor sign-off/agreement) will be defined before opening the project to contributions.

## Hosted service and self-hosting
The code is open source. The official hosted version will offer the first vehicle for free and a paid subscription for additional vehicles. Anyone may self-host the application under the terms of the license.

## License
Licensed under the [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0). If you run a modified version of this software as a network service, you must make the source code of your modified version available to its users.

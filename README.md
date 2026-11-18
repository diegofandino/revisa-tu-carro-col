# Revisa Tu Carro

Progressive Web App (PWA) to track car and motorcycle maintenance in Colombia and know, after each service, how many kilometers or how much time remain before it is due again — whichever comes first.

> **Status: early development.** Project scaffold, security headers and PWA basics are in place; features are being built per the approved specs.

## Tech stack

| Layer                     | Technology                                                                    |
| ------------------------- | ----------------------------------------------------------------------------- |
| Frontend + server logic   | [Next.js](https://nextjs.org/) 16 (App Router, Turbopack) + TypeScript        |
| Package manager / scripts | [Bun](https://bun.com/)                                                       |
| Database                  | PostgreSQL via [Supabase](https://supabase.com/)                              |
| Authentication            | Supabase Auth (email + password) via `@supabase/ssr` cookies                  |
| Authorization             | Server-side checks + PostgreSQL Row Level Security (RLS)                      |
| Validation                | Zod                                                                           |
| Styling                   | Tailwind CSS                                                                  |
| Hosting                   | [Vercel](https://vercel.com/) (initial option)                                |
| Lint / format             | [Biome](https://biomejs.dev/)                                                 |
| Tests                     | `bun test` (unit/integration), Playwright (end-to-end, iPhone/WebKit profile) |

Exact versions are pinned in `package.json` and `bun.lock`.

## Getting started

### Prerequisites

- Node.js 20.9+ (runtime for Next.js)
- [Bun](https://bun.com/) 1.3+
- [Supabase CLI](https://supabase.com/docs/guides/local-development) and Docker (local database), or a Supabase project

### Setup

```bash
git clone https://github.com/diegofandino/revisa-tu-carro-col.git
cd revisa-tu-carro-col
bun install --frozen-lockfile
cp .env.example .env.local        # fill in your own values; never commit this file
supabase start                    # local Supabase (prints the local URL and publishable key)
bun run dev                       # http://localhost:3000
```

### Scripts

| Command                 | Description                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `bun run dev`           | Start the development server                                                            |
| `bun run lint`          | Biome lint + format check                                                               |
| `bun run format`        | Apply Biome formatting                                                                  |
| `bun run typecheck`     | Route type generation + TypeScript check                                                |
| `bun run test`          | Unit tests (`bun test`)                                                                 |
| `bun run test:coverage` | Unit tests with coverage (90% lines/functions)                                          |
| `bun run test:e2e`      | Production build + Playwright smoke tests (first run: `bunx playwright install webkit`) |
| `bun run build`         | Production build                                                                        |
| `bun run icons`         | Regenerate PWA icons from `assets/icon/icon-source.png`                                 |
| `bun run db:reset`      | Recreate the local database from `supabase/migrations` (local only)                     |
| `bun run db:test`       | pgTAP database tests (RLS, invariants) + concurrency test for the vehicle limit         |
| `bun run db:advisors`   | Supabase security/performance advisors on the local database                            |

## Project structure

```
src/app/            Routes, layout, manifest, icons
src/lib/            Env validation, security (CSP), Supabase clients
src/proxy.ts        Per-request CSP nonce + Supabase session refresh
supabase/           Local config, migrations (schema, RLS) and database tests
e2e/                Playwright tests
assets/icon/        Icon source (SVG)
scripts/            Maintenance scripts (icon generation)
AGENTS.md           Instructions for AI coding agents working on this repo
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

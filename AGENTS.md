# Vehicle Maintenance PWA — Project Instructions

## Goal
Build a Progressive Web App (PWA), comfortable to use on iPhone, to track vehicle maintenance and estimate when the next service is due based on mileage and/or time. The first user will be the project owner, with several vehicles (for example, a car and a motorcycle). The design must allow adding more users and sharing accounts/vehicles in a later phase, without prematurely implementing invitations or collaboration.

## Status and scope
- At this stage we are defining and planning; do not assume an implementation, Git repository, database, or deployment exists.
- Before coding, review this file, the actual state of the repository, existing instructions, scripts, dependencies, and tests.
- Work in small, well-scoped tasks. Do not start code changes until the user approves the corresponding plan/specification.
- Do not create commits, publish, push, or deploy without explicit user authorization.

## Proposed stack (confirm in the plan before pinning dependencies)
- Next.js + TypeScript for the PWA UI and backend logic (Server Actions/server routes where appropriate).
- PostgreSQL and authentication managed by Supabase.
- Vercel as the initial hosting option for Next.js; evaluate plans and limits before relying on a free tier.
- Keep clear boundaries between UI, server-side validation/authorization, domain, and data access. Do not create microservices for the MVP.
- PWA first. Web Push for iPhone is a later phase, after history and calculations are validated.
- Possible future migration to a VPS/homelab; avoid unnecessary vendor lock-in and document backup/restore.

## Domain and data
Initial model, to be validated in the specification:
- `users`: authenticated identities.
- `accounts`: logical space/owner; initially there will be a single user/account.
- `account_members`: membership and role per account, to enable future collaboration when requested.
- `vehicles`: vehicles associated with an account; support classes such as car and motorcycle.
- `odometer_readings`: dated, historical readings per vehicle.
- `maintenance_types`: service catalog (oil, filters, brakes, fluids, tires, etc.).
- `maintenance_rules`: configurable intervals per vehicle and service type, by mileage and/or time.
- `service_records`: work actually performed, stored as immutable history except for explicit corrections.
- `push_subscriptions`: device subscriptions, only when push notifications are implemented.

Do not hard-code generic mechanical intervals as universal. Allow configuration based on the manufacturer's manual and usage conditions. Average mileage is used to estimate dates, not to replace maintenance recommendations. Validate inconsistent readings while allowing auditable corrections.

## Security and privacy
- Apply the secure engineering policy approved by the user and the repository rules.
- Treat the client and received data as untrusted. Validate inputs on the server.
- Design data with account association from the start, and implement server-side authorization on every read/write before adding collaboration. Do not rely on hiding records in the UI.
- Apply least privilege and per-account/per-user isolation in queries, mutations, and scheduled jobs; consider PostgreSQL/Supabase RLS policies where appropriate.
- Do not expose secret keys in the frontend, logs, commits, or documentation. Use a Git-ignored `.env.local` and keep `.env.example` with names and fictitious values only.
- Do not record more personal data than necessary. Do not use real data in test fixtures.
- Notifications must not be duplicated: design idempotency/send logs and handle revoked permissions.
- Do not use notification jobs as an artificial mechanism to prevent Supabase Free from pausing; a free plan must not be considered an availability guarantee.

## SDD and agent workflow (user preference)
Follow Spec-Driven Development: short spec approved by the user → small tasks → implementation → tests → independent review → user review. Find and use the existing SDD skill if available; do not claim it exists or install another one without authorization.

Preferred roles, subject to actual Herdr availability/configuration:
1. Planner: Claude Opus with low effort; writes requirements, decisions, acceptance criteria, model/flow, and risks, flagging assumptions and open questions.
2. Coder: Claude Opus with medium effort; works only on the approved task and adds/modifies the necessary tests.
3. Independent reviewer: Astra model with low effort for scoped changes; raise effort only for complex or sensitive changes. Review the diff against the spec and report verifiable findings (severity, file/line, impact, fix, and test coverage). Confirm real names/models and effort options in Herdr before automating.

The reviewer does not replace lint, type checking, tests, build, or human review. For changes to authorization, multi-account, migrations, notifications, or secrets, perform an explicit security review and negative tests. Limit each agent's context to the relevant spec, required files, diff, and actual test output to control cost/tokens.

## Git and user review
- Create small, understandable commits focused on one task, with messages that explain the change (for example, `docs: define maintenance MVP scope`).
- Before changes: check `git status` and preserve existing work.
- Do not include secrets, personal data, or generated artifacts.
- The user wants to review changes per task; stop and present a summary/diff and checks before moving to the next task or creating the commit, according to the authorization given.
- Do not rewrite history, push, or merge without explicit permission.

## Quality criteria
- Test normal cases, boundaries, invalid inputs, errors, duplicates, and unauthorized cross-account access.
- Run the project's real commands for lint/format, types, tests, and build; report exactly what was run and the results. Do not claim a check that did not happen.
- Document decisions and assumptions; separate existing facts from proposals.
- Do not claim the application is production-ready just because it compiles.

## Candidate first tasks (provisional order)
1. Confirm MVP scope and rules for time/distance intervals.
2. Write the SDD specification and acceptance criteria for vehicles, readings, and service history.
3. Propose and review the relational schema/migrations and authorization boundaries.
4. Create a minimal Next.js/TypeScript scaffold, basic PWA, and secure configuration.
5. Implement create/read of vehicles, odometer readings, and maintenance records with tests.
6. Add calculations and an upcoming-services dashboard.
7. Evaluate Web Push, hosting, backups, and operations before relying on reminders.

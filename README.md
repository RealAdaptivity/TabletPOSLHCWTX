# TabletPOSLHCWTX

Car-wash membership app + hidden employee point-of-sale, built with **Expo (React Native)** and **Supabase**.

Two experiences live in one app:

- **Customer portal** — sign up / log in, manage vehicles, view membership plans, earn reward points (on washes and daily logins).
- **CSA Mode** (hidden) — authorized employees log in with their existing PIN to ring up washes and memberships. Every sale is tied to the employee for commission and management reporting. Designed to connect to the **DRB Paetheon API** for billing and sales sync when that API is available.

> This is the initial scaffold: auth, data model, navigation, and the core screens. Payments/checkout are intentionally stubbed until the DRB Paetheon integration is wired in.

## Tech stack

| Layer | Choice |
|-------|--------|
| App | Expo SDK 52, React Native 0.76, expo-router (file-based routing), TypeScript |
| Backend | Supabase (Postgres + Auth + RLS) — project `pbgatghmutejbsmcedsw` |
| Auth (customers) | Supabase email/password |
| Auth (employees) | PIN verified against the existing `public.users` table via a `SECURITY DEFINER` RPC |

## Getting started

```bash
npm install
cp .env.example .env      # values are publishable client keys, safe to use
npm start                 # then press i (iOS), a (Android), or scan the QR in Expo Go
```

Requires Node 18+ and the Expo Go app (or a dev build) on your device/simulator.

## Project structure

```
app/                       # expo-router routes
  (auth)/login.tsx         # customer login  (+ 5-tap secret CSA entry on the logo)
  (auth)/signup.tsx
  (customer)/index.tsx     # home / dashboard
  (customer)/vehicles.tsx  # add / manage vehicles
  (customer)/membership.tsx# plans (checkout stubbed until DRB)
  (customer)/rewards.tsx   # points balance + ledger
  csa/pin.tsx              # employee PIN keypad
  csa/pos.tsx              # point-of-sale + today's sales tracker
src/
  lib/supabase.ts          # typed Supabase client
  lib/auth.tsx             # customer session + profile + daily reward
  lib/csa.tsx              # CSA (employee) session + sale recording
  lib/database.types.ts    # hand-authored DB types
  components/ui.tsx        # shared UI primitives
  theme.ts                 # design tokens
supabase/migrations/       # SQL applied to the Supabase project
```

## Accessing CSA Mode

On the login screen, tap the round logo **5 times quickly**. This opens the employee PIN keypad. Enter a valid employee PIN (from the existing `public.users` staff records) to start a shift.

## Data model (new tables)

`membership_plans`, `customers`, `vehicles`, `memberships`, `sales`, `wash_history`, `reward_transactions`.
These are **additive** — the existing staff / time-clock tables (`users`, `time_logs`, `schedules`, …) in the same Supabase project are untouched, and CSA Mode reuses `public.users` for employee identity.

## Security notes

- All new tables have Row Level Security enabled. Customers can only read/write their own rows.
- `public.sales` is locked to client keys; all writes go through PIN-validating `SECURITY DEFINER` RPCs (`csa_record_sale`, `csa_shift_summary`).
- The Supabase key in `.env.example` is the **publishable** key (RLS-protected), not the `service_role` secret.

## TODO / next steps

- Wire the **DRB Paetheon API** for membership billing, in-app purchase, and sales sync.
- Management dashboard: % retail vs. memberships sold, per-employee commission reporting.
- Attach a customer/vehicle to a POS sale (customer lookup in CSA Mode).
- Harden employee PIN verification (rate limiting / move behind an Edge Function).
- Push notifications for wash reminders and membership renewals.

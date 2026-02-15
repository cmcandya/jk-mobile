# JK-Mobile - Project Memory

> Jobsite Kiosk native mobile app. Separate UI from the web app, shared Supabase backend.

## Project Overview

Native mobile app for field operations on construction sites. Built with Expo (React Native) + TypeScript. Covers attendance, LOTO, compliance, and inspections — all offline-capable.

**Stack:** Expo (React Native), React, TypeScript, expo-sqlite, Supabase

**Target devices:** Android phone, Android tablet, iPad, iPhone

## Related Projects

| Project | Location | Relationship |
|---------|----------|-------------|
| **Web App** | `C:\Users\andya\Documents\Websites\jobsite-kiosk-3` | Same Supabase backend, separate UI |
| **Mobile Strategy** | `../jobsite-kiosk-3/docs/MOBILE-APP-STRATEGY.md` | Architecture decisions, offline sync design |
| **Web API Docs** | `../jobsite-kiosk-3/docs/API.md` | API endpoints this app calls |
| **Web DB Schema** | `../jobsite-kiosk-3/docs/DATABASE.md` | Supabase schema (shared) |

## Quick Links

- **Full Documentation:** [docs/INDEX.md](./docs/INDEX.md)
- **Mobile Strategy:** [../jobsite-kiosk-3/docs/MOBILE-APP-STRATEGY.md](../jobsite-kiosk-3/docs/MOBILE-APP-STRATEGY.md)

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Expo (React Native) |
| **Language** | TypeScript |
| **Local Database** | expo-sqlite (SQLite) |
| **Sync** | Custom queue → Supabase API |
| **Backend** | Supabase (shared with web app) |
| **Builds** | Expo EAS Build |

## Supabase Backend (shared)

Same database as the web app:
- **Project ID:** `uuyewnoocyixkrcnmigz`
- **Auth:** Supabase Auth (email/password)
- **Storage:** Supabase Storage (signatures, inspection photos)
- **Key tables:** `attendance`, `loto_lockouts`, `loto_panels`, `loto_areas`, `loto_panel_inspections`, `compliance_signatures`, `job_sites`, `workers`, `profiles`

## What This App Covers (field operations)

| Feature | Offline? |
|---------|----------|
| Worker check-in / check-out | Yes |
| LOTO lockout / unlock | Yes |
| LOTO inspections + photos | Yes |
| Compliance document signing | Yes |
| View worker lists | Read cache |
| View panel/area status | Read cache |
| View attendance | Read cache + local writes |
| Take site photos | Yes (upload when connected) |

## What This App Does NOT Cover (web-only)

- Job site creation/setup
- Subcontractor management
- User management (GC roles, invitations)
- Org charts
- PDF report generation
- System settings, billing

## Offline Architecture

- **Download:** User opens a job site → data syncs to SQLite
- **Writes:** Actions queue in `pending_operations` table, sync when connected
- **Photos:** Three tiers (thumbnail always, preview on view, full on demand)
- **Key rules:** Client-generated UUIDs, idempotent endpoints, dependency ordering in queue

See full details in [MOBILE-APP-STRATEGY.md](../jobsite-kiosk-3/docs/MOBILE-APP-STRATEGY.md).

## Development

```bash
npx expo start          # Start dev server (scan QR with Expo Go)
npx expo start --clear  # Start with cleared cache
```

### Testing on devices
- **Android:** Expo Go app, scan QR code
- **iPad/iPhone:** Camera app → scan QR → opens in Expo Go
- **Development builds:** `eas build --profile development`

## Design Direction

- Mobile-first, not a responsive version of the web app
- Separate UI optimized for touch, offline, field use
- Reference: FieldWire app design (screenshots in `C:\Users\andya\Dropbox\JK`)
- Professional, clean aesthetic — generous whitespace, clear hierarchy

## Global Resources

| Resource | Location |
|----------|----------|
| Agent Roster | `C:\Users\andya\Documents\Websites\AGENTS.md` |
| Web App | `C:\Users\andya\Documents\Websites\jobsite-kiosk-3` |
| FieldWire Screenshots | `C:\Users\andya\Dropbox\JK` |

## Constraints

- **Bilingual:** English/Spanish
- **Offline-first:** Must work without internet on remote job sites
- **Same backend:** All data goes to/from the same Supabase instance as the web app
- **No wrappers:** This is a real native app, not a web view in a shell

## After Making Changes

1. Update relevant doc files
2. Keep CLAUDE.md current with architectural decisions
3. Note any new Supabase tables/columns needed (coordinate with web app)

---

*Last updated: 2026-02-15*

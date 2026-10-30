# BDR Dragon Workspace

A separate, working BDR workspace based on [SDR-Metrics](https://github.com/noahcoleman76/SDR-Metrics), inspected at commit `40bc948502588815d444d13c7716b60d0d5680d7`. The original repository and production deployment were not modified.

The new source destination is [DX-BDR-Dragon](https://github.com/noahcoleman76/DX-BDR-Dragon). This directory is an independent frontend project and Git repository. It contains no original backend, authentication provider, credentials, API integration, or Vercel project identity.

## Start locally

Use Node.js 24 (also specified in `.nvmrc`):

```powershell
npm ci
npm run dev
```

The app opens without authentication, API keys or a database. It starts with no accounts, contacts, messages or tasks.

```powershell
npm run build
npm run lint
npm test
npm run preview
```

The build outputs `dist/`. The lockfile records the verified dependency versions.

## What was retained from SDR-Metrics

- React, TypeScript, Vite, React Router, Tailwind CSS, Lucide icons, clsx, dnd-kit and Oxlint.
- The actual expanding sidebar and mobile navigation implementation, adapted to exactly Home, Tasks, Accounts and Settings. Removed navigation and backend features are not linked or mounted.
- Original dragon branding assets, theme-specific logos, honeycomb textures, background effects, fonts, colors, surface styling, borders, spacing, hover effects and theme tokens.
- The actual `ThemeProvider`, `BrandLogo`, `Button`, `PageHeader`, `AppSelect`, `Modal`, `ConfirmDialog` and `DraggableRow` implementations. Dialogs gained native focus containment and Escape support; dropdown menus can render inside a dialog; drag handles gained accessible labels and touch behavior.
- The actual Settings appearance section, including all 22 accent choices in Basic, Jewel, Neon and Soft groups, and the logo-based light/dark switch. Theme and accent persistence use the original implementation.
- Inline fields were extended for multiline text, editable dates, field-level updates, draft retention and safe blur/unmount saves. The Accounts workflow needs capabilities beyond the original simple inline text field.

The original client is organized as a standalone frontend here; its Express/Prisma backend is unnecessary for this browser-local prototype. Unused spreadsheet import/export and reporting dependencies were excluded.

## Settings dependency that is deliberately excluded

The original Settings page also has a Change password form. It calls the authenticated `/auth/change-password` endpoint and depends on the original login/session backend. The brief explicitly excludes authentication and password management, so that form and its API dependencies are not included. The original appearance section, layout, theme controls and all accent options remain functional. No broken password button or mock password service was substituted.

## Features

**Home:** a minimal placeholder using the retained page header and app shell.

**Tasks:** Daily Recurring Tasks, Weekly Recurring Tasks and Ad Hoc Tasks support creation, notes, editing, deletion, completion and manual ordering. Daily tasks reset on the next local calendar day; weekly tasks reset Monday. Checks run on load, focus, visibility changes, at midnight and periodically while open. Completed recurring tasks remain visible until their period ends. Ad hoc tasks never reset; completed tasks show their completion date and can be reopened at the top of the open list.

**Accounts:** a narrow, independently scrollable account list and wider workspace; name search and owner filtering work together. Accounts can be created with only a name. Owner accents are persistent and consistent, and unassigned accounts stay neutral. Account links expand independently of selection. On mobile, a Back control switches between the list and account workspace.

**Overview:** editable website/CRM links, optional Last Worked date, Company Description and Notes. Fields save on blur, before unmount and before browser unload. Field-level patches merge into the latest record. Editing other fields does not change Last Worked. Account and contact date pickers were verified through refresh.

**Messaging:** account templates and contact templates remain separate. Each supports Email, LinkedIn and Call Script, Current/Previous status, filtering, expandable full text, editing and confirmed deletion. Ordering is Current first, then type order, then newest within each group. Line breaks are retained.

**Contacts:** expandable cards, editable name/title/links/date, blur-saved notes and personal messaging.

**Account tasks:** the same ad hoc task records displayed on Tasks, related through `accountId`. Notes initially contain the account name and can be changed or removed. Completion, reopening, edits, deletion and ordering are synchronized through one store. The account view is a subset of the global task order. Pointer drag and up/down buttons both update that order.

**Deletion policy:** every destructive action asks for confirmation. Deleting a contact removes its personal messages. Deleting an account removes its contacts and account/contact messages; its tasks are retained as unassigned tasks on the main Tasks page. The confirmation explicitly states these consequences.

## Storage and migration boundary

`src/data/model.ts` defines Account, Contact, Message and Task records with stable UUIDs and timestamps. `WorkspaceStore` in `src/data/store.ts` is the sole shared state layer. The `Persistence` interface isolates storage access; `LocalPersistence` serializes versioned records under `bdr-workspace:v1` in localStorage.

All changes persist across route changes and refreshes. Recurring completion has a local calendar period key, separate from permanent ad hoc completion. Owner color assignments and task sort order are persisted. Storage write failures keep edits in memory and show a retry warning. Unreadable stored data is preserved instead of overwritten.

Data belongs to the browser profile and site origin. Local development and a deployed URL have separate records. Clearing site data removes those records. There is no cross-device or simultaneous multi-tab editing coordination in this prototype. A future authenticated database can replace the persistence boundary while keeping the UI and task relationships.

## File summary

| Area | Files and purpose |
| --- | --- |
| Retained shell and theme | `src/layouts/AppLayout.tsx`, `src/context/ThemeContext.tsx`, `src/components/BrandLogo.tsx`, `src/index.css`, `public/` |
| Retained/adapted UI | `Button.tsx`, `PageHeader.tsx`, `AppSelect.tsx`, `Modal.tsx`, `ConfirmDialog.tsx`, `DraggableRow.tsx`, `InlineField.tsx` in `src/components/` |
| Shared data | `src/data/model.ts`, `store.ts`, `react.ts`: models, local persistence, shared operations, React subscription |
| New workflows | `src/pages/AccountsPage.tsx`, `TasksPage.tsx`; `src/components/Contacts.tsx`, `Messages.tsx`, `TaskList.tsx`, `UI.tsx` |
| Settings | `src/pages/SettingsPage.tsx`: retained appearance implementation; password form excluded as described above |
| Routes and styling | `src/App.tsx`, `src/workspace.css`: four routes, recurrence scheduler, workspace extensions to the retained design tokens |
| Build and deployment | `package.json`, `package-lock.json`, `vite.config.ts`, `vercel.json`, `index.html`, `.nvmrc`, `.vercelignore`, TypeScript configuration |
| Verification | `tests/workspace.test.ts`, `VERIFICATION.md` |

## Verification

Production build and TypeScript checking passed. Oxlint passed. All 18 automated tests passed, including a run with `TZ=America/Denver`. Browser checks covered account CRUD, filtering, autosave and dates, account/contact messaging, shared task transitions and persistent ordering, the actual Settings controls, and desktop/mobile layouts. See [VERIFICATION.md](VERIFICATION.md) for evidence and limits.

## Deploy as a separate Vercel project

The Vercel project `dx-bdr-dragon` is connected to `noahcoleman76/DX-BDR-Dragon` with Node.js 24, the Vite preset, `npm ci`, `npm run build`, and `dist` output. Pushes to `main` trigger production deployments. The original SDR-Metrics project remains separate.

1. In Vercel, select **Add New → Project** and import **noahcoleman76/DX-BDR-Dragon**. Create a new project named `dx-bdr-workspace` or another unused name. Do not import or link the SDR-Metrics production project.
2. Use the repository root as Root Directory, **Vite** as Framework Preset, Node.js **24.x**, install command `npm ci`, build command `npm run build`, and output directory `dist`.
3. No environment variables, database or authentication setup are required. The included `vercel.json` retains the source app's SPA rewrite for direct navigation and refresh on `/tasks`, `/accounts` and `/settings`.
4. Deploy the new project. Check account creation, refresh persistence and task synchronization on the new URL. Browser-local preview records do not automatically transfer to that origin.

Alternatively, from this directory:

```powershell
npx vercel
```

Choose **N** when asked whether to link to an existing project, then name the new project. After verifying its identity and preview:

```powershell
npx vercel --prod
```

Official references: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite), [CLI deployment](https://vercel.com/docs/projects/deploy-from-cli), [project linking](https://vercel.com/docs/cli/project-linking).

## Logical future improvements — not implemented

- Authenticated database persistence behind the existing storage boundary.
- Workspace export/import and backup recovery.
- Coordinated editing across tabs and devices.

# BDR Workspace — implementation checkpoint

The account/task implementation is working and verified. **Final design integration is pending the newer BDR Dragon source that the user is providing.** This checkpoint uses the older public source only as an interim shell. It is not a claim that the newer design or Settings page has been preserved.

## Run locally

Use Node.js 24 and npm in this directory:

```powershell
npm ci
npm run dev
```

Verification commands:

```powershell
npm run build
npm run lint
npm test
```

## Implemented behavior

- Four routes: Home, Tasks, Accounts, Settings. Home is intentionally minimal.
- Daily tasks reset on the browser's next local calendar date; weekly tasks reset Monday. Reset checks run on load, focus, visibility changes, at midnight, and while the app remains open.
- One shared task collection powers main Ad Hoc Tasks and account task subsets. Creation, completion, reopening, edits, deletion and ordering use stable IDs and the same store operations.
- Pointer drag handles and keyboard-accessible up/down controls change the same persisted order. Completed ad hoc tasks have a completion timestamp and Reopen action.
- Accounts have name-only creation, optional owner/links, combined name search and owner filtering, expandable links, and persistent owner accent colors.
- Overview fields save on blur and before unmount or browser unload. Updates merge individual fields into the latest stored record. Account and contact date pickers have been verified through refresh.
- Account and contact messages are separate collections, ordered Current/Previous, Email/LinkedIn/Call Script, then newest first. Filtering does not mutate stored order.
- Expandable contacts support inline edits, notes, dates and personal message templates.
- Destructive actions require an in-app confirmation. Deleting a contact removes its personal messages. Deleting an account removes its contacts and account/contact messages, while keeping associated tasks as unassigned tasks. The confirmation explains this policy.
- The app starts empty. No sample accounts or runtime records are embedded in the source.

## Data storage

`src/data/store.ts` defines a central `WorkspaceStore` and a replaceable `Persistence` interface. `LocalPersistence` serializes a versioned workspace under `bdr-workspace:v1` in localStorage. There is no API, shared database, authentication or connection to the original backend.

Records belong to this browser profile and site origin. Local development and a deployed URL have separate storage. Clearing browser site data removes records. Open the workspace in one tab while editing; simultaneous editing in multiple tabs is not coordinated in this prototype. Storage write failures retain edits in memory and display a retry warning. Unreadable or unrecognized stored data is preserved instead of overwritten.

## Inspected source and isolation

Interim source: https://github.com/noahcoleman76/BDR-Dragon at `705fde0737ff59a9b79587449b9f292a65233227`.

The source was cloned read-only into the task's work directory. This application has its own local Git repository, no remote pointing to the original, no Vercel project link, no copied environment file, and no original deployment scripts. Nothing was pushed to or deployed over the original.

The inspected version uses React 19, Vite, TypeScript, React Router, Tailwind CSS and ESLint. `Layout.tsx`, `DarkModeToggle.tsx`, `main.tsx` and the Tailwind foundation were retained; navigation was adapted to four routes. No new runtime libraries were added.

**Source mismatch:** that older version has Dashboard, Forecast, Tasks, Market, Account and Admin routes. It has no Settings route or Opportunities entry and no custom logo asset in use; its branding is the text “BDR Dragon”. Its Account page depends on `/users/me` and `/auth/change-password` for user identity, quotas and password management. Those dependencies are excluded from this local, unauthenticated prototype. `SettingsPage.tsx` is an interim preferences placeholder, not the requested Settings implementation. It must be replaced after the newer source arrives.

## Files

- `src/data/model.ts`: record schemas, local recurrence periods, sorting, owners and URL handling.
- `src/data/store.ts`: shared state, persistence adapter, record operations and ordering.
- `src/data/react.ts`: React subscription to the shared store.
- `src/components/UI.tsx`: modal, confirmation, form, autosave and link controls.
- `src/components/TaskList.tsx`: shared task editor and task views.
- `src/components/Messages.tsx`: reusable account/contact messaging.
- `src/components/Contacts.tsx`: contact details and personal messages.
- `src/pages/TasksPage.tsx`, `AccountsPage.tsx`, `SettingsPage.tsx`: workspace pages.
- `src/App.tsx`, `components/NavBar.tsx`, `index.css`: routes, recurrence scheduler and interim shell integration.
- `vite.config.ts`, `vercel.json`, `index.html`, `package.json`, `package-lock.json`: independent build and deployment configuration.
- `tests/workspace.test.ts`: 18 focused data-layer tests.

## Verification completed on this checkpoint

- Production build: passed, including TypeScript checking.
- ESLint: passed with no errors or warnings.
- Automated tests: 18 passed, 0 failed. Also run with `TZ=America/Denver`.
- Browser: name-only/full account creation; owner color changes; combined owner/search filtering; expanded account links; all account tabs; Overview blur saves and refresh; account switching; account and contact date persistence; message type/status ordering and filtering; contact details and isolated personal messages; task creation from an account; completion on Tasks; reopening from the account; shared notes edits; daily completion after refresh; pointer drag and arrow ordering after refresh; explicit deletion policy and confirmations.
- Mobile: 390 × 844 viewport; account list/detail switch works; document width matched content width without horizontal overflow.
- Browser console: no errors observed during the verified workflows.
- Recurrence date boundaries, Monday, year/month rollover, leap day and daylight-saving dates are covered by automated tests with an injected clock. The machine clock was not changed.
- Original cloned source: clean; no original deployment actions performed.

The build emitted an advisory about the age of the bundled Browserslist compatibility data. It did not fail the build.

## Separate Vercel deployment, after final source integration

Vercel is not connected in the current session; no production URL has been created. Do not deploy this checkpoint as the final application until the newer design and Settings implementation have been integrated.

1. Create a new empty GitHub repository named `bdr-workspace` (or another new name). Push this app directory as its root. Do not set the original BDR Dragon repository as this project's remote.
2. In Vercel, create a **new project** and import the new repository. Use the repository root, Vite preset, `npm run build`, and output directory `dist`. No environment variables or database setup are required.
3. Deploy the new project. The included `vercel.json` supplies SPA route fallback so `/tasks`, `/accounts`, and `/settings` support direct navigation and refresh.
4. Recheck creation, refresh persistence and task synchronization on the new origin. Local preview records do not move automatically to that origin.

Alternatively, from this directory, use `npx vercel` and choose **not to link to an existing project**; give the new project a unique name. After verifying the preview and new project identity, run `npx vercel --prod`.

Official references: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite), [CLI project deployment](https://vercel.com/docs/projects/deploy-from-cli), [project linking](https://vercel.com/docs/cli/project-linking).

## Future improvements, not implemented

- Authenticated database persistence behind the existing adapter boundary.
- Explicit workspace export/import and backup recovery.
- Coordination for simultaneous tabs or multiple devices.

Next required input: the newer BDR Dragon repository or project URL, to inspect its real shell, assets, shared components, responsive behavior and Settings dependencies before final integration.

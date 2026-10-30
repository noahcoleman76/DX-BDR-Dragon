# Verification results

Verified October 30, 2026. Final foundation: SDR-Metrics commit `40bc948502588815d444d13c7716b60d0d5680d7`.

## Automated checks

- `npm run build`: passed. Includes strict TypeScript checking and the Vite production build.
- `npm run lint`: passed using the source project's Oxlint workflow.
- `npm test`: 18 passed, 0 failed. Also verified with `TZ=America/Denver`.
- `npm ls --depth=0`: all declared dependencies resolved without missing or invalid packages.

The focused tests verify:

1. Empty initial storage and name-only account creation.
2. Field-level account merging without changing Last Worked implicitly.
3. Persistence of all record collections, multiline content, order and owner colors.
4. One stable task record through create, complete, edit, reopen and delete from shared views.
5. New/reopened task placement and consistency between account subsets and global order.
6. Downward reordering and isolation between recurring categories.
7. Local midnight daily resets without resetting ad hoc tasks.
8. Monday weekly reset and completion retention through Sunday.
9. Recurrence normalization and persistence when reopening after time away.
10. Month/year rollover, leap day and daylight-saving calendar boundaries.
11. Stable, normalized owner colors and neutral unassigned accounts.
12. Account/contact message separation and contact deletion cleanup.
13. Message status/type/newest ordering and status-change movement.
14. Account deletion cleanup with preservation of unassigned task history.
15. Protection against overwriting unreadable stored data.
16. In-memory retention and retry after persistence write failures.
17. Required names and valid parent relationships.
18. Safe website URL handling.

## Browser verification

The core workflows were checked during implementation and rechecked after integration with the actual SDR-Metrics shell. Temporary QA records were removed afterward. The final source contains no seed accounts, contacts, messages or tasks.

- Name-only account creation; account creation with links and owner; account selection and independent link expansion.
- Owner changes update the accent, and combined owner filtering/name search works through the retained AppSelect menu.
- All four account tabs are reachable; drafts remain mounted when tabs change.
- Company Description and Notes survive blur, account/page navigation and refresh. Last Worked and Last Contacted persist after actual focus/edit/blur and refresh; blank values are supported.
- Account messages cover all three types and both statuses; status edits reorder cards. Message type filtering leaves stored order unchanged. The retained dropdown works inside the accessible modal.
- Contact creation, expansion, title/notes editing and personal messaging. Personal templates remain absent from account templates.
- Account tasks appear on the main Tasks page. Completing there updates the account view; reopening in the account restores the task on Tasks. Shared notes and completion dates persist.
- The retained dnd-kit DraggableRow successfully reorders account tasks. The order survives refresh and appears identically on the main Tasks page. Up/down controls also persist the shared order.
- Daily completion remains checked after refresh. Date-boundary reset behavior is tested with an injected clock rather than changing the user's machine clock.
- Original logo assets load. Settings has all 22 original accent choices. Selecting Neon Mint and switching to dark via the logo both persist after refresh; the dark logo is selected correctly. The default Sky/light appearance was restored after testing.
- Desktop: 1440 × 960, two independent account columns; document width matched the viewport. Mobile: 390 × 844, list/detail switch works and content width matches document width without horizontal overflow.
- No browser console errors observed during checked workflows.
- Confirmations describe permanent record removal and account-task retention accurately.

## Isolation and deployment limits

The SDR-Metrics clone remained clean at the inspected commit. No original source changes were pushed and no original deployment was touched. The new application has a separate Git repository and Vercel configuration, and no copied API client, authentication provider or environment credentials.

No Vercel deployment was attempted because the Vercel connection is unavailable. The production build was exercised through a local preview, not a Vercel-hosted URL. Vercel project creation and post-deployment smoke checks remain for the account owner; exact steps are in README.md.

This is browser-local storage: records do not synchronize across devices, origins or simultaneous tabs. The original authenticated password-change feature is excluded as required by the no-authentication/no-password-management scope.

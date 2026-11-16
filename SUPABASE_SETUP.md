# BDR Dragon cloud setup

Project: **BDR Dragon**, organization **Noman LLC**, reference `avdbxkplkszlrodankjs`.

[Supabase project](https://supabase.com/dashboard/project/avdbxkplkszlrodankjs)

## Browser setup and first sign-in

1. In Supabase, open **Authentication → URL Configuration**. Set **Site URL** to `https://dx-bdr-dragon.vercel.app` and add `https://dx-bdr-dragon.vercel.app/` to **Redirect URLs**. Save. This has been completed by the project owner.
2. Open [BDR Dragon](https://dx-bdr-dragon.vercel.app/) in the same browser/profile where you previously entered your records.
3. Enter your email and click **Email me a sign-in link**. For the initial setup, use the email associated with your Supabase organization account. Supabase's built-in email delivery restricts recipients; configure a custom SMTP provider in Supabase before adding other recipients or relying on higher email volumes.
4. Open the emailed link on that device. A Supabase dashboard login and a BDR Dragon app login are separate sessions.
5. If the app detects existing browser records, optionally click **Download backup**, then **Import browser records**. Wait for **Saved to cloud**. The original `bdr-workspace:v1` browser records are retained. Import adds records missing from the cloud; existing cloud records with the same IDs take precedence.
6. On another device, open the app and sign in with the same email. Your cloud records will load. Use the emailed link on the device you are signing into.

If delivery fails, check Supabase **Authentication → Logs** and **Authentication → Email / SMTP settings**, including sender setup and recipient restrictions. Do not share database passwords, secret keys, service-role keys, access tokens, or email sign-in links in chat.

## Application configuration

The following public client variables are configured in Vercel Production and Preview:

```text
VITE_SUPABASE_URL=https://avdbxkplkszlrodankjs.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key from Supabase API Keys>
```

Only the publishable key is needed by the frontend. No privileged Supabase key is used. Redeploy after changing these variables. For local cloud testing, put the same variables in an ignored `.env.production.local`, run `npm run build`, and then `npm run preview`. Add your local origin to Supabase's redirect allowlist if you also want to sign in locally. With neither variable set, local development retains its original local-only behavior. Partial configuration fails closed with a setup error.

## Data and synchronization

Each authenticated user owns one private workspace in `public.bdr_workspaces`. Both tables have RLS, with ownership checks based on `auth.uid()`. Anonymous API access is revoked. The save RPC uses invoker permissions and additionally checks the expected user ID to prevent an in-flight save from crossing accounts during sign-out/sign-in.

Saves send record-level field changes, rather than replacing the entire workspace from a possibly stale device. The server locks the workspace row, merges the changes atomically, increments a revision, and records a mutation ID. Retrying a request after a lost response does not reapply an older change. Concurrent edits to different fields are merged; when the same field is edited on multiple devices, the last successfully applied edit wins. Account/contact deletions cascade through their dependent messages; account tasks become unassigned. Stale edits do not resurrect deleted records.

Realtime notifications refresh the signed-in user's workspace, with a 20-second polling fallback and refresh on focus/reconnection. Offline changes are queued in a cache scoped to the project and user. They are replayed when connected, and rebased on the latest server data. Sign-out affects only the current device. Device appearance preferences remain local.

`supabase/schema.sql` is a reference copy of the new project's schema, already applied through tracked Supabase migrations. It is not an instruction to rerun the schema against an existing project.

## Verification

The database was tested inside rolled-back transactions for private user isolation, blocked cross-user updates, field merges, retry deduplication, and delete cascades. The security advisor reported no findings. Automated app tests cover offline/reconnect behavior, imports, concurrent edits, late responses after closing a session, and the existing workspace features. Actual email delivery, first sign-in, and import must be completed in the user's browser using their own email.

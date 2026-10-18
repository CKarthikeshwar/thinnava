# Setting up a laptop for Thinnava development

Do this once on **every laptop** you build on. Each laptop runs its **own local sandbox** (Supabase in Docker), so development never touches real users' data. Hosted Supabase is used only for `thinnava-prod` (spec §27.2, §33.4).

## 1. Tools
- **Git** and the **GitHub CLI** (`gh auth login`), then `gh repo clone CKarthikeshwar/thinnava`.
- **Node.js** (LTS or newer) and **Java 17**. Android Studio installs Java and the Android SDK.
- **Android Studio** (for the Android SDK and `adb`).
- **Docker Desktop**: open it once and accept its terms. It must be running whenever you use the sandbox. It needs about 1.5 GB of free memory; close heavy apps first.
- **Chrome** for the web version.

## 2. Secrets (never committed)
Both files are git-ignored. Never paste their values into chat, issues, commits or screenshots. Get missing values from the other owner privately.

1. `app/.env`: copy `app/.env.example` and fill it in. For the local sandbox:
   - `APP_ENV=dev`
   - `EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
   - `EXPO_PUBLIC_SUPABASE_KEY=` the **Publishable** key printed by `npm run backend`
   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=1062640067839-stmra6machv6emfj837ui0pe6im3nenl.apps.googleusercontent.com`
   - `EAS_PROJECT_ID=` the Expo project id (push notifications, spec §26.9)
   - `GOOGLE_MAPS_ANDROID_KEY=` leave empty until Google billing is set up; the Map tab shows a list instead (spec §27.5)
2. `app/google-services.json`: the Firebase config for push (project `thinnava-f44c7`, Spark plan, no billing). Download it from the Firebase console (Project settings → Android app `com.thinnava.app`) or get it from the other owner. Without it the app still builds; push just stays off.
3. `supabase/.env` (read by the local Edge Functions):
   - `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=` the web client's secret (`GOCSPX-…`, from the JSON downloaded from Google Cloud)
   - `GEMINI_API_KEY=` a key made in Google AI Studio **on the `thinnava-free` project** (no billing, so it can never charge)
   - `GEMINI_MODEL=gemini-3.5-flash-lite` and `GEMINI_FALLBACK_MODEL=gemini-flash-lite-latest`
   - `PUSH_WEBHOOK_SECRET=` any long random string (the sandbox's push trigger uses it)
   - No `GOOGLE_PLACES_KEY` locally: place search runs on practice data (spec §25.6).

## 3. Install and run
```
cd app
npm install
npm run backend            # starts the local sandbox (first time downloads images, ~5 min)
npm run backend:reset      # applies every migration to the sandbox from scratch
npm run backend:test       # runs the privacy tests (all must pass)
npm run backend:functions  # serves the Edge Functions with supabase/.env (keep it running; needed for places, links and AI reading)
```
- Stop the sandbox when you're done to free memory: `npm run backend:stop`.
- Optional test data: ~200 practice places for the map, `docker exec -i supabase_db_thinnava psql -U postgres -v ON_ERROR_STOP=1 < tools/sandbox-seed/map_seed.sql` (sandbox only, never prod).

### Android (USB phone)
```
npx expo run:android --device <model>   # first build onto a USB phone (see `adb devices -l`)
npm run phone                           # day to day: forwards USB ports and starts the code server
```
The phone reaches the laptop over USB (`adb reverse`), so campus Wi-Fi blocking devices from talking to each other doesn't matter.

### Web version (spec §18.3)
```
npm run web                # opens http://localhost:8081 in the browser
```
- Laptop layout from 1024 px wide; narrow the window (or use Chrome's device toolbar) for the phone-browser layout.
- Google sign-in on `localhost` needs `http://localhost:8081` in the sandbox's allowed redirects (already in `supabase/config.toml`).
- After adding a new `*.web.ts(x)` file, restart with `npx expo start --web --clear` so it's picked up.
- Check a production build the way Cloudflare builds it: `npx expo export -p web` (output in `app/dist`, git-ignored).

### Before committing
`npm run typecheck`, `npm test` and `npm run backend:test` must all pass.

## 4. Google sign-in on a dev build
Dev builds use Expo's standard debug key (SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`), the same on every laptop. It's already registered in Google Cloud (`thinnava-free` → Clients → Thinnava Android (dev)), so there's nothing to do per laptop.

## 5. Privacy policy and terms
Edit `docs/legal/privacy.md` or `terms.md`, then run `node tools/legal/sync.mjs` to update the copy shown inside the app (Settings → About & privacy). The public pages live on the owner's website repo (`CKarthikeshwar.github.io`, `/projects/thinnava/privacy` and `/terms`); update them there too.

## 6. Where production lives (release keeper only)
Nothing below is needed for day-to-day development. Only the release keeper touches production, and only when the owners agree (CLAUDE.md).

| Piece | Where | Notes |
|---|---|---|
| Database, auth, Edge Functions | Supabase `thinnava-prod` (Mumbai), project ref `vfkxwxhocelfvlpsqtwc` | Free plan, no card. Secrets are set in the Supabase dashboard (Edge Functions → Secrets), never in files. |
| Website | Cloudflare Pages project `thinnava` → https://thinnava.pages.dev | Free, no card. Builds `app` with `npx expo export -p web` on every push to `main`. Build variables: `APP_ENV=prod`, `NODE_VERSION=22`, prod Supabase URL and publishable key. |
| Google sign-in | Google Cloud `thinnava-free` → Google Auth Platform | Published (In production). The web client lists the site as a JavaScript origin and the Supabase callback as a redirect URI. Prod Supabase → Authentication → URL Configuration has the site as Site URL and redirect. |
| Push | Firebase `thinnava-f44c7` (Spark) + Expo push | Free. |
| Legal pages | `CKarthikeshwar.github.io` (GitHub Pages) | Free. |

Releasing a backend change (after the privacy tests pass locally):
```
npx supabase login                                  # once per laptop
npx supabase link --project-ref vfkxwxhocelfvlpsqtwc
npx supabase migration list --linked                # see what prod is missing
npx supabase db push --linked                       # new migrations only; never edit one already on main
npx supabase test db --linked                       # privacy tests on prod: all must pass
npx supabase functions deploy <name> --project-ref vfkxwxhocelfvlpsqtwc
```
The website needs nothing: pushing to `main` redeploys it.

## 7. Second laptop checklist
1. Install the tools (§1) and clone.
2. Create `app/.env`, `supabase/.env` and `app/google-services.json` (§2).
3. `npm install`, `npm run backend`, `npm run backend:reset`, `npm run backend:test`.
4. Run the app (§3).

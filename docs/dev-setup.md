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
   - `GOOGLE_MAPS_ANDROID_KEY=` leave empty (not used since 2026-10-19; the Android Map tab shows a list until its MapLibre map ships)
2. `app/google-services.json`: the Firebase config for push (project `thinnava-f44c7`, Spark plan, no billing). Download it from the Firebase console (Project settings → Android app `com.thinnava.app`) or get it from the other owner. Without it the app still builds; push just stays off.
3. `supabase/.env` (read by the local Edge Functions):
   - `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=` the web client's secret (`GOCSPX-…`, from the JSON downloaded from Google Cloud)
   - `GEMINI_API_KEY=` a key made in Google AI Studio **on the `thinnava-free` project** (no billing, so it can never charge)
   - `GEMINI_MODEL=gemini-3.5-flash-lite` and `GEMINI_FALLBACK_MODEL=gemini-flash-lite-latest`
   - `PUSH_WEBHOOK_SECRET=` any long random string (the sandbox's push trigger uses it)
   - `OLA_MAPS_API_KEY=` the Ola Maps key (Krutrim Cloud → Ola Maps → Maps Credentials → `thinnava`). Optional locally: without it, place search runs on practice data (spec §25.6). With it, local searches use the real free allowance, which is fine.

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
- The web map's worker is a copied file, `app/public/maplibre/worker-<version>.mjs`. After upgrading `maplibre-gl`, copy `node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs` there with the new version in the name and update `WORKER` in `src/platform/map/MapView.web.tsx`.

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
| Places | Ola Maps (Krutrim Cloud, owner's Gmail) | Free monthly allowance; **no card, no Razorpay mandate, 0 credits — never add any**. Key in Supabase Edge Function secrets as `OLA_MAPS_API_KEY`. Sign in every few months (accounts close after 6 months unused). |
| Map tiles | OpenFreeMap | Free, no account. |
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

## 7. Release APK (built on this laptop, release keeper only)
The release APK is built locally with Gradle, not with EAS cloud builds (spec §29). It talks to production, using the public values in `app/.env.production`.

### One-time setup
1. **Release key.** The key file is `D:\IISc\keys\thinnava-release.jks` (alias `thinnava`). It lives **outside the repo** and is never committed. **Back it up somewhere safe** (e.g. a private cloud folder): if it's lost, friends must uninstall and lose their offline queue before they can install a new build. Only if starting from scratch, create one with:
   ```
   keytool -genkeypair -v -keystore D:\IISc\keys\thinnava-release.jks -alias thinnava -keyalg RSA -keysize 2048 -validity 10000
   ```
2. **Signing settings.** Add these to `C:\Users\<you>\.gradle\gradle.properties` (outside the repo; fill the two passwords in yourself, never paste them into chat):
   ```
   THINNAVA_STORE_FILE=D:/IISc/keys/thinnava-release.jks
   THINNAVA_KEY_ALIAS=thinnava
   THINNAVA_STORE_PASSWORD=
   THINNAVA_KEY_PASSWORD=
   ```
3. **Google sign-in.** The key's SHA-1 must be registered as an Android OAuth client in Google Cloud `thinnava-free` (package `com.thinnava.app`). The current key is already registered as "Thinnava Android (release)", SHA-1 `6E:AA:9D:F6:37:B2:34:C3:A5:91:87:37:91:6E:2C:CA:B3:B1:B9:D8`. A new key needs a new client, or sign-in fails with a developer error.
4. `app/google-services.json` must be present (§2), or push stays off in the APK.

### Generate the Android folder (only when native settings or packages change)
`app/android` is generated and git-ignored. Regenerate it after changing `app.config.ts`, adding a native package or upgrading Expo:
```
cd app
$env:APP_ENV='prod'; npx expo prebuild --platform android --clean
```
`--clean` wipes **three hand edits**, so redo them every time:
1. `android/gradle/gradle-daemon-jvm.properties`: set `toolchainVersion=17`. Java 25 makes the worklets CMake step fail with "A restricted method in java.lang.System has been called".
2. `android/gradle.properties`: set `reactNativeArchitectures=arm64-v8a`. Every phone from the last ~8 years is arm64; this halves build time and APK size.
3. `android/app/build.gradle`: in `signingConfigs { … }`, after `debug { … }`, add:
   ```
   // Thinnava release key: path and passwords come from ~/.gradle/gradle.properties (outside the repo).
   if (findProperty('THINNAVA_STORE_FILE')) {
       release {
           storeFile file(findProperty('THINNAVA_STORE_FILE'))
           storePassword findProperty('THINNAVA_STORE_PASSWORD')
           keyAlias findProperty('THINNAVA_KEY_ALIAS')
           keyPassword findProperty('THINNAVA_KEY_PASSWORD')
       }
   }
   ```
   and in `buildTypes { release { … } }` replace `signingConfig signingConfigs.debug` with
   `signingConfig findProperty('THINNAVA_STORE_FILE') ? signingConfigs.release : signingConfigs.debug`.
   Save the file as UTF-8 **without** BOM (a BOM breaks Gradle with "Unexpected character '?'").

### Build, check, install (PowerShell)
```
cd app\android
$env:NODE_ENV='production'; .\gradlew.bat assembleRelease --console=plain *> build\release-build.log
```
- Takes ~10–20 min the first time, a few minutes after. Output: `app\android\app\build\outputs\apk\release\app-release.apk` (~66 MB). If it fails, read the end of `build\release-build.log`.
- Check it's signed with the release key (SHA-1 must match step 3 above):
  `& "$env:LOCALAPPDATA\Android\Sdk\build-tools\36.0.0\apksigner.bat" verify --print-certs app\build\outputs\apk\release\app-release.apk`
- Install on a USB phone, keeping its data: `adb install -r app\build\outputs\apk\release\app-release.apk`
- To share, copy it to e.g. `Desktop\Thinnava.apk`. Friends install it over the old one; same key means their data stays.

Before sharing: `npm run typecheck` and `npm test` pass, and `changelog.md` has the entry (spec §29).

## 8. Second laptop checklist
1. Install the tools (§1) and clone.
2. Create `app/.env`, `supabase/.env` and `app/google-services.json` (§2).
3. `npm install`, `npm run backend`, `npm run backend:reset`, `npm run backend:test`.
4. Run the app (§3).

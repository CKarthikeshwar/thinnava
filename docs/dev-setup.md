# Setting up a laptop for Thinnava development

Do this once on **every laptop** you build on. Each laptop runs its **own local sandbox** (Supabase in Docker), so development never touches real users' data. Hosted Supabase is used only for `thinnava-prod` (spec §27.2, §33.4).

## 1. Tools
- **Git** and the **GitHub CLI** (`gh auth login`), then `gh repo clone CKarthikeshwar/thinnava`.
- **Node.js** (LTS or newer) and **Java 17**. Android Studio installs Java and the Android SDK.
- **Android Studio** (for the Android SDK and `adb`).
- **Docker Desktop**: open it once and accept its terms. It must be running whenever you use the sandbox. It needs about 1.5 GB of free memory; close heavy apps first.

## 2. Secrets (never committed)
1. `app/.env`: copy `app/.env.example` and fill it in. For the local sandbox:
   - `EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
   - `EXPO_PUBLIC_SUPABASE_KEY=` the **Publishable** key printed by `npm run backend`
   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=1062640067839-stmra6machv6emfj837ui0pe6im3nenl.apps.googleusercontent.com`
2. `supabase/.env`: set `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=` to the web client's secret (`GOCSPX-…`, from the JSON downloaded from Google Cloud). Get it from the other owner privately if you don't have it. For AI reading (M5) add:
   - `GEMINI_API_KEY=` a key made in Google AI Studio **on the `thinnava-free` project** (no billing, so it can never charge)
   - `GEMINI_MODEL=gemini-3.5-flash-lite` and `GEMINI_FALLBACK_MODEL=gemini-flash-lite-latest`

## 3. Install and run
```
cd app
npm install
npm run backend          # starts the local sandbox (first time downloads images, ~5 min)
npm run backend:reset    # applies every migration to the sandbox from scratch
npm run backend:test     # runs the privacy tests
npm run backend:functions  # serves the Edge Functions with supabase/.env (keep it running; needed for places and AI reading)
npx expo run:android --device <model>   # first build onto a USB phone (see `adb devices -l`)
npm run phone            # day to day: forwards USB ports and starts the code server
```
- Stop the sandbox when you're done to free memory: `npm run backend:stop`.
- The phone reaches the laptop over USB (`adb reverse`), so campus Wi-Fi blocking devices from talking to each other doesn't matter.

## 4. Google sign-in on a dev build
Dev builds use Expo's standard debug key (SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`), the same on every laptop. It's already registered in Google Cloud (`thinnava-free` → Clients → Thinnava Android (dev)), so there's nothing to do per laptop.

# Changelog

Important decisions and changes, newest first. Every behaviour, data, scope or stack change gets an entry **after** `spec.md` has been updated.

Entry format:
```
## YYYY-MM-DD · Short title
- **What:** the decision or change
- **Why:** the reason (or the evidence)
- **Spec:** sections touched
```

---

## 2026-10-14 · Merged the other device's branch `docs/copy-flow-onboarding`
- **What:** merged the owner's branch, made on another laptop from an older clone (commit a9c45aa), into `main`. Local work was committed first, with a safety branch `backup-before-merge`.
- **Decisions (owner):**
  - **Copy route: both.** The Home card "You copied a message · Read it" (fastest) **and** the "Use copied text?" chip in + → A friend told me.
  - **Onboarding: the branch's three screens.** A1 Splash → A1b Intro (cat offering a dessert + friends' map) → A2 Welcome with Continue with Google. My 3-slide welcome (with the "Copy it" slide) was dropped.
- **How the conflicts were resolved:**
  - **spec.md:**
    - §10 combines both versions: the new §10.0 lists both copy entry points;
    - §14 A1/A1b/A2 come from the branch; B1 keeps the copied-message card;
    - D7 covers both cases;
    - M0 stays as completed here; demo criterion 1 mentions both routes;
    - §26.6 points to both.
  - **CLAUDE.md:** both wordings combined. **changelog.md:** both entries kept.
  - **Mockups:**
    - `phase1.html`: the branch's onboarding, with the Home tip "Copy a friend's WhatsApp message, then open Thinnava";
    - `motion-body.html`: the branch's version, noting the Home card;
    - `phase2.html` and `motion.html` regenerated from `design/src/`.
- **New from the branch:** cat art (`design/assets/cat-offering.png`, `cat-sad.png`, `cat-waving.png`), `ui-references/9.png`, and `PRODUCT.md` wording.
- **App code:** not affected (the onboarding screens get built in M2).

## 2026-10-14 · M1 work log (app shell and design system)
**Theme** (`app/src/theme/`)
- `tokens.ts`:
  - Cobalt colour roles (spec §16.1), avatar tints, radii, spacing, sizes;
  - shadows as CSS `boxShadow` strings, copied from the mockups (React Native's new architecture supports them);
  - inset strokes for fields and chips.
- `type.ts`: Fredoka 600 + Nunito 400/600/700/800, text styles from DESIGN.md, and font scaling capped at 130%.
- `motion.ts`:
  - the three Material curves plus the title-glide curve, and the spec durations;
  - `useMotion()` honours Android's "Remove animations" setting (movement becomes a ≤150 ms fade).

**Components** (`app/src/components/`, all built from tokens, with accessibility labels)
- Basics: `T` (all text), `Pressable` (standard press shrink/dim), `Button` (primary / tonal / outline / white / strong / small / disabled, plus the Google "G" mark), `IconButton` (48 dp, badge, active).
- Chips and marks: `Chip`, `ReviewPill` (fixed Good/Okayish/Bad colours with face icons), `Avatar` / `AvatarStack` / `SourceMark`.
- Content: `EntryCard` (the Home timeline card), `List` (ListSurface, Panel, ListRow, SectionLabel, Divider, Thumb).
- Inputs: `TextField` (focus/error/success states), `ChipInput` (dish chips: ≤10 items, ≤40 chars, case-insensitive dedupe).
- Bars: `Bars` (TopBar, SearchBar, Segmented, OfflineBanner).
- Mascot and ground: `RingsGround` (the three Rings compositions from the mockup), `CatPeek` (the cat climbs up from behind a card's edge), `EmptyState`.
- Overlays: `Sheet` / `SheetOption` / `Radio` (bottom sheet, 400 ms rise), `Dialog`, `Snackbar` (`showSnack()` from anywhere).
- Map: `MapPin` / `Cluster` / `YouDot`.
- Navigation: `NavBar` (custom tab bar with the animated pill and the + button), `SpeedDial` (three circles fan out with a 30 ms stagger, + turns 135° into ×, navy scrim, Android back closes it), `Screen` (Mist ground + optional Rings + safe area).

**Screens** (`app/src/app/`)
- `_layout.tsx`: loads the fonts behind the splash; share-intent, gesture, safe-area and bottom-sheet providers; light status bar.
- `(tabs)/`, with tabs crossfading in 280 ms:
  - Home: the B1a empty state with the cat, three start buttons and the copy tip;
  - Search: search bar, Places/People, filter chips;
  - Map: a static preview of the pins on map colours (the real map is M8);
  - Profile: identity block, counts, and a dev-only gallery link.
- `dev/gallery.tsx`: a **dev-only design gallery** showing every component (opens a sheet, dialog and snackbar; live username field states; dish chips). In release builds it redirects to Home.
- Removed the temporary M0 check screen.
- The + speed dial items show a "arrives in a later milestone" snackbar for now.

**App icon and splash** (spec §16.8)
- Generated with Python/PIL from the mascot art into `app/assets/`:
  - `android-icon-foreground.png`: the peeking cat inside the adaptive-icon safe zone, on a cobalt `#2350D9` background;
  - `android-icon-monochrome.png`: the cat silhouette, for Android themed icons;
  - `icon.png`: cobalt square with the cat;
  - `splash-icon.png`: the cat for the splash screen.
- `app.config.ts` adds the expo-splash-screen plugin (cat on Mist, 200 dp).
- Removed the template's `android-icon-background.png` and `favicon.png`.
- Native project regenerated (`expo prebuild --clean`) and rebuilt.

**Checks**
- `tsc --noEmit` passes.
- On the phone: Home, the speed dial and Search render like the mockups (screenshots compared).

**Fixes after testing on the phone**
- **Disabled buttons weren't faded:** the press animation overrode the 40% opacity. `Pressable` now owns the disabled opacity.
- **Android back closed the screen instead of an open sheet:** `Sheet` now closes itself on back first.
- **Icon paws clipped on round masks:** the icon foreground was shrunk to fit every launcher shape (circle and squircle previews checked).
- **The code server stopped during a native rebuild** and an old copy kept the port busy. Fixed by stopping it; there's now a single command to start development: `cd app && npm run phone` (connects the phone over USB and starts the server).
- **Removed `app/LICENSE`:** it was Expo's own MIT licence copied in by the template, not ours.

**Spec tweak:** the gallery route is `/dev/gallery`, not `/_gallery`, because Expo Router reserves `_` files for layouts (spec §26.2, §30 M1 updated).

**M1 status:** ✅ Done.
- The gallery matches the mockups on the phone.
- Tabs crossfade, the pill moves, and the speed dial fans out.
- Sheet, dialog and snackbar work.
- "Remove animations" support is built in through `useMotion()` and Reanimated's system setting, but hasn't been checked on the phone: we didn't change the owner's phone settings. To check it: Settings → Accessibility → Visibility enhancements → Remove animations, then open the + menu. It should simply fade.

**Notes**
- Expo Router 57 bundles React Navigation, so tab-bar types come from `expo-router/tabs`.
- In dev builds a grey gear (Expo's dev-tools button) floats top-right. It isn't part of the app and doesn't appear in release APKs.

## 2026-10-14 · WhatsApp messages come in by copy, not share
- **What:**
  - Owner found WhatsApp on Android **can't share a text message to other apps** (only forward). A web check agrees: a "share to other apps" bar was only in a 2025 beta.
  - The main path is now: copy the message → open Thinnava → Home card **"You copied a message · Read it"** → the same reading and confirmation as before.
  - The app checks only *whether* the clipboard has text, and reads it only on **Read it**. After Read it or ✕, the card stays hidden for 6 hours, unless the clipboard changes while the app is open.
  - Share → Thinnava still works for links (Instagram reel tested ✅) and for text from apps that can share.
- **Spec:** §1, §10 (new §10.0; §10.1, §10.4), §14 (A2 slide 2, B1 copied-message card, B1a tip, D7), §26.6, §30 (M0 marked done, M5 step 4 and done-when), §31 demo 1.
- **Also updated:**
  - `DESIGN.md` motion line;
  - `CLAUDE.md` project line;
  - `design/phase1.html`: slide 2 now shows Copy → the "You copied a message · Read it" card, plus a new tip and caption;
  - `design/motion.html`: step 1 text notes the copied-card start; the animation itself still shows a share, which is still valid for links.

## 2026-10-13 · M0 complete ✅
- The dev build runs on the phone (SM-S711B) and receives shared links. See the work log below.

## 2026-10-13 · M0 work log (foundations)
**Plan change**
- M0 now needs **no accounts**. The account-dependent spikes moved to the start of the milestone that needs each account: sign-in → M2, Places + zero-cost locks → M3, Gemini → M5, Expo/Firebase/hosted Supabase → M7 or the first APK (spec §30 M0).

**Repo and git**
- Created the private GitHub repo `CKarthikeshwar/thinnava` and pushed 2 commits. Neither commit mentions Claude.
- Added `.gitignore` (excludes `.impeccable/review/` screenshots, `.env*`, keystores, `google-services.json`, `node_modules`, builds, native folders) and `.gitattributes` (LF line endings).
- New rule: Claude asks before every commit and every push.

**Phone**
- Dev phone: Samsung Galaxy S23 FE (SM-S711B), Android 16, connected over USB with USB debugging.

**App created in `app/`**
- Created with `create-expo-app` (blank TypeScript template), then switched to Expo Router (`"main": "expo-router/entry"`, routes in `app/src/app/`).
- Removed `app.json`, `App.tsx` and `index.ts`. Added `app/app.config.ts`:
  - package `com.thinnava.app`, scheme `thinnava`, version 0.1.0, light mode;
  - app name "Thinnava?! (dev)" for dev builds;
  - plugins: expo-router, expo-share-intent (Android `text/*` only, iOS off), Google Sign-In, react-native-maps (key from env), expo-location (permission text).
- Added `app/.env.example` (no real values), `app/tsconfig.json` with the `@/` path alias, and folders `src/{app,components,features,lib,platform,theme,types}`.
- `app/package.json` scripts: `start`, `android`, `lint`, `typecheck`, `test`, `doctor`.
- Kept Expo's `app/AGENTS.md` (guidance for AI tools: use versioned Expo docs, `npx expo install`).
- **Installed versions:**
  - Core: Expo SDK **57.0.28**, React Native **0.86.3**, React 19.2.3, TypeScript 6.0.3.
  - Navigation and UI: expo-router 57.0.26, Reanimated 4.5.1 (+ worklets 0.10.1), Gesture Handler 2.32, bottom-sheet 5.2, FlashList 2.0.2, lucide-react-native 1.56, react-native-svg 15.15, Fredoka/Nunito fonts.
  - Data and state: TanStack Query 5.104, MMKV 4.3, zustand 5, supabase-js 2.117, react-hook-form 7.90 + zod 3.25.
  - Native features: expo-share-intent 8.0.1, Google Sign-In 16.1.5, react-native-maps 1.27.2 (+ supercluster 9), expo-location/notifications/clipboard/image/crypto/haptics/system-ui/build-properties, NetInfo 12, expo-dev-client.
  - Other: date-fns 4.
  - Tests: jest 29 + jest-expo 57, @testing-library/react-native 14.
- **First screen:** `src/app/_layout.tsx` (share-intent, gesture and safe-area providers) and `src/app/index.tsx` (a temporary "M0 check" screen that shows anything shared into the app).

**Problems hit and fixes**
- **npm "allow-scripts" error.** Your global npm config has `allow-scripts=["@higgsfield/cli"]`, which npm 11 rejects inside projects. Fix: `app/.npmrc` with `allow-scripts=` (empty) overrides it for this project only. Your global setting is unchanged.
- **Dependency clash:** a newer `react-dom` (19.3) was pulled in. Fixed by pinning `react-dom` to 19.2.3 with `npx expo install react-dom`.
- **Missing scheme:** expo-share-intent needs an app URL scheme, so it's set to `thinnava`.
- **Light mode setting:** needs `expo-system-ui`, so that was installed.
- **Device flag:** the first build couldn't find the phone, because `--device` needs the model name (`SM_S711B`), not the serial number.

**First dev build on the phone** ✅
- `npx expo run:android --device SM_S711B` built and installed "Thinnava?! (dev)". The first attempt took 21 min and failed on a campus-network download drop; the retry succeeded in 1.5 min thanks to the cache.
- Running it day to day:
  1. Start the code server: `cd app && npx expo start --dev-client --port 8081`.
  2. Connect the phone over USB with `adb reverse tcp:8081 tcp:8081`, because campus Wi-Fi blocks laptop-to-phone traffic.
  3. In the app, connect to `http://localhost:8081`.
- Problems hit and fixes:
  - **Network drop:** the download from `dl.google.com` was cut off on campus Wi-Fi ("Remote host terminated the handshake"). Fix: re-run the build. If it happens again, use a phone hotspot for the build.
  - **Blank screen, then "unexpected end of stream":** `expo start --localhost` listened only on IPv6 `::1`, while the USB tunnel connects via `127.0.0.1`. Fix: start without `--localhost`, so it listens on all addresses.
- Build logs are written to `build.log` and `metro.log` in the repo root (git-ignored by `*.log`).

**Backend folder**
- Ran `supabase init` (CLI 2.120.0 via npx): `supabase/config.toml`, project_id `thinnava`. Nothing runs yet.

**Legal drafts**
- `docs/legal/privacy.md` and `docs/legal/terms.md`, plain English, per spec §27.4. A **contact email is still needed** before publishing (placeholder `<CONTACT EMAIL>`).

## 2026-10-13 · Solo start; commit rule
- **What:**
  - One owner does both P1 and P2 work, in milestone order. They use one dev Supabase project (`thinnava-dev`) plus `thinnava-prod`. Personal dev projects (§33.4) come only when a second person starts.
  - Claude must **ask before every commit and every push**, and commits only after a huge chunk of work.
- **Why:** owner's instruction.
- **Spec:** §33 (applies once two people work in parallel). `CLAUDE.md` updated.

## 2026-10-13 · Zomato/District link tests; stays v2
- **What:** owner phone tests showed:
  - Zomato and District can't be searched by name.
  - Their restaurant **web page URLs** (`zomato.com/<city>/<slug>`, `district.in/dining/<city>/<slug>`) and `zomato://restaurant/<id>` open the exact restaurant in the apps.
  - District's res_id equals Zomato's.

  A v2 design is recorded: automatic lookup through free Gemini web search, a share-a-link backup, and "Wrong restaurant?". The owners chose to keep it in v2.
- **Why:** findable automatically, but it adds scope; v1 stays Directions + Swiggy.
- **Spec:** §11.2, §11.3.
## 2026-10-14 · WhatsApp messages are copied, not shared; onboarding is three screens
- **What:**
  - **WhatsApp can't share messages to other apps; it only lets you copy them.** So the main route for a friend's message is now **copy → open Thinnava → + → "A friend told me" → "Use copied text?"** (already in D5), which runs the same D7 reading → D8 confirmation.
  - **The share target stays** for apps that do allow sharing text or links (browser, Instagram, YouTube, Google Maps, Zomato, Swiggy…). §10.1's link handling is unchanged.
  - **Onboarding is three screens:** A1 Splash → **A1b Intro** (new: the promise plus a small map of friends, merged from old slides 1 and 3) → A2 Welcome with **Continue with Google**. The old 3-slide welcome is gone; the "how to share" slide was dropped.
  - **B1a tip** now reads "Copy a friend's message, then tap + → A friend told me".
  - Wording: "shared message" became "message (copied or shared)" where it described the original text; D7 opens over the sharing app **or** inside Thinnava.
  - Spike M0 now tests sharing from a browser and Instagram, plus reading the clipboard after copying a WhatsApp message. Demo criterion 1 is now "copy a WhatsApp message".
- **Why:** WhatsApp's message long-press has no Share → Thinnava, so the planned flow could not work for the main use case.
- **Spec:** §1 (summary), §4 (scope row M), §6.2, §10 (all), §14 A1/A1b/A2, B1a, D7, F6, §16.7 unchanged, §26.2 routes, §26.3, §26.5, §26.6, §27 privacy wording, M0 spike, M2, M5, §30 demo test, §33 routes.

---

## 2026-10-13 · Gap review (spec v1.1)
- **What, decided by the owners:**
  - **Zero-cost guarantee:** no card may ever be charged.
    - Supabase, Expo, GitHub, Firebase and Gemini run with no card.
    - Google Maps Platform runs on a separate project (`thinnava-maps`) on a free trial that is never upgraded, with four locks:
      1. our own per-SKU monthly hard cap at 80% of the free allowance;
      2. Google-side quota limits;
      3. automatic billing shut-off;
      4. the free trial itself.
    - Gemini's key comes from a project with no billing account (§27.5).
  - **Google info (rating, price, hours):** loaded only when the user taps it (mode "tap"); switches "off" for the rest of the month when the free cap is near. It never appears automatically, in search results or on pin cards.
  - **No Zomato or District buttons in v1** (moved to v2). Hand-offs are Directions + Swiggy search only. Shared Zomato/District/Swiggy links are treated as internet finds.
  - **Search** finds places by name and by food words (Google keyword search on submit). Our own dish text is still never searched.
  - **The rating on my own visits is required.** Map layer chips are single-select.
  - **"Only me"** is a built-in list.
  - **Privacy policy and terms:** short plain-English pages on GitHub Pages (public repo `thinnava-legal`), also shown in the app.
  - **Interim app icon:** the chef-cat face on cobalt.
  - **Team and package:** package `com.thinnava.app` confirmed. Claude writes most of the code; the owners review and test. P1/P2 not assigned yet. No fixed deadline.
- **What, aligned to the mockups:**
  - **Onboarding:** welcome slide copy and the legal line; "Let's eat" on setup; username hint now allows "."; splash tagline.
  - **Home:** card headers and meta (with / went date); internet labels (From a reel / video / link); filter sheet labels ("Everything"…); empty Home copy.
  - **Map, search and profile:** map search bar and Locate me; pin card summaries; search result sections; profile counts, tabs and Saved sub-filters.
  - **Place and entry pages:** place page (♡ in the top bar, one "People who've been" list including my saved entries); entry detail.
  - **Forms:** D7 never shows a sender name; D8 "Please check this" (no quoted evidence); D8b; D10 copy.
  - **People:** E1–E9 copy ("Request to connect", "Not me, reject").
  - **Notifications and settings:** F1 wording ("visited"), F2 groups, F7 asks for your username instead of DELETE.
  - **Wording:** no gendered pronouns for users.
- **What, edge cases decided:**
  - A queued offline visit drops tags for people who are no longer connections.
  - The map and search price filters match if **any** visible entry is in the bucket.
  - Profile tabs page 20 at a time.
- **Mockups updated to match:**
  - Zomato and District buttons removed (C1, C1a, motion).
  - Place pages get a tap-to-load "Google info" row and button; Google ratings removed from the search results and the pin card.
  - Closed-place text updated.
  - D7 "Reading this message…" and D8 "Please check this".
  - "Only me" marked as built in.
  - Block dialog uses no pronouns.
  - Username hint allows ".".

- **Why:** gap review of the spec against the mockups and `idea.md`, plus the owners' answers.
- **Spec:** §1, §2, §4, §10–§16, §18, §20–§23, §25 (new §25.5), §26, §27 (new §27.4, §27.5), §30–§33.

## 2026-10-13 · Two-person parallel workflow
- **What:** new spec §33.
  - **Git:** GitHub with branches per person and squash-merged PRs.
  - **Ownership:** each person owns folders, tables and functions; shared files change only in small PRs.
  - **Databases:** each person has a personal dev Supabase project; prod is changed only from `main` by the release keeper (P2 by default).
  - **Plan:** a side-by-side phase plan with merge points I1–I4, plus stubs for not-yet-built parts.
  - **Devices:** both laptops' SHA-1s are registered.
  - **Claude:** each Claude session is told P1 or P2 and stays in that person's areas.
- **Why:** the owners will build simultaneously on two laptops. A shared dev database and shared files are the only real conflict sources, and the rules remove them.
- **Spec:** §27.2, §27.3, §29, §30, §33. `CLAUDE.md` updated.

## 2026-10-13 · Spec v1.0 created
- **What:** `spec.md` is now the single source of truth. It has two parts: Part A (product: rules, flows, screens, design summary) and Part B (engineering: architecture, schema, RLS, RPCs, Edge Functions, AI, Places, frontend, testing, release, milestones M0–M9). `CLAUDE.md` now points to it instead of repeating the rules. `idea.md` stays as the scratchpad.
- **Why:** the owners asked for one file defining the whole app, to build against step by step.
- **Spec:** all.

## 2026-10-13 · Stack decided
- **What:**
  - App: Expo + React Native + TypeScript (dev builds, EAS APKs).
  - Backend: Supabase (Postgres + RLS, Auth, Edge Functions), region Mumbai.
  - AI: Gemini Flash on the free tier.
  - Places and maps: Google Places API (New) and the Google Maps SDK.
  - Android package: `com.thinnava.app`.
- **Why:**
  - Owners' choice.
  - Expo keeps a web version possible later from the same code; Flutter's web output is weaker and native Kotlin has none.
  - Supabase RLS fits the "connected AND in the audience" rules.
  - Gemini's free tier is enough for the course.
- **Spec:** §17, §18, §27.

## 2026-10-13 · Hand-off buttons: Swiggy search always; Zomato/District only with a shared link
- **What:**
  - Directions is always shown.
  - **Swiggy is always shown.** It opens the place's listing link if we have one, otherwise `swiggy.com/search?query=<name>`.
  - **Zomato and District appear only when the place has a listing link.** Users add these links by sharing a restaurant link from those apps into Thinnava (new flow D9). For the demo, the team adds them the same way.
  - Replaces the old rule "every button only when listed, never a search fallback".
- **Why:** owner tested on a phone (2026-10-12):
  - The Swiggy search link opened the Swiggy app with correct results.
  - Zomato and District search links opened only the app home or a 404.
  - Their share links (`zomato.onelink.me`, `link.district.in`) open the restaurant directly, but can't be generated by us.
  - There is no public API to check listings.
- **Spec:** §10.1, §11, §14 (C1, D9), §22.4, §23.

## 2026-10-13 · Smaller decisions made while writing the spec
- **"Only me" is a built-in list**, alongside "All connections". Both are exclusive in the audience picker, while custom lists can be combined.
- **Deleting a list** makes visits left without an audience fall back to Only me (never wider).
- **The rating is required on my own visits.** It stays optional on friend and internet entries.
- **Notes exist on visits only**, not on friend or internet entries (matches the D5 mockup).
- **Internet entries:** the link is optional when logged by hand, and there's no date.
- **Tags:**
  - A tagged person can see the one visit they're tagged on, even if they aren't in its audience.
  - Rejects and un-tags don't notify anyone.
  - Deleting your visit created from a tag removes the tag link.
- **Connections:** declines are silent. Two crossing requests connect immediately. The "add to lists" sheet is shown to both people.
- **Block** also hides your name on tags from the person you blocked (they see "Someone"). Unblocking doesn't reconnect.
- **AI extraction:** each item has one `place {name, area, city}`. The server attaches up to 3 Google `candidates`, and these are the "place candidates" from the earlier notes.
- **Share import:** Instagram and YouTube links in v1 keep the link and offer "paste the caption". Other URLs are read from their page title and description.
- **Limits:**
  - dishes: ≤ 10 per list, ≤ 40 chars each;
  - price: ₹1–50,000;
  - notes: 500 chars; bio: 150 chars;
  - username: 3–20 of `a-z 0-9 . _`;
  - lists: ≤ 20 custom, names ≤ 30 chars.
- **Spec:** §5–§10, §20–§24.

## Before 2026-10-13 · Design phase (summary)
Recorded in `idea.md` and `DESIGN.md`:
- Cobalt palette, Rings ground (onboarding and the main tabs only), Fredoka + Nunito, chef-cat mascot.
- Phase 1, Phase 2 and motion mockups in `design/`.
- Google Sign-In only.
- Friend messages are not stored; internet entries keep their link.

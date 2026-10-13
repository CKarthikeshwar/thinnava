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

## 2026-10-13 · Zomato/District link tests; stays v2
- **What:** owner phone tests showed:
  - Zomato and District can't be searched by name.
  - Their restaurant **web page URLs** (`zomato.com/<city>/<slug>`, `district.in/dining/<city>/<slug>`) and `zomato://restaurant/<id>` open the exact restaurant in the apps.
  - District's res_id equals Zomato's.

  A v2 design is recorded: automatic lookup through free Gemini web search, a share-a-link backup, and "Wrong restaurant?". The owners chose to keep it in v2.
- **Why:** findable automatically, but it adds scope; v1 stays Directions + Swiggy.
- **Spec:** §11.2, §11.3.

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

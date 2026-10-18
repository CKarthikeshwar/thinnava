# Thinnava Specification

> **Status:** v1.1 · 2026-10-13 (gap review applied)
> **This file is the single source of truth for the project.** Everything we build must match it. If code and spec disagree, the code is wrong, or the spec gets changed first.

---

## 0. How to use this document

- **Precedence.** `spec.md` wins over every other file. `idea.md` is the owners' scratchpad (history and raw thoughts, not requirements). `DESIGN.md` holds the detailed visual system and must agree with §16 here. `CLAUDE.md` holds working rules for Claude. `PRODUCT.md` and `.impeccable/` are design-tool context.
- **Changing the spec.** (1) Edit the relevant section of `spec.md`. (2) Add an entry to `changelog.md` (date, what, why, sections touched). (3) Only then change code. Small wording fixes don't need a changelog entry; any behaviour, data, scope or stack change does.
- **Building.** Work through §30 (Implementation plan) in order. Each step has a "Done when" check. Don't start a milestone before the previous one's checks pass, unless a step says it can run in parallel.
- **Mockups.** `design/phase1.html`, `design/phase2.html` and `design/motion.html` show what screens look like and how they move. Where a mockup and this spec disagree on behaviour, the spec wins; on looks, the mockup and `DESIGN.md` win.
- Words in **bold caps** like **MUST** and **MUST NOT** are hard requirements.

---

# Part A: Product

## 1. Summary

**Thinnava** (Telugu for "Did you eat?") is a social food memory app for Android.

- You **connect** (mutually) with people you know and see where they ate and what they thought.
- You **log your own visits** (Good / Okayish / Bad, dishes you loved / didn't like, price per person).
- You **privately save** what friends tell you and places you find online. Mostly you copy a WhatsApp message and tap **Read it** in Thinnava (or "Use copied text?" in + → A friend told me), or share text and links from apps that allow sharing; either way AI fills in the form and you confirm.
- From any place you jump out to **Google Maps** (directions) or **Swiggy** (order).

Pitch: **"Your friends' food experiences, organized."**
Key idea: **friends share experiences, they don't recommend.** You decide.

Context: IISc course project, team of 2, demo with real users, distributed as an installable APK. Region: India, Bengaluru first (works anywhere). Prices in ₹ per person.

## 2. Glossary

| Term | Meaning |
|---|---|
| **Place** | A real food place that exists on Google Maps, identified by its Google Place ID. Nothing else can be added in v1. |
| **Visit** | "I went to this place on this date", with my review. Repeat trips are separate visits. Posted to my chosen audience. |
| **Review** | The opinion on a visit: rating (Good / Okayish / Bad), loved dishes, didn't-like dishes, price per person, notes. |
| **Saved entry** | Something I log on someone else's behalf. Two kinds: **Friend entry** (a friend told me about their experience) and **Internet entry** (I found it online). Always private to me. |
| **Friend name** | An entry in my private list of names used on friend entries ("Rahul", "Amma"). Can be linked to a connection. |
| **Connection** | A mutual link between two users, made by request + accept. |
| **Audience list** | A named group of my connections used to choose who sees a visit or my wishlist. Built-ins: **All connections**, **Only me**. Plus my custom lists. |
| **Companion** | Who I went with on a visit: a **tag** (a connection, who must accept) or a **private companion name** ("Mom", only visible to me). |
| **Tag** | A request from A to B saying "B was with me". B accepts by adding their own review, or rejects. |
| **Wishlist** | Places I want to try. One wishlist per user; its visibility is set by my audience lists. |
| **Draft** | An entry saved on the device that hasn't been synced (offline) or has no Google place yet. |

## 3. Users and principles

**Users:** college students and young professionals in Indian cities. They hear about places constantly (WhatsApp, in person, reels) and forget who said what.

**Design north star:** intuitive, clear, clutter-free, frictionless.
1. One obvious primary action per screen. Plain words.
2. Show only what helps the decision at hand; secondary things go behind a tap.
3. Fewest taps and least typing: smart defaults (today, nearby, All connections), optional stays optional, logging takes seconds.
4. Friends first: show people and what they said, never aggregate scores.
5. Honest AI: never invent, always confirm, every field can be filled by hand.
6. Private by default for anything logged on someone else's behalf.

## 4. Scope

### 4.1 v1 (this build)

| # | Feature |
|---|---|
| A | Google Sign-In; profile (name, username, optional bio, Google photo); sign out; delete account |
| B | Connections: send / cancel / accept / decline requests; remove connection; block / unblock |
| C | Audience lists: All connections, Only me, custom lists; pick lists when a connection is made |
| D | Places from Google Places; Google info shown when nobody I know has been |
| E | My visits: add / edit / delete, with rating, loved, didn't like, price, companions, notes, audience |
| F | Companion tags: tag connections, accept by reviewing or "Same as A's", reject, un-tag, tag after the fact; private companion names |
| G | Friend entries (manual + AI-assisted); private friend-name list (rename, merge, link to connection) |
| H | Internet entries (link kept) |
| I | Wishlist with list-based visibility |
| J | Home timeline with filters: All · Connections · From friends · Internet · Mine |
| K | Place page ("who's been here") |
| L | Map with layers and filters |
| M | Android share target for text and URLs (from apps that allow sharing), plus the "Use copied text?" paste route for apps that don't, like WhatsApp |
| N | AI extraction (multi-place) + confirmation screen |
| O | Hand-offs: Directions and Swiggy (§11) |
| P | Notifications: in-app list + push |
| Q | Offline support for manual entries |

### 4.2 v2 (later, not now)
Screenshot import (OCR) · YouTube metadata import · Zomato and District buttons (§11.3) · custom (non-Google) places · place collections · revisit nudges. (The web version moved into v1 as M10 on 2026-10-17, see §18.3.)

### 4.3 Never (unless the spec is changed)
Photos on entries · veg info/filters · dishes as entities (no dish pages, counts, search) · rating summaries · stars as our own rating · in-app "send a recommendation" · groups · people nearby · contact-based friend finding · invite links · taste matching / recommendation algorithms / AI chatbot · in-app ordering or payments · creator features · a native iOS app (iPhone users use the web version, §18.3) · dark mode · languages other than English.

## 5. Social and privacy rules

### 5.1 Connections
- Mutual and request-based. A sends a request; B accepts or declines. A can cancel a pending request.
- If A requests B while B already has a pending request to A, the two requests become a connection immediately.
- Declining is silent (A just sees "Requested" until A cancels; A is not told).
- Either side can **remove** a connection at any time. Nothing is deleted; each simply stops seeing the other's content.
- When a connection is made, **both** users are shown the "Add to lists" sheet (E5) the next time they open the app (skippable).

### 5.2 What a person can see
| Viewer relation | Sees |
|---|---|
| Not signed in | Nothing (app requires sign-in). |
| Anyone signed in | Any non-blocking user's **name, username, photo**, via exact/prefix username search or a tag/companion mention. Nothing else (no bio, no counts, no entries). |
| Connection | Bio; my visits whose audience includes them; my wishlist if its audience includes them; my map built from those. |
| Me | Everything of mine, including friend and internet entries, private names, pending tags. |

**The visibility rule:** a viewer sees a visit if and only if (a) they are the author, or (b) they are connected to the author **and** the visit's audience includes them, or (c) they are tagged on that visit (pending or accepted; the tag grants view of that one visit only).

"Audience includes them" means: the visit's audience contains **All connections**, or contains a custom list of which they are a member. **Only me** includes nobody.

Saved entries (friend / internet), friend names, companion names and drafts are **only ever visible to their owner**. No exceptions.

### 5.3 Block
- Blocking removes the connection (if any), cancels requests in both directions, and removes pending tags in both directions.
- A blocked user can't find me in search, can't see my name on tags or companions they come across (shown as "Someone"), can't request or tag me.
- I can unblock from Settings → Blocked people (simple list). Unblocking does **not** restore the connection.

### 5.4 Disconnecting and tags
Removing a connection keeps past accepted tags (names stay on both visits). Each person just stops seeing the other's content.

## 6. Entries

### 6.1 Field rules (shared)

| Field | Rule |
|---|---|
| Place | **Required.** Must be a Google place (Place ID). |
| Rating | `good` · `okayish` · `bad`. **Required on my visits.** Optional (may be none) on friend and internet entries. |
| Loved | List of free-text dish names. 0–10 items, each 1–40 chars, trimmed, case-insensitive duplicates removed. |
| Didn't like | Same rules as Loved. |
| Price per person | Optional whole rupees, 1–50,000. Shown as "₹300 / person". |
| Notes | Visits only. Optional, up to 500 chars. |
| Date | Visits: required, defaults to today, can't be in the future. Friend entries: "When they went", optional. Internet entries: none. |

### 6.2 My visit
Fields: place, date, rating, loved, didn't like, price, companions (tags + private names), notes, audience.
- Default audience: **All connections**.
- On save: if the place is on my wishlist, it is **removed from the wishlist** (moves to Visited), with snackbar "Moved from your wishlist".
- Tags create tag requests (§7).

### 6.3 Friend entry
Fields: **friend name (required)**, place, rating (optional), loved, didn't like, price, when they went.
- Friend name is **never auto-filled**. Save is disabled until a friend name is entered, or the source is switched to Internet.
- Shown as "**Rahul**'s experience · logged by you". Never "Rahul's review".
- The original message (copied or shared) is shown on the confirmation screen **for checking only** and is **not stored**.

### 6.4 Internet entry
Fields: link (optional when logged by hand, kept when shared), place, rating (optional), loved, didn't like, price.
- The link is stored and shown as a tappable "Open link" on the entry.

### 6.5 Editing and deleting
- All entries can be edited and deleted by their owner. Editing doesn't change the entry's position on Home (sorted by creation time).
- Deleting a visit removes its tags. Visits other people created by accepting my tag **stay** (they are theirs).
- Delete always asks for confirmation (D10).

## 7. Companion tags

Works like Instagram collab posts.

1. On a visit (when adding or editing later), I open "Went with" and pick **connections** (they get a tag request) and/or **private names** (only visible to me; new names are added to my companion-name list).
2. Only current connections can be tagged. Someone I'm not connected to can only be a private name.
3. Tagged person B gets a notification and a **tag request** (E8) showing A's visit (place, date, A's review), with:
   - **Write my review** → opens Add visit prefilled with the place and date (and audience All connections). Saving creates B's visit and accepts the tag.
   - **Same as A's** → one tap creates B's own visit with A's rating, loved, didn't like, price and notes copied. B owns it and can edit it. The tag is accepted.
   - **Reject** → the tag is removed. A is not notified.
4. A pending tag is shown only to the tagger (as "with Anu · pending") and to the tagged person (as the request).
5. Accepted tags show "with **A**" on B's visit and "with **B**" on A's visit, to anyone allowed to see that visit. A tag reveals **only the name** of the other person. Tapping the name opens their profile (which shows content only if the viewer is connected and in their audience).
6. B can **un-tag** themselves later (⋮ on A's visit or their own linked visit → "Remove me from this visit"). The link disappears from both visits; B's own visit stays.
7. A can remove a tag they created (by editing the visit).
8. If A deletes the visit, its pending tags vanish.

Example (A–B connected, B–C connected, A–C not): A and B went together and both accepted. C sees **B's** visit (if B's audience includes C) with "with A". C sees nothing of A's. Tapping "A" shows A's name and photo plus "Request to connect".

## 8. Audience lists

- Built-in **All connections**: everyone I'm connected to, automatically. Can't be edited or deleted.
- Built-in **Only me**: always empty. Can't be edited or deleted.
- **Custom lists**: name (1–30 chars, unique per user), any of my connections as members. Up to 20 custom lists.
- Audience picker (D4): options are All connections, Only me, and each custom list. **All connections** and **Only me** are exclusive (selecting one clears all others); custom lists can be multi-selected together. At least one option is always selected.
- When a connection is made: sheet E5 "You and Anu are connected!" with tickboxes for my custom lists (none ticked), [Done] / [Skip]. If I have no custom lists, the sheet offers "Create a list" instead.
- Removing someone from a list immediately hides content shared only through that list.
- Deleting a list: visits whose audience was only that list fall back to **Only me** (never widen). The dialog says so.

## 9. Wishlist

- Add from a place page (♡ button), from the confirmation screen ("Save + add to wishlist") or from a connection's wishlist (♡ on their item).
- **Only places I haven't visited.** The wishlist means "want to go", and saving a visit already removes the place from it, so every ♡ / Wishlist control is hidden for a place I've visited (C1, C2, the map preview, a connection's wishlist item, "Also add to my wishlist"). If such a place is somehow still on my wishlist, the control stays so it can be removed. `set_wishlist` ignores adds for visited places.
- Adding notifies no one.
- Visibility: my wishlist has its own audience (default **All connections**), changed from Profile → Wishlist tab → "Who can see this".
- Shown on: Profile Wishlist tab, map ♡ layer, place page ♡ state.

## 10. Copy, share and AI import

### 10.0 Two ways in, one pipeline
WhatsApp on Android **can't share a text message to other apps**: it only forwards to other WhatsApp chats; messages can only be copied. Links are different, and can be shared (owner-tested 2026-10-13). So there are two ways in:
1. **Copy, the main path for WhatsApp messages.** Copy the text anywhere (WhatsApp, Instagram comments, Notes…), then open Thinnava. Two places offer to read it:
   - **Home card**, the fastest: if the clipboard has text, Home shows **"You copied a message"** with **Read it** and ✕ at the top of the feed.
   - **+ → "A friend told me" / "Found it online"** shows the **"Use copied text?"** chip (§10.4), the obvious place to look.
   - The app only checks *whether* the clipboard has text. It reads the text **only when the user taps Read it or Use**, so Android's "pasted from clipboard" notice appears only then.
   - After Read it or ✕ on the Home card, it stays hidden for 6 hours, so an old copy doesn't keep nagging. It comes back when the app sees the clipboard change while it's open.
2. **Share**: any app that offers Share → Thinnava (browser, Instagram, YouTube, Google Maps, Zomato, Swiggy, Messages…) sends the text or link straight in.

Both end in the same D7 reading → D8 confirmation (§10.2–10.3).

### 10.1 What can come in (copied or shared)
| Content | Behaviour |
|---|---|
| Plain text (a copied WhatsApp message, or text shared from another app) | AI import → confirmation (§10.3). Default source **Friend**. |
| Text containing a URL | Treated by URL type first (rows below); remaining text is passed to the AI with it. |
| Google Maps link (`maps.app.goo.gl`, `google.com/maps`, `goo.gl/maps`) | Resolved straight to the place; confirmation with source **Internet**, place prefilled. |
| Zomato / District / Swiggy restaurant link | Treated as an internet find: link kept; the restaurant name in the shared text goes to the AI. |
| Instagram link | Confirmation with source **Internet**, link kept, plus a field "Paste the caption (optional)". Running AI on a pasted caption is one tap ("Read caption"). |
| YouTube link | v1: same as Instagram (link kept, paste text). v2: metadata import. |
| Any other URL | Server fetches the page's title and description (best effort, 5 s timeout) and runs AI on it with source **Internet**, link kept. |
| Not signed in (share only; copying happens inside the app) | Share is kept on the device; after sign-in the import continues. |
| Offline | The text or link is kept as a draft "Waiting for internet" (F6) and processed when back online. |

### 10.2 Reading
D7 "Reading this…" sheet with the cat (over the app that shared it, or inside Thinnava when the text was copied). Target ≤ 3 s, timeout 15 s. On failure, not-food text, or no place found: "Couldn't find a place in that" → [Fill it in myself] opens the manual form (D5) prefilled with whatever was found.

### 10.3 Confirmation (D8)
- One screen per place found ("1 of 3"), each with **Save** and **Discard**. After the last one, return to where the user was (or Home if the app was opened by a share).
- Fields: Source toggle (Friend / Internet) · Who told you? (friend source, required) · Place (best Google match, [change] → other candidates / D1) · Rating · Loved · Didn't like · Price per person · When they went (friend) · link (internet) · the original message "for checking · not saved".
- Low-confidence fields (confidence < 0.6) get an amber "check this" flag. Confidence is never stored.
- Empty fields stay empty; nothing is guessed.
- Buttons: **Save** (primary) and an overflow toggle "Also add to my wishlist" (off by default).
- Group totals: if the message gives a total for a group ("1200 for 4"), the AI converts to per person and marks price confidence low.

### 10.4 Copy route and manual entry
+ → "A friend told me" / "Found it online" opens D5 directly. If the clipboard has text, a chip "Use copied text?" appears at the top; tapping it runs the same AI import (D7 → D8). The clipboard is read only on that tap. Together with the Home card (§10.0), this is the route for WhatsApp messages. Without copied text, D5 is simply the manual form (no AI).

## 11. Hand-offs (going, ordering)

### 11.1 Buttons on the place page (v1)
| Button | Shown when | Opens |
|---|---|---|
| **Directions** | Always | `https://www.google.com/maps/search/?api=1&query=<name>&query_place_id=<placeId>` (a plain link: free, no API key) |
| **Swiggy** | Always, except on permanently closed places | `https://www.swiggy.com/search?query=<url-encoded place name>` (owner-tested 2026-10-12: opens the Swiggy app with search results) |

Links open with the system: Android routes them into the app if it's installed, otherwise the browser. The mockups still show Zomato and District buttons; **ignore those in v1**.

### 11.2 Why only these two in v1
Owner phone tests (2026-10-12 to 10-13, restaurant: Meghana Foods, Residency Road):

| Link | Result |
|---|---|
| Swiggy search `swiggy.com/search?query=<name>` | ✅ App opens with results (used in v1) |
| Zomato search (web `?q=`, `zomato://search?q=`, intent) | ❌ Opens Zomato's search page with an empty search box |
| Zomato by ID `zomato://restaurant/51639`, `zomato://r/51639` | ✅ Opens the restaurant (only if the Zomato app is installed) |
| Zomato web page `zomato.com/bangalore/meghana-foods-residency-road` | ✅ Opens the restaurant in the app |
| District search (web, `edition://`, `district://`) | ❌ Nothing, or a 404 |
| District web page `district.in/dining/bangalore/meghana-foods-residency-road` (and `/book`) | ✅ Opens the restaurant |
| Zomato / District share links (`zomato.onelink.me/…`, `link.district.in/…`) | ✅ Open the restaurant |

Neither app can be searched by name, so a Zomato or District button needs that restaurant's own page link. The owners chose to keep this for v2.

### 11.3 v2: Zomato and District buttons
- **Links are web page URLs**, stored per place in a `place_links` table: `zomato.com/<city>/<slug>` and `district.in/dining/<city>/<slug>`. The slugs can't be guessed (some end in `-bangalore`, some don't), so they must be looked up.
- **Automatic lookup.** When a place is first added, a backend job searches the web for its Zomato and District pages: Gemini with Google Search grounding, on the free no-billing key (§27.5). It pauses at the free limit. Check that grounding is in the free tier before building.
  - It keeps a URL only if the host matches, the city matches, and the slug matches the place name and area. Chains have many outlets, and there are look-alike names, such as "Meghana Biryani" next to "Meghana Foods".
  - No confident match means no button.
  - It re-checks every 90 days.
- **Backup:** sharing a Zomato or District restaurant link into Thinnava offers "Add this link to <place>?".
  - A District share link resolves to `district.in/dining/<city>/<slug>?…link_params={"res_id":"…"}`. District's `res_id` is the same as Zomato's, so one District share can set up both buttons.
  - Hosts to recognise: `zomato.onelink.me`, `zomato.com`, `link.district.in`, `district.in`.
- **"Wrong restaurant?"** in the place page ⋮ menu removes a bad link.

## 12. Notifications

| Type | Default | Text | Tap opens |
|---|---|---|---|
| Connect request | On | "**Anu** wants to connect" [Accept] [Decline] inline | E2 (their profile with Accept) |
| Request accepted | On | "**Anu** accepted your request" | E5 then E1 |
| Tag request | On | "**Anu** tagged you at **Bao Story**" with an inline [Add your review] | E8 |
| Connection visited | Opt-in per connection (🔔 on their profile) | "**Anu** visited **Bao Story**" | C2 |
| Visited a place on my wishlist | Opt-in per connection (same toggle) | "**Arjun** visited **Toit**, a place on your wishlist" | C2 |

- Activity notifications are sent only if the visit is visible to the recipient. One notification per visit per recipient (the wishlist variant wins).
- All notifications appear in F1 (newest first, unread dot). Push notifications are sent for all of them.
- Notification permission is asked in context (first time I send a request or tag someone), A7.
- No notification for: declines, rejects, un-tags, wishlist adds, list changes, removals, blocks.

## 13. Offline

| Action | Offline? |
|---|---|
| Reading anything already loaded | Yes, from the on-device cache (shows last-known data) |
| Add / edit / delete my visit, friend entry, internet entry | Yes, queued and synced later |
| Wishlist add / remove | Yes, queued |
| Friend name add / rename | Yes, queued |
| Picking a place | Only from places already cached on the device, or "Use '<typed name>' for now" (draft without a place) |
| AI import | No. The copied or shared text is kept as a draft and processed when online |
| Search, map tiles for new areas, Google info, social actions (requests, tags, lists, block), settings | No. Show "You're offline" toast; nothing is queued |

- **F8 banner** "You're offline · changes will sync" shows under the top bar while offline.
- Drafts without a Google place **stay on the device** and are never synced or shown to anyone until fixed in F6 ("Pick the place").
- If a queued visit tags someone who is no longer a connection by the time it syncs, that tag is dropped silently and the visit still saves.
- Sync conflicts: last write wins per entry (entries have a single owner, so conflicts only happen across the owner's own devices).

## 14. Screens

Routes are Expo Router paths (§26.2). States in italics. IDs match `idea.md` §19 and the mockups.

### A. Launch and onboarding
- **A1 Splash** `/` — chef cat, wordmark and "Did you eat?" while the session loads. Signed in with profile → Home. Signed in without profile → A3. Otherwise → A1b.
- **A1b Intro** (first page of `/welcome`) — one page; **swipe left**, **Next** or **Skip** goes to A2, with three-dot progress (2 of 3) and a **Skip** link (→ A2). The cat offering a dessert, "Remember every place your friends tell you about" / "No more scrolling chats to find 'that biryani place Rahul said'.", then a small map with two friends' pins and the caption "See where your people ate. No strangers, no ads." **Next** → A2.
- **A2 Welcome** (second page of `/welcome`; swipe right or Android back returns to A1b) — the last of the three onboarding screens (dots, 3 of 3): "Every place your friends rave about, in one spot." with three lines (Save what friends tell you · Log where you ate · See where your people have been) and **Continue with Google**. How to save a friend's message isn't taught here; the "Use copied text?" chip (§10.4) and the B1a tip do that when it's useful.
  - Under the button: "By continuing you agree to the Terms and Privacy Policy", with both linked (§27.4).
  - *Sign-in error* → snackbar "Couldn't sign in. Try again."
- **A3 Set up profile** `/setup` — "Set up your profile" / "This is how friends find you."
  - Name: prefilled from Google, required, 1–40 chars.
  - Username: required. Live check 400 ms after typing stops: "Checking…" → "@x is available" ✓ or "@x is taken. Try another." ✗. Hint: "Letters, numbers, . and _ only. 3–20 characters."
  - Bio: optional, 150 chars.
  - **Let's eat** button, disabled until everything is valid.
- **A7 Permission explainers** — dialogs before the system prompt. Location: first open of Map or D1 ("Show places near you?"). Notifications: first request or tag ("Know when Anand says yes?"). Denial never blocks anything.

### B. Main tabs (bottom nav: Home · Search · + · Map · Profile)
- **B1 Home** `/(tabs)` — top bar: wordmark, filter icon (hidden on a new user's empty feed), 🔔 (dot if unread). Timeline cards (one per entry, newest first by creation time), infinite scroll (20 per page), pull to refresh. Card: avatar or source mark; header "**Anu** went to" / "**You** went to" / "**Rahul** told you about", or for internet entries "From a reel" (Instagram link), "From a video" (YouTube), "From a link" (other link) or "Found online" (no link); place (Fredoka); meta line: area · "with Arjun" (visits with companions) or "went Oct 10" (friend entries with a date); time ago; ❤ loved line, 👎 didn't-like line; footer: rating pill, ₹/person, "Only you" lock for private entries, "with X" when tagged. Tap card → C2 (title glide motion). Tap the **avatar or name** → that person's profile (E1/E2); on my own cards → my Profile tab; on a friend entry → the profile of the connection that friend name is linked to (F4), and nothing if it isn't linked; internet entries have no person.
  - *Copied-message card* (§10.0): at the top of the feed when the clipboard has text. "You copied a message" / "Want us to read it?" with the peeking cat, **Read it** (→ D7) and ✕.
  - *B1a Empty*: cat peeking over a card, "Hi <first name>! Your feed is empty." / "Start with whichever is easiest." Buttons: **Log a place you've been** (→ D1), **Save what a friend told you** (→ D5 friend), **Find people you know** (→ Search · People). Tip: "Copy a friend's WhatsApp message, then open Thinnava".
  - *Filtered empty*: "No entries from friends yet" + the matching action.
- **B1b Home filter** sheet "Show" (radio): Everything · Connections ("Reviews they posted") · From friends ("What friends told you") · Internet ("Reels, videos, links") · Mine ("Places you went"). Any filter other than Everything shows as a chip under the top bar ("From friends ×").
- **B2 Map** `/(tabs)/map` — Google map with pins (§16.6), clustering and my location dot.
  - Top: a "Search places" bar (opens Search · Places; picking a result centres the map on it), a filter button, and **single-select layer chips**: All · Visited · Wishlist · Connections · Friends · Internet. All is the default; the chips scroll sideways.
  - "Locate me" button bottom-right.
  - Panning reloads pins for the visible area (debounced 500 ms).
  - A collapsible list sheet shows "N places here".
  - **B2a Map filters** sheet: price per person (Any · Under ₹200 · ₹200–500 · ₹500–1000 · ₹1000+), category (multi-select), a specific connection (picker). A place matches a price bucket if **any** entry I can see there has a price in that bucket. Places without a price are hidden while a price filter is on.
  - **B2b Pin card** slides up with:
    - place name and area · category;
    - up to 3 summaries from visible entries, each with its pill, like "**Rahul** loved the chicken burger" or "**Meera** said the fries were soggy". Each uses the first loved dish, else the first didn't-like dish, else just the rating;
    - ♡ wishlist, plus **Open place** and **Directions** buttons.
  - *No location permission*: centre on Bengaluru (12.9716, 77.5946). "Locate me" asks via A7.
  - Search bar → D1 in "Find on the map" mode; picking a place centres the map on it.
  - *A connection's map* (E1 → Open map) and *my map* (B5 → Open map) are B2 with a scope: a removable chip "Anand's map ×" leads the chips (only All · Visited · Wishlist then), or the tab's layer is preselected. × returns to the normal map.
  - *No Maps key yet* (dev, before `thinnava-maps` has billing; the Maps SDK crashes without a key): the same top bar, chips, filters and pin card over a plain list of the places around Bengaluru, with the note "The map turns on once Google Maps is set up."
- **B3 + speed dial** — three circles: **I went somewhere** (→ D1 → D2), **A friend told me** (→ D5 friend), **Found it online** (→ D5 internet).
- **B4 Search** `/(tabs)/search` — one search box with segments **Places | People**.
  - **Places, while typing** (250 ms debounce): first, places already in Thinnava that match the name and where I can see entries; then Google name suggestions (Autocomplete). Before typing: "Recent" places I opened.
  - **Places, on search** (keyboard Search key, or tapping "See all results for 'biryani'"): Google keyword search (Text Search) near me, or near the map centre. A food word like "biryani" finds biryani places; we never search our own dish text.
    - Results start with places where someone I know has been, showing their faces and "3 went" / "You went".
    - Then a "Nobody you know has been" section with area · category.
  - **Filter chips:**
    - "Someone I know went": a toggle that hides the second section.
    - Category: multi-select.
    - ₹ Price: same buckets and rule as B2a. Places with only Google info are hidden while a price filter is on.
  - **People**: username search (prefix match, at least 2 chars, debounced).
    - Rows: photo, name, "@username" (plus " · Connected" or " · wants to connect").
    - One button showing the status: Connect · Requested · Accept · Connected.
    - Blocked users don't appear.
    - Footer: "People only see each other's food life after both say yes."
  - Tap a place → C1. Tap a person → E1/E2.
- **B5 My profile** `/(tabs)/profile` — top bar "Profile" with round buttons **Connections** (→ E3) and **Settings** (→ F2).
  - Centred photo, name, @username, bio.
  - Counts: **Visited · Wishlist · Connections**.
  - Tabs: **Visited** · **Wishlist** · **Saved**. Each tab has an "Open map" row above its list (→ B2 limited to that tab's places).
  - Saved tab: "Only you can see this tab.", chips All · From friends · Internet, rows like "Burger Factory / Rahul · Koramangala" with the pill.
  - Lists load 20 at a time, more on scroll.
  - Wishlist tab: "Who can see this" (→ D4 for the wishlist audience).

### C. Places and entries
- **C1 Place page** `/place/[placeId]`
  - Top bar: back and **♡** (wishlist toggle; hidden once I've visited, §9).
  - Title (Fredoka). Meta line: category · area.
  - A small **Google info** row: tapping it loads Google's rating, price level and opening hours (§25.5). In "off" mode, the row reads "See rating and hours on Google Maps" and opens the Directions link instead.
  - Action row: **Directions** · **Swiggy**.
  - **Your visits**: date + pill for each; tap → C2.
  - **People who've been**: connections' visits I can see plus my own friend/internet entries, newest first. Each shows: avatar or source mark; name or "Rahul told you" / "From a reel" (avatar and name open the person's profile, as on B1); "with …"; pill; loved / didn't-like lines; ₹/person · date; "Only you" on my private entries.
  - Primary FAB **Add visit**. ⋮ menu: Open in Google Maps.
  - *C1a Nobody you know has been*: "Nobody you know has been yet." The address shows straight away (basic info). A **Show Google's rating, hours and price** button loads the rest. Tapping ♡ shows the snackbar "Added to your wishlist · Who sees it" (→ D4 for the wishlist).
  - *C1b Closed*: "Permanently closed" label. History stays. Swiggy is hidden; Directions stays.
- **C2 Entry detail** `/entry/[type]/[id]`
  - Title: "Rahul's experience" / "Ananya's visit" / "Your visit" / "Found online".
  - Place (tap → C1) with area · category, then the pill.
  - Rows: Loved · Didn't like · Price · Went on. Then "with …" and notes (visits only).
  - Footer line: "Logged by you on Oct 11 · Only you can see this" (saved entries) or "Shared with All connections" (my visits). Internet entries show an "Open link" button.
  - Buttons: **Edit** (owner only) and **Wishlist** (♡; only for a place I haven't visited, §9).
  - ⋮ menu: Delete (owner) · Remove me from this visit (tagged person).

### D. Creating and editing
- **D1 Place picker** `/pick-place` — search field (autofocus), "Nearby" list (if location allowed), "Recent". Offline: cached places only + "Use '<text>' for now" (draft).
- **D2 Add / edit visit** `/visit/new?placeId=` · `/visit/[id]/edit` — place header (tap to change), Date (today), **How was it?** (3 big pills, required), Loved / Didn't like (chip inputs: type, Enter adds), Price per person (₹ numeric), Went with (→ D3), Notes, "Shared with" row (→ D4, shows "All connections"). **Save visit** primary (disabled until a rating is chosen).
- **D3 Went with** sheet — search my connections + my companion names; selected chips at top; "Add '<text>' as a private name".
- **D4 Who can see this?** sheet — options per §8 with member counts; [Done].
- **D5 Friend / internet entry (manual)** `/saved/new?source=friend|internet` · `/saved/[id]/edit` — Source toggle; Friend: Who told you? (→ D6, required); Internet: Link (optional); Place (→ D1); How was it for them? (optional pills); Loved; Didn't like; Price per person; When they went (friend only, optional). If the clipboard has text: a banner "Use copied text?" and **Use** (runs the AI import). No preview of the text: reading it for a preview would trigger Android's "pasted" notice before the user asks (§10.0). **Save**.
- **D6 Who told you?** sheet — autocompletes from my friend names. Each row shows "5 entries", and linked names show "Linked to @rahulk". Last row: "Add '<text>' as a new name". Note: "Names are private to you. Link one to a connection from Settings → Friend names."
- **D7 Reading** sheet — opens inside Thinnava when the text was copied (over Home after Read it, or over D5 after Use), or over the app that shared it: "Reading this message…" / "Looking for the place, dishes and price." with the cat. Never shows a sender's name, because we don't know it. *Failed*: "Couldn't find a place in that" / "No worries, fill it in yourself." [Fill it in].
- **D8 Confirmation** `/import` — "Check what we found", "1 of 2"; behaviour per §10.3.
  - Who told you? shows quick-pick chips of my most recent friend names.
  - Flags read "Please check this".
  - Buttons: Discard / Save.
  - *D8b Which one?* appears only when the name matches several Google places: "We found 2 places called Burger Factory. Pick the right one." Rows show name and address · distance. "Search for a different place" → D1. Button **Use this place**.
- **D10 Delete?** dialog — for a visit: "Delete this visit?" / "It'll disappear for everyone you shared it with." (adding "Arjun's own review stays on their profile." when tags were accepted). For a saved entry: "Delete this entry?" / "This can't be undone." [Cancel] [Delete].

### E. People
- **E1 Connection's profile** `/people/[userId]`
  - Photo, name, @username, bio.
  - A "Connected" chip, and a chip naming which of my lists they're in (tap → E5).
  - "24 visited", the 🔔 activity toggle, and ⋮ (Add to lists · Remove connection · Block).
  - Tabs: **Visited** (visits shared with me) · **Wishlist** (if shared with me; ♡ on an item copies it to mine, shown only for places I haven't visited). Each tab has "Open map".
- **E2 Not connected** — name, photo, @username, "Connect to see where Anand eats" / "Once you both say yes, you'll see each other's visits and wishlist." Button **Request to connect**, which becomes **Requested** (tap to cancel); if they asked me, **Accept** + Decline instead. ⋮ Block.
- **E3 Connections** `/connections` — two tabs: **Connections · N** (list with search) and **Requests · N** ("Want to connect with you" with Accept / ×; "You asked" with Cancel). The person+ icon opens Search · People.
- **E4 Find people** — same as Search → People (opened from Home empty state).
- **E5 Add to lists** sheet — "You and Anu are connected!" / "Add Anu to any of your lists?" All connections is shown ticked and disabled ("Automatic"); custom lists are tickboxes; Skip / Done. Rules in §8.
- **E6 My lists** `/lists` — All connections (count), Only me, custom lists (count) + **New list**.
- **E7 List detail** `/lists/[id]` — rename, members (add from connections, remove), Delete list (dialog explains fallback to Only me).
- **E8 Tag request** `/tag/[tagId]` — "You were tagged" / "Ananya says you went to Bao Story together on Oct 9." Ananya's review card ("Shared with you"), then "To accept, add your own review. It'll be yours, shared with your own lists." Buttons: **Write my review**, **Same as Ananya's**, and a text button **Not me, reject**.
- **E9 Remove / Block** dialogs — Block: "Block Anand?" / "Anand won't be able to find you, send you requests or tag you. If you're connected, you'll be disconnected. They won't be told." Remove connection uses the same dialog with softer wording.

### F. Notifications, settings, housekeeping
- **F1 Notifications** `/notifications` — grouped Today / Earlier. Rows follow §12, with inline actions (Accept / Decline, Add your review). Opening the screen marks everything read.
- **F2 Settings** `/settings`
  - Profile card: photo, name, @username, Edit (→ F3).
  - Group 1: Connections · My lists · Blocked people.
  - Group 2: Friend names · Private companion names · Offline drafts (with a badge count).
  - Group 3: Notifications (opens Android's notification settings for the app) · About & privacy (§27.4: the Gemini line up front, then the privacy policy and terms in the app, synced from `docs/legal` by `tools/legal/sync.mjs`, plus "Open on the web") · Sign out · Delete account.
- **F3 Edit profile** `/settings/profile` — same fields as A3.
- **F4 My friend names** `/settings/friend-names` — list with entry counts; ⋮ per name: Rename · Merge into… (pick another name; entries move, this name is deleted) · Link to a connection / Unlink · Delete (only if it has no entries). No automatic merge suggestions.
- **F5 My companion names** `/settings/companion-names` — each name with "N visits"; ⋮ rename (changes it on every visit) · delete (removed from those visits, which stay).
- **F6 Offline drafts** `/settings/drafts` — Waiting to sync (auto) · Needs a place (tap → D1 with text prefilled) · Waiting for internet (copied or shared messages) · Couldn't sync (error + Retry / Delete).
- **F7 Delete account** `/settings/delete-account` — "Sad to see you go, Karthik", then counts of what will be deleted (visits, friend and internet entries, connections and lists) and "All of this is deleted permanently. Tags on other people's visits are removed." Typing your username enables **Delete my account**.
- **F8 Offline banner** — state, per §13.
- **Blocked people** `/settings/blocked` — list with Unblock.

## 15. Copy and tone

- Plain, warm, short. Sentence case everywhere. No jargon ("audience" appears only as "Who can see this?").
- Names in bold inside sentences. Use "went to", "told you about", "found online".
- Never say "review" for a friend entry: "Rahul's experience · logged by you".
- Never use he/she for users. Use their name or "they" (the mockups' "He won't be told" becomes "They won't be told").
- Errors say what happened and what to do: "Couldn't save. We'll try again when you're online."
- Key strings: "Request to connect" button label is **Connect**; private mark is **Only you**; price is **₹300 / person**; rating labels **Good / Okayish / Bad**.

## 16. Design system (summary; full detail in `DESIGN.md`)

### 16.1 Colour roles (Cobalt)
| Role | Hex | Use |
|---|---|---|
| `primary` | #2350D9 | Primary buttons, + button, focus, own pins |
| `primaryStrong` | #16348F | Wordmark, clusters, icons in marks |
| `onPrimary` | #FFFFFF | |
| `primaryContainer` | #DBE4FF | Tonal buttons, selected chips, nav indicator |
| `onPrimaryContainer` | #0E2266 | |
| `background` | #EEF2FF | Page ground (Mist) |
| `surface` | #FFFFFF | Cards, sheets, fields |
| `surfaceTint` | #E6ECFF | Source marks, segmented track |
| `ink` | #10183A | Headings, names |
| `inkSoft` | #46507A | Body |
| `inkMuted` | #5C668C | Meta, placeholders |
| `hairline` | #D9E0F7 | Strokes, dividers |
| `scrim` | rgba(10,20,60,.42) | Behind sheets |
| `good` / `goodWash` | #17703E / #DDF2E4 | Good pill, success |
| `okayish` / `okayishWash` | #845300 / #FBEFD2 | Okayish pill, "check this" flag |
| `bad` / `badWash` | #A8301F / #FADFDB | Bad pill, errors, notification dot |

Verdict colours are fixed and never decorative. No gradients. Light mode only.

### 16.2 Type
Fredoka 600 for wordmark, headings, place names, big numerals. Nunito (400/600/700/800) for everything else. Sizes: display 42 · headline 26 · title 20 · place title 17.5 · body 15 · strong body 15.5/800 · label 12.5/700 · button 16/800.

### 16.3 Shape and spacing
Radii: chip 10 · thumb 14 · field 16 · fab 18 · card 20 · panel 24 · list surface 26 · sheet 28 · pill 999. Gutter 18 (feed 14, 10 between cards). Touch targets ≥ 48 dp. Buttons 52 dp (small 40).

### 16.4 Ground
Flat Mist with **Rings** art (thin concentric arcs in two corners) on onboarding and the four main tabs only. All other screens: plain Mist.

### 16.5 Components
Button (primary / tonal / outline / small / disabled 40%), Chip (+selected), ReviewPill (signature), EntryCard, ListSurface + rows, TextField (focus / error / success helper), ChipInput (dishes), TopBar, NavBar with + button, SpeedDial, BottomSheet, Dialog, Snackbar, SegmentedControl, Avatar (initials tints `#E07A5F #6C8EBF #7FB069 #B07AA1 #E3A73B`), SourceMark (person / globe), MapPin, Cluster, EmptyState with CatPeek, OfflineBanner. Icons: Lucide, stroke 2, 22 dp (16 in chips).

### 16.6 Map pins
White pill bubble with tail: 24 dp avatar (who) or glyph circle (♡ wishlist, ✓ went, globe internet, person friend) + place name 12.5/800. My pins: primary fill, white text. Clusters: 38 dp `primaryStrong` circle, white count, white halo.

### 16.7 Motion
Follow `DESIGN.md` → Motion and `design/motion.html`. Curves: standard (.2,0,0,1), decelerate (.05,.7,.1,1), accelerate (.3,0,.8,.15). Tabs: 280 ms crossfade. Pushed screens: shared axis X. Card → place: title glide 460 ms. Sheets: 400 ms up / 250 ms down. Speed dial: 250 ms, 30 ms stagger, + rotates 135°. Share import: the signature sequence. **Remove animations** (system setting): every movement becomes a ≤150 ms crossfade.

### 16.8 App icon and splash (interim, until branding)
- Android adaptive icon: the foreground is the chef cat's face, cropped from `ui-references/7.png` (alpha-matted). The background is `primary` #2350D9. The monochrome layer is the cat's silhouette.
- Splash: Mist background, sitting cat, "Thinnava" wordmark.
- Both are produced in M1 into `app/assets/`.

### 16.9 Accessibility
Every touchable has an accessibility label; rating pills announce "Rating: Good". Supports font scaling up to 130% without clipping. Contrast ≥ 4.5:1 for text. Colour is never the only signal (pills have face icons and words).

---

# Part B: Engineering

## 17. Architecture

```
 Android app (Expo / React Native, TypeScript)
 ├─ UI: Expo Router screens + design-system components
 ├─ Server state: TanStack Query (persisted to MMKV for offline reads)
 ├─ Offline writes: Outbox (MMKV) → flushed to Supabase when online
 ├─ Share target: expo-share-intent (ACTION_SEND text/*)
 ├─ Auth: Google Sign-In (native) → Supabase signInWithIdToken
 └─ Map: react-native-maps (Google provider) + supercluster
            │  HTTPS (supabase-js, JWT)
            ▼
 Supabase (region ap-south-1, Mumbai)
 ├─ Postgres: tables + Row Level Security + RPC functions (all privacy rules live here)
 ├─ Auth: Google provider
 ├─ Edge Functions (Deno/TypeScript): places · extract · links · push · delete-account
 ├─ pg_net trigger: notifications INSERT → push function (URL + secret in Vault)
 └─ pg_cron: weekly refresh of stale place rows
            │
            ▼
 External: Google Places API (New) · Gemini API · Expo Push (→ FCM) · Google Maps SDK (tiles, on device)
```

Principles:
- **Privacy is enforced in the database** (RLS + security-definer RPCs). The app never filters for privacy on its own: if a query returns something, the user is allowed to see it.
- **Secrets never ship in the APK**, except the Android-restricted Maps SDK key and the Supabase publishable key.
- **Client-generated UUIDs** for visits, saved entries and friend names, so offline creates are idempotent.
- Shared code stays **web-compatible** (no Android-only APIs outside `src/platform/`) so a web version can come later.

## 18. Tech stack (decided)

### 18.1 App
| Concern | Choice |
|---|---|
| Framework | **Expo** (latest stable SDK at M0; exact versions recorded in `changelog.md`), React Native New Architecture, **TypeScript strict** |
| Build | Expo **development builds** (Expo Go can't load our native modules); **EAS Build** for APKs |
| Navigation | **Expo Router** (file-based; Stack + custom tab bar) |
| Server state | **@tanstack/react-query** v5, cache persisted to MMKV |
| Local storage | **react-native-mmkv** (query cache, outbox, drafts, pending shares, small settings) |
| Small UI state | **zustand** (home filter, map layers, picker results, import session) |
| Backend client | **@supabase/supabase-js** v2 (session stored in MMKV) |
| Auth | **@react-native-google-signin/google-signin** → `supabase.auth.signInWithIdToken` |
| Share target | **expo-share-intent** (config plugin) |
| Map | **react-native-maps** (Google provider, custom style JSON from the DESIGN.md map colours) + **supercluster** |
| Animation | **react-native-reanimated** + **react-native-gesture-handler** |
| Sheets | **@gorhom/bottom-sheet** |
| Lists | **@shopify/flash-list** |
| Forms | **react-hook-form** + **zod** |
| Fonts | `@expo-google-fonts/fredoka`, `@expo-google-fonts/nunito` |
| Icons | **lucide-react-native** (+ react-native-svg) |
| Other Expo modules | expo-location, expo-notifications, expo-clipboard, expo-image, expo-splash-screen, expo-linking, expo-crypto (UUIDs), expo-haptics |
| Network status | @react-native-community/netinfo |
| Dates | date-fns; "today" is computed in Asia/Kolkata |
| Tests | jest-expo + @testing-library/react-native |

### 18.2 Backend
| Concern | Choice |
|---|---|
| Database / Auth / Functions | **Supabase** (free plan), Postgres, Edge Functions on Deno |
| AI | **Google Gemini, Flash-tier model, free tier only**: the API key comes from a Google Cloud project with **no billing account**, so it can never be charged (§27.5). JSON output with a response schema. Model ids in env: `GEMINI_MODEL` = **`gemini-3.5-flash-lite`** and `GEMINI_FALLBACK_MODEL` = `gemini-flash-lite-latest` (separate free allowance). Not `gemini-3.5-flash`: its free tier allows only 20 requests a day per project (measured 2026-10-16). Called only from the `extract` function. |
| Places | **Google Places API (New)**: Autocomplete, Place Details, Text Search, Nearby Search. Called only from Edge Functions. |
| Push | **expo-notifications** + **Expo Push Service** (FCM v1 credentials uploaded to EAS) |
| Scheduled jobs | pg_cron + pg_net |
| Migrations | Supabase CLI (`supabase migration new`, `supabase db push`) |

### 18.3 Web version (M10)
**Why:** friends on iPhone (no iOS app, §4.3) and on laptops can use Thinnava from a link, on the same account and data.

**How:** the same Expo app runs on `react-native-web` and is exported as a static site (`expo export -p web`), hosted free on Cloudflare Pages (no card; GitHub Pages needs a paid plan for a private repo). Same Supabase backend. Web versions of `src/platform/` (`*.web.ts(x)` files):
- **Sign-in:** Supabase `signInWithOAuth({ provider: 'google' })` redirect (the same `thinnava-free` Web OAuth client, with the site's origins and redirect URLs added).
- **Map:** the B2 list mode until `thinnava-maps` has a key; then `@vis.gl/react-google-maps` (Maps JavaScript API, its own free monthly amount, capped like Places, §27.5).
- **Share:** none. A **"Paste a message"** button on Home and D5 replaces the automatic "You copied a message" card (browsers can't check the clipboard without asking).
- **Notification settings, push, offline outbox:** not on web at first (rows hidden; the in-app 🔔 list works).
- Edge Functions answer browser preflight (CORS). `Access-Control-Allow-Origin: *` is safe here: requests are authorised by the user's bearer token, never cookies.
- Copy flow labels come from `PASTE_TEXT` in `features/import/clipboard(.web).ts`.
- Tappables nested inside tappables (a photo in a card, Accept in a notification row) drop the `button` role on web only, because HTML forbids a button inside a button.

**Compared with Android:**
- *Browser limits:* no automatic copied-message card (one extra tap); no "Share to Thinnava" on iPhone (paste the link); push on iPhone only after "Add to Home Screen"; no vibration; Back is the browser's.
- *Postponed (can be added later, free):* web push, offline saving, the real map (waits for Google billing, same as Android), some animations simpler.
- *Same:* everything else, on the same account.

**Web layout (owner-approved design, `design/web.html`, 2026-10-18).** The same four pages (Home · Search · Map · Profile), the same tokens, fonts and words, laid out the way a website works. The Android app does not change.

*Shared, all browser widths:*
- A **top bar** replaces the bottom bar and the + speed dial: wordmark, the four pages as text links (laptop) or tabs under the bar (phone), **Paste a message** (laptop; on phones it lives on Home), **+ Add** (opens a small menu with the speed dial's three choices: I went somewhere · A friend told me · Found it online), 🔔 (outline bell, red dot when unread) and my avatar (laptop, → Profile). Each page's own Android top bar (Home's wordmark, filter and bell; Profile's title) is not shown on web.
- **Keyboard (laptop):** `/` goes to Search, `N` starts "I went somewhere", **Ctrl+V** (⌘V) anywhere outside a text field reads the pasted text into the import flow (§10), the same as "Paste a message". Esc closes sheets, dialogs and menus.
- Screens other than the four pages (place, entry, forms, settings, people, notifications…) sit in a centred column (max ≈ 720 px) under the top bar; sheets open as centred panels.
- Hover states on everything tappable (a light dim).

*Laptop (≥ 1024 px wide):* content is centred, max ≈ 1160 px.
- **Home:** the feed in a main column with the B1b filters as a segmented control in its heading ("What your people ate": Everything · Connections · From friends · Internet · Mine) and day headings (Today · This week · Earlier). Hovering a card shows three small actions on it: **♡ Wishlist** (not on my own visits; adds the place, same rules as C1), **Directions** and **Swiggy** (§11.1 links). Clicking elsewhere on the card still opens it. A side column (≈ 360 px): **Got a tip from a friend?** paste box (with the Ctrl+V hint) → **Notifications** (newest 3, inline Accept / Add your review, "See all" → F1; reading them here does not mark them read) → **Your wishlist** (newest 3, "See all" → Profile · Wishlist).
- **Search:** one large search box, Places | People under it, then a left filter sidebar (Someone I know went · Type · Price per person, same rules as B4) and the results as a table (Place · Who went · Area · Price), "Your people went" first, then "Nobody you know has been". The search area shows as "Near you" / "Near Bengaluru"; tapping it asks for location (A7).
- **Map:** a left panel (≈ 420 px) with the layer chips, filters and the list of places; the map fills the rest. Until `thinnava-maps` has a key the right side shows the "The map turns on once Google Maps is set up" note and the list stays in the panel.
- **Profile:** a tinted cover band with Rings, then photo, name, @username, bio and counts (Visited · Wishlist · Connections) on one row with **Connections** and **Settings** buttons; the three tabs (Visited · Wishlist · Saved) as underlined tabs with "Open on map"; entries as a 3-column grid of cards.

*Phone browsers (< 1024 px):* the app's screens, with three differences that mark it as the website:
- the **top bar** above (wordmark, + Add, 🔔; tabs Home · Search · Map · Profile underneath); there is no bottom bar, because Safari keeps its own address bar at the bottom;
- **paste-first Home:** a large blue "Got a tip from a friend? · Paste a message" card at the top of the feed (✕ hides it for 6 hours, as today);
- an **Add to Home Screen** card on Home ("Keep Thinnava on your home screen · Opens full screen, like an app · Show me how", ✕ hides it for good). It is shown only in a browser tab, never once Thinnava runs from the home screen. On iPhone "Show me how" opens a sheet with three steps (Share → Add to Home Screen → Add); where the browser offers its own install prompt (Android Chrome), the button uses it. The site ships a web app manifest (name, icon, Mist theme colour) so it installs with the right name and icon.

*Signed out (front page, replaces A1b/A2 on web):* one headline ("Every place your friends rave about, in one spot."), one line of what it does, **Continue with Google** with the Terms / Privacy line, "Already use Thinnava on Android? Same Google account, same places.", an example of a friend's WhatsApp message turning into a saved place, three short lines (Save what friends tell you · Log where you ate · See where your people went) and a footer with Privacy and Terms. "Sign in" in the corner is the same Google button. New accounts continue to A3; existing ones land on Home.

**Hosting:** Cloudflare Pages (free, no card), address `thinnava.pages.dev` until a custom domain is chosen. The site's origin is added to the Google OAuth client and Supabase redirect URLs at release. `app/public/_headers` tells browsers not to show the site inside other sites' frames (`X-Frame-Options: DENY`, `frame-ancestors 'none'`) and limits browser features to what Thinnava uses (location only).

## 19. Repository layout

```
thinnava/
├─ spec.md  changelog.md  CLAUDE.md  DESIGN.md  PRODUCT.md  idea.md
├─ design/            mockups (phase1, phase2, motion) + assets
├─ ui-references/
├─ app/               Expo app
│  ├─ app.config.ts   eas.json   package.json   tsconfig.json   .env.example
│  ├─ assets/         cat-sitting.png, cat-peek.png, swiggy.svg, icon, splash
│  └─ src/
│     ├─ app/                         Expo Router routes (§26.2)
│     ├─ components/                  design-system primitives (§16.5), one file each
│     ├─ features/
│     │  ├─ auth/  feed/  places/  visits/  saved/  social/  lists/  tags/
│     │  ├─ wishlist/  notifications/  map/  import/  handoff/  offline/  settings/
│     │  └─ each: api.ts (rpc / function calls) · hooks.ts (queries, mutations) · components/ · schema.ts (zod)
│     ├─ lib/       supabase.ts · queryClient.ts · storage.ts · outbox.ts · net.ts · ids.ts · format.ts · dates.ts
│     ├─ platform/  map/ · signin/ · share/   (Android implementations; web later)
│     ├─ theme/     tokens.ts · type.ts · motion.ts · mapStyle.json
│     └─ types/     db.ts (generated by `supabase gen types`) · domain.ts
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/   0001_profiles.sql, 0002_places.sql, 0003_visits.sql, …
│  ├─ functions/    _shared/ · places/ · extract/ · links/ · push/ · delete-account/
│  ├─ tests/        pgTAP privacy and RPC tests
│  └─ seed.sql      demo data (team accounts only; never on real users' data)
└─ tools/
   └─ extraction-eval/   messages.jsonl · expected.jsonl · run.ts
```

## 20. Database schema

All tables live in `public`. Timestamps are `timestamptz`. Visits, saved entries and friend names use client-generated UUIDs; everything else uses `gen_random_uuid()`.

```sql
create extension if not exists citext;

create type rating         as enum ('good','okayish','bad');
create type saved_kind     as enum ('friend','internet');
create type list_kind      as enum ('all','only_me','custom');
create type tag_status     as enum ('pending','accepted');
create type place_category as enum ('restaurant','cafe','bakery','dhaba','tea_shop','fast_food',
                                     'dessert','bar','street_food','delivery_only');
create type notif_type     as enum ('connect_request','connect_accepted','tag_request',
                                    'connection_visited','wishlist_visited');

-- People ---------------------------------------------------------------
create table profiles (
  id           uuid primary key references auth.users on delete cascade,
  username     citext not null unique
               check (username ~ '^[a-z0-9._]{3,20}$' and username !~ '^[._]' and username !~ '[._]$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_url   text,
  created_at   timestamptz not null default now()
);
create table profile_details (            -- connection-only fields
  user_id uuid primary key references profiles on delete cascade,
  bio     text check (char_length(bio) <= 150)
);
create table connection_requests (
  from_user  uuid references profiles on delete cascade,
  to_user    uuid references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_user, to_user), check (from_user <> to_user)
);
create table connections (                -- one row per pair, user_a < user_b
  user_a     uuid references profiles on delete cascade,
  user_b     uuid references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b), check (user_a < user_b)
);
create table blocks (
  blocker    uuid references profiles on delete cascade,
  blocked    uuid references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);
create table declined_requests (          -- silent declines (§5.1): only the sender can read it, so they keep seeing "Requested"
  from_user  uuid references profiles on delete cascade,
  to_user    uuid references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_user, to_user)
);
create table list_prompts (               -- "add to lists" sheet still to show
  user_id    uuid references profiles on delete cascade,
  other_user uuid references profiles on delete cascade,
  primary key (user_id, other_user)
);
create table activity_subscriptions (     -- the 🔔 toggle per connection
  subscriber uuid references profiles on delete cascade,
  target     uuid references profiles on delete cascade,
  primary key (subscriber, target)
);

-- Audience lists ----------------------------------------------------------
create table audience_lists (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references profiles on delete cascade,
  kind       list_kind not null,
  name       text not null check (char_length(name) between 1 and 30),
  created_at timestamptz not null default now()
);
create unique index on audience_lists (owner, kind) where kind <> 'custom';
create unique index on audience_lists (owner, lower(name));
create table list_members (
  list_id   uuid references audience_lists on delete cascade,
  member_id uuid references profiles on delete cascade,
  primary key (list_id, member_id)
);
-- Trigger after insert on profiles: create "All connections" (kind all) and "Only me" (kind only_me),
-- an empty profile_details row, and wishlist_audience = All connections.

-- Places --------------------------------------------------------------------
create table places (                     -- written only by Edge Functions (service role)
  place_id        text primary key,       -- Google Place ID (kept indefinitely)
  name            text not null,          -- cached ≤ 30 days, refreshed (§25.4)
  lat             double precision not null,
  lng             double precision not null,
  area            text,                   -- sublocality / neighbourhood
  address         text,
  primary_type    text,
  category        place_category,         -- derived (§25.3); null if unknown
  business_status text,                   -- OPERATIONAL | CLOSED_TEMPORARILY | CLOSED_PERMANENTLY
  refreshed_at    timestamptz not null default now()
);
create index on places (lat, lng);

-- Visits ----------------------------------------------------------------------
create table visits (
  id               uuid primary key,      -- client-generated
  author           uuid not null references profiles on delete cascade,
  place_id         text not null references places,
  visited_on       date not null,
  rating           rating not null,
  loved            text[] not null default '{}',
  disliked         text[] not null default '{}',
  price_per_person int check (price_per_person between 1 and 50000),
  notes            text check (char_length(notes) <= 500),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on visits (author, created_at desc);
create index on visits (place_id);
create table visit_audience (
  visit_id uuid references visits on delete cascade,
  list_id  uuid references audience_lists on delete cascade,
  primary key (visit_id, list_id)
);
create table tags (
  id              uuid primary key default gen_random_uuid(),
  visit_id        uuid not null references visits on delete cascade,   -- the tagger's visit
  tagger          uuid not null references profiles on delete cascade,
  tagged          uuid not null references profiles on delete cascade,
  status          tag_status not null default 'pending',
  tagged_visit_id uuid references visits on delete cascade,            -- the tagged person's visit, once accepted
  created_at      timestamptz not null default now(),
  unique (visit_id, tagged), check (tagger <> tagged)
);
create table companion_names (
  id    uuid primary key default gen_random_uuid(),
  owner uuid not null references profiles on delete cascade,
  name  text not null check (char_length(name) between 1 and 40)
);
create unique index on companion_names (owner, lower(name));
create table visit_companion_names (
  visit_id          uuid references visits on delete cascade,
  companion_name_id uuid references companion_names on delete cascade,
  primary key (visit_id, companion_name_id)
);

-- Saved entries (always private) -------------------------------------------------
create table friend_names (
  id          uuid primary key,             -- client-generated (can be added offline)
  owner       uuid not null references profiles on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  linked_user uuid references profiles on delete set null,
  created_at  timestamptz not null default now()
);
create unique index on friend_names (owner, lower(name));
create table saved_entries (
  id               uuid primary key,        -- client-generated
  owner            uuid not null references profiles on delete cascade,
  kind             saved_kind not null,
  place_id         text not null references places,
  friend_name_id   uuid references friend_names on delete restrict,
  source_url       text,
  rating           rating,
  loved            text[] not null default '{}',
  disliked         text[] not null default '{}',
  price_per_person int check (price_per_person between 1 and 50000),
  visited_on       date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check ((kind = 'friend'   and friend_name_id is not null and source_url is null)
      or (kind = 'internet' and friend_name_id is null and visited_on is null))
);
create index on saved_entries (owner, created_at desc);

-- Wishlist ----------------------------------------------------------------------------
create table wishlist_items (
  owner      uuid references profiles on delete cascade,
  place_id   text references places,
  created_at timestamptz not null default now(),
  primary key (owner, place_id)
);
create table wishlist_audience (
  owner   uuid references profiles on delete cascade,
  list_id uuid references audience_lists on delete cascade,
  primary key (owner, list_id)
);

-- Notifications, push, rate limits ------------------------------------------------------
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  recipient  uuid not null references profiles on delete cascade,
  type       notif_type not null,
  actor      uuid references profiles on delete cascade,
  visit_id   uuid references visits on delete cascade,
  tag_id     uuid references tags on delete cascade,
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index on notifications (recipient, created_at desc);
create table push_tokens (
  token      text primary key,
  user_id    uuid not null references profiles on delete cascade,
  updated_at timestamptz not null default now()
);
create table monthly_usage (             -- global Google call counters for the zero-cost caps (§27.5)
  month date not null,                   -- first day of the month (UTC)
  sku   text not null,                   -- 'autocomplete' | 'details' | 'details_rich' | 'text_search' | 'nearby'
  count int not null default 0,
  primary key (month, sku)
);
create table usage_caps (                -- monthly cap per SKU, set from Google's pricing page (§27.5)
  sku         text primary key,
  monthly_cap int not null check (monthly_cap >= 0)
);
create table usage_counters (
  user_id uuid references profiles on delete cascade,
  day     date not null,
  kind    text not null,                   -- 'extract' | 'places'
  count   int not null default 0,
  primary key (user_id, day, kind)
);
```

A shared trigger maintains `updated_at`. Dish arrays are validated inside the RPCs (≤ 10 items, 1–40 chars each, trimmed, case-insensitive dedupe).

## 21. Privacy enforcement (RLS)

### 21.1 Helper functions (`security definer`, `stable`, `set search_path = public`)
```
is_connected(a uuid, b uuid) → bool
    exists in connections with (least(a,b), greatest(a,b))

has_blocked(blocker uuid, blocked uuid) → bool

in_audience(owner uuid, viewer uuid, list_ids uuid[]) → bool
    true if any of list_ids (owned by owner) is kind 'all',
    or is kind 'custom' with viewer as a member

can_see_visit(v_id uuid) → bool          -- me = auth.uid()
    v.author = me
    or exists a tag on v with tagged = me
    or ( is_connected(me, v.author)
         and in_audience(v.author, me, <list ids from visit_audience for v>) )

can_see_visit_social(v_id, viewer) → bool
    can_see_visit without the "tagged" clause. Feeds, place pages, profiles,
    who_went and notification fan-out use it, so a pending or rejected tag
    shows the visit only on C2 / E8, never in feeds.
    (can_see_visit_as(v_id, viewer) is the same rule as can_see_visit for any viewer.)

can_see_wishlist(owner uuid) → bool
    owner = me or ( is_connected(me, owner) and in_audience(owner, me, <owner's wishlist_audience>) )
```

**Who may call functions (security review, 2026-10-18).**
- Signed-out visitors (`anon`) may call **no** function in `public`; nothing in the app needs one before sign-in. The default `PUBLIC` execute grant is revoked too, for existing and future functions.
- The helpers that take *any* two people (`is_connected`, `has_blocked`, `in_audience`, `resolve_audience`, `can_see_visit_as`, `can_see_visit_social`) are callable only by other functions (they run as the owner), never through the API, so nobody can probe who is connected, blocked or in which list.
- Policies that need such a check use small helpers about the signed-in user only, in a `private` schema the API doesn't expose: `private.blocked_me(user)` and `private.connected_to(user)`.
- A saved entry's link (`source_url`) must start with `http://` or `https://`, and the app opens nothing else.

### 21.2 Policies (RLS is enabled on every table)
| Table | select | insert / update / delete |
|---|---|---|
| profiles | everyone signed in, **except** rows whose owner has blocked me (`private.blocked_me`) | own row only |
| profile_details | own, or connected to me (`private.connected_to`) | own |
| connection_requests | rows where I'm from or to | RPC only |
| connections | rows I'm in | RPC only |
| blocks | blocker = me | RPC only |
| audience_lists, list_members | owner only (members never learn which lists they're in) | RPC only (built-ins protected) |
| places | everyone signed in | service role only |
| visits | `can_see_visit(id)` | RPC `save_visit` / `delete_visit` |
| visit_audience | visit author | RPC |
| tags | tagger, tagged, or (`status = 'accepted'` and `can_see_visit(visit_id)`) | RPC only |
| companion_names, visit_companion_names | owner / visit author | RPC / owner |
| friend_names, saved_entries | owner only | owner (via RPC) |
| wishlist_items | `can_see_wishlist(owner)` | RPC `set_wishlist` |
| wishlist_audience | owner | RPC |
| activity_subscriptions, list_prompts, push_tokens | owner | owner / RPC |
| notifications | recipient | recipient may only set `read_at` |
| usage_counters, monthly_usage, usage_caps | nobody | service role only (via `consume_google_quota`) |

When an RPC returns the name of someone who has blocked the viewer (on a tag), it returns `"Someone"` and no id.

### 21.3 Privacy tests (must pass before any social feature ships)
pgTAP tests in `supabase/tests/` cover at least:
- the A–B–C tag scenario (§7);
- a "Close friends" visit is hidden from a connection outside that list;
- Only me is hidden from everyone;
- saved entries are never visible to others, even linked friends;
- block hides my profile from the blocked user;
- a pending tag is visible only to the tagger and the tagged user;
- disconnecting hides content but keeps tag names;
- deleting a list makes its visits fall back to Only me;
- bio is hidden from non-connections;
- signed-out visitors can't call any function, and nobody can call the two-person helpers (`is_connected`, `has_blocked`, `in_audience`…) through the API.

## 22. Database API (RPCs)

Called with `supabase.rpc(name, args)`. All use `auth.uid()`. On a rule violation they raise `P0001` with a message key (e.g. `not_connected`, `username_taken`) that the app maps to plain-language text. Mutating RPCs are `security definer` and validate every rule themselves.

### 22.1 Profile and people
| RPC | Does |
|---|---|
| `username_available(p_username) → bool` | Format check + case-insensitive uniqueness. |
| `create_profile(p_username, p_display_name, p_avatar_url)` | First-time setup (the trigger creates the built-ins). |
| `update_profile(p_username, p_display_name, p_bio)` | |
| `search_people(p_query) → setof (id, username, display_name, avatar_url, relation)` | Username prefix match (≥ 2 chars), excludes me and people who blocked me. `relation` ∈ none · requested · incoming · connected · blocked_by_me. Limit 20. |
| `profile_page(p_user) → json` | `{profile, relation, bio?, counts?, notify?}`. Bio, counts and notify only when connected. |

### 22.2 Connections and blocks
| RPC | Does |
|---|---|
| `send_request(p_to) → text` | Fails if either side blocked. If a reverse request exists → connect and return `'connected'` (with list prompts and accept notification); else insert the request, notify, return `'requested'`. |
| `cancel_request(p_to)` | |
| `respond_request(p_from, p_accept bool)` | Accept → connection, delete request, notify `connect_accepted`, `list_prompts` for both. Decline → delete silently. |
| `remove_connection(p_other)` | Deletes the connection, both users' activity subscriptions to each other, and each other's custom-list memberships. |
| `block_user(p_other)` / `unblock_user(p_other)` | Per §5.3. |
| `set_activity_notifications(p_target, p_on bool)` | Connections only. |
| `pending_list_prompts() → setof profile` / `dismiss_list_prompt(p_other)` | Drives the E5 sheet. |
| `my_connections()` · `my_requests()` · `my_blocked()` | E3 and Blocked people. A silently declined request still shows to its sender as "You asked". |

### 22.3 Lists and wishlist
| RPC | Does |
|---|---|
| `create_list(p_name) → uuid` · `rename_list(p_id, p_name)` · `delete_list(p_id)` | Delete: visits left with no audience get **Only me**; the wishlist audience falls back the same way. Built-ins can't be renamed or deleted. Max 20 custom lists. |
| `set_list_members(p_id, p_members uuid[])` | Members must be current connections. |
| `add_to_lists(p_member, p_list_ids uuid[])` | E5 and E1 "Add to lists". |
| `set_wishlist_audience(p_list_ids uuid[])` | Same exclusivity rules as §8. |
| `set_wishlist(p_place_id, p_on bool)` | Idempotent. Adding a place I've visited does nothing (§9). |

### 22.4 Entries
| RPC | Does |
|---|---|
| `save_visit(p jsonb) → uuid` | Upsert by `p.id` (idempotent). Fields: id, place_id, visited_on, rating, loved, disliked, price_per_person, notes, audience (list ids), tag_user_ids, companion_name_ids, new_companion_names, accept_tag_id?. Validates all fields; replaces audience and companions; creates new tags (current connections only; anyone else is dropped silently and the visit still saves, §13; notifies `tag_request`); removes tags dropped from the list; if `accept_tag_id` is set, marks that tag accepted with this visit. **On insert only:** removes the place from my wishlist, and notifies opted-in subscribers who can see the visit (§12). |
| `delete_visit(p_id)` | |
| `respond_tag(p_tag_id, p_action) → uuid?` | `'same'` creates my visit copying the tagger's rating, dishes, price and notes (audience = my All connections), accepts the tag, returns the visit id. `'reject'` deletes the tag. ("Write my review" goes through `save_visit` with `accept_tag_id`.) |
| `untag_me(p_tag_id)` | Deletes the tag; my own visit stays. |
| `tag_detail(p_tag_id) → json` | E8, for the tagged person only: tagger, place and the tagger's rating, dishes, price, notes, date; status and my linked visit. |
| `my_tag_requests()` | My pending tags (tagger name, place, time). |
| `save_saved_entry(p jsonb) → uuid` | Upsert by id. Fields: id, kind, place_id, friend_name_id **or** new_friend_name {id, name}, source_url, rating, loved, disliked, price_per_person, visited_on. |
| `delete_saved_entry(p_id)` | |
| `rename_friend_name` · `merge_friend_names(p_from, p_into)` · `link_friend_name(p_id, p_user?)` · `delete_friend_name` | Merge moves entries then deletes `p_from`. Link only to a current connection. Delete only when unused. |
| `my_companion_names()` · `rename_companion_name(p_id, p_name)` · `delete_companion_name(p_id)` | F5. The list carries how many of my visits use each name. Rename has the same rules as friend names (trimmed, ≤ 40, no duplicates ignoring case). Delete removes the name from those visits; the visits stay. |

### 22.5 Reading
| RPC | Returns |
|---|---|
| `home_feed(p_filter, p_before, p_before_id, p_limit = 20)` | Rows `{entry_type: visit·friend·internet, id, created_at, place{place_id,name,area,category}, person{id,name,avatar}?, friend_name?, friend_user_id? (the linked account, owner-only), rating, loved, disliked, price_per_person, visited_on, companions[], is_mine, is_private}`. Union of my visits, visible connection visits and my saved entries. Filter ∈ all · connections · friends · internet · mine. Keyset pagination on (created_at, id) desc. |
| `place_page(p_place_id) → json` | `{place, on_wishlist, my_visits[], people_visits[] (connections' visible visits and my saved entries, newest first)}` |
| `user_visits(p_user, cursor…)` · `user_wishlist(p_user)` | Only what I may see. Wishlist rows carry `on_mine` and `i_went`. |
| `my_saved(p_kind?, cursor…)` · `my_wishlist()` | Profile tabs. |
| `entry_detail(p_type, p_id) → json` | C2, incl. companions, `tags[]` (accepted partners with ids; pending too for the author), `my_tag` (if I'm tagged) and (mine only) the audience summary. |
| `who_went(p_place_ids text[])` | Search results (B4): per place, ≤ 3 people I know who went, how many, whether I went, and every price I can see there (for the ₹ buckets). |
| `map_places(p_min_lat, p_min_lng, p_max_lat, p_max_lng, p_layers text[], p_price text, p_categories place_category[], p_person uuid?)` | `(place_id, name, area, category, lat, lng, layers text[], people json[≤3], is_mine)`, max 300 rows, most recent activity first. Layers: visited · wishlist · connections · friends · internet (null = all), built only from what I may see (`can_see_visit_social`, `can_see_wishlist`, my own saved entries). `p_price` uses the Search buckets `u200` · `200` · `500` · `1000`, matching if any in-scope entry there has a price in the bucket. `p_person` = a connection: their visible visits (as `visited`) and shared wishlist only, nothing of mine. |
| `notifications_page(cursor…)` · `mark_notifications_read()` | Rows `{id, type, created_at, read, actor{id,name,avatar,relation}, visit_id, place{id,name}, tag_id, tag_status}`, newest first, keyset paged. An actor who blocked me shows as "Someone" with no photo; blocking someone deletes the notifications between us. |
| `unread_notifications() → int` | The 🔔 dot. |
| `register_push_token(p_token)` · `unregister_push_token(p_token)` | Upsert / delete this device's Expo token (a token moves to whoever signs in on it). |
| `google_info_mode() → text` | `'tap'` or `'off'` (§25.5). Readable by everyone signed in; the app caches it for 1 h. |
| `consume_google_quota(p_sku text) → bool` | Service role only. Atomically adds 1 to this month's count **only if** it stays under the cap; returns false otherwise (§27.5). |

Companions returned by RPCs: accepted tag partners' names (or "Someone" if they blocked the viewer), plus, **for the author only**, pending tags ("pending") and private companion names.

## 23. Edge Functions

All live in `supabase/functions/`, TypeScript on Deno. Shared code sits in `_shared/` (CORS, JWT auth, zod schemas, Google and Gemini clients, rate limiter, error type, `hosts.ts`).

Every function verifies the JWT, except `push`, which checks the webhook secret. Every function returns `{ ok: true, data }` or `{ ok: false, error: { code, message } }`.

| Function | Input → Output | Notes |
|---|---|---|
| `places` | `{action:'autocomplete', input, sessionToken, lat?, lng?}` → `[{placeId, name, secondary}]`<br>`{action:'search', query, lat?, lng?}` → `[place]` (Search tab keyword search, Text Search Pro)<br>`{action:'details', placeId, sessionToken?}` → `{place}`<br>`{action:'google_info', placeId}` → `{rating, userRatingCount, priceLevel, openNow, hours}` or `{mode:'off'}`<br>`{action:'nearby', lat, lng}` → `[place]`<br>`{action:'refresh_stale'}` (cron, service role) | `details` always **upserts** the `places` row, so a place exists before any entry references it. `google_info` is the only call that requests rich fields, and only when a user taps (§25.5). **Every Google call first calls `consume_google_quota`; if it returns false, the function returns `{ok:false, error:{code:'quota_paused'}}` and never calls Google** (§27.5). Per-user limit: 300 calls/day. |
| `extract` | `{text, url?, lat?, lng?}` → `{foodRelated, items:[ExtractItem + candidates]}` | §24. 40 calls/user/day. Text capped at 4000 chars. |
| `links` | `{url, text?}` → `{kind, resolvedUrl, suggestion?, meta?:{title, description}}` | Follows redirects (GET, browser user agent, 5 s). `kind` ∈ maps · instagram · youtube · other. Maps → resolves to a place via text search. Other (including Zomato/District/Swiggy links) → page title and description for `extract`. Its text searches also go through `consume_google_quota`. Only public `http(s)` addresses: before each hop the hostname is resolved and refused if any address is private, loopback, link-local or shared (no probing internal services). |
| `push` | `pg_net` trigger on `notifications` INSERT (URL and `x-push-secret` read from Vault; missing → no push) → Expo Push API for each of the recipient's tokens | Builds the §12 text; deletes tokens Expo reports as `DeviceNotRegistered`. |
| `delete-account` | `{}` → `{}` | Deletes the auth user with the service role; FK cascades remove everything. |

## 24. AI extraction

### 24.1 Flow (`extract` function)
1. Check the rate limit; reject empty or oversized text.
2. Call Gemini `generateContent` with:
   - the system prompt (§24.3);
   - the user text and today's date (Asia/Kolkata);
   - `responseMimeType: application/json` and the response schema (§24.2).

   Temperature 0, minimal thinking. Hedged request: if the main model hasn't answered in 5 s, or answers 5xx/429, the fallback model is asked too and the first good answer wins; everything stops at 14 s (the app's D7 limit is 15 s).
3. Validate with zod. If the response is invalid, return `{foodRelated: false, items: []}`; the app then opens the manual form.
4. For each item, run a Places **Text Search** for `"<name> <area> <city>"` (through `consume_google_quota`; if paused, return the item with no candidates and the user picks the place by hand).
   - Location bias: the device location if it was given, otherwise Bengaluru with a 50 km radius.
   - Keep up to 3 results, upsert them into `places`, and attach them as `candidates` (the first is the best match).
5. Post-process:
   - dedupe dishes and drop any longer than 40 chars;
   - set the price to null if it falls outside 1–50,000;
   - drop a `visit_date` that is in the future.
6. Return the result. **The message text is never stored or logged.** Only counts and latency are logged.

### 24.2 Output schema
The response is `{ "food_related": boolean, "places": Item[] }`. Each `Item`:
```json
{
  "place":            { "name": "string", "area": "string|null", "city": "string|null" },
  "review":           "good | okayish | bad | null",
  "liked_dishes":     ["string"],
  "disliked_dishes":  ["string"],
  "price_per_person": "integer|null",
  "visit_date":       "YYYY-MM-DD|null",
  "confidence":       { "place": 0.0, "review": 0.0, "price_per_person": 0.0, "visit_date": 0.0 }
}
```
The function adds `candidates: [{placeId, name, address, lat, lng}]`. `confidence` exists only on the confirmation screen and is never saved.

The schema deliberately has no source person, companions, totals, party size, currency, cuisine, tags, evidence or veg info.

### 24.3 System prompt (first version; iterate with the eval set)
> You extract food-place experiences from casual Indian-English chat messages or post captions. Return JSON matching the schema.
>
> 1. Only include places that are named.
> 2. Never invent. If something isn't stated, use null or an empty list.
> 3. `review` is the overall feeling about the place: clear praise → good; mixed or "decent/ok" → okayish; clear complaint → bad; otherwise null.
> 4. Put a dish in liked or disliked only if the message says how it was. Dishes that are merely mentioned go nowhere. Keep dish names short, as written.
> 5. Price is per person in rupees:
>    - "~300 each" → 300
>    - "500 ish" → 500
>    - "1200 for 4" → 300, with low confidence
>    - a price with no indication of who it covers → per person, with low confidence
> 6. Resolve relative dates ("yesterday", "last Sunday") against today = {TODAY}. If no date is mentioned, use null.
> 7. Never extract who sent the message or who they went with.
> 8. If the text isn't about food places, return food_related=false and no places.
> 9. Confidence is 0–1 per field; below 0.6 means the user should check it.

### 24.4 Quality bar (`tools/extraction-eval`)
The eval set has 30+ realistic messages:
- single place and multi-place
- no price, and group totals
- slang, and Hindi/Telugu words written in English
- non-food messages

| Check | Pass bar |
|---|---|
| Place name correct | ≥ 90% |
| Invented dishes | 0 |
| Review correct | ≥ 80% |
| Price correct | ≥ 85% |
| Non-food messages rejected | 100% |

Run the eval after any prompt or model change, and record the results in `changelog.md`.

## 25. Google Places integration

### 25.1 Calls and field masks
| Use | API | Field mask |
|---|---|---|
| D1 / Search typing | Autocomplete (New); one session token per picker session; `regionCode: in`; location bias (device or Bengaluru) | (suggestions) |
| Selecting a place | Place Details (New) with the same session token | `id,displayName,location,shortFormattedAddress,addressComponents,primaryType,types,businessStatus` |
| "Google info" tap (C1, C1a) | Place Details | `rating,userRatingCount,priceLevel,regularOpeningHours,currentOpeningHours` (rich tier; counted as `details_rich`) |
| Search tab keyword search (on submit) | Text Search (New), `maxResultCount: 20`, location bias | same as AI candidates (never rich fields) |
| AI / link candidates | Text Search (New), `maxResultCount: 3` | `places.id,places.displayName,places.location,places.shortFormattedAddress,places.addressComponents,places.primaryType,places.types,places.businessStatus` |
| D1 Nearby | Nearby Search (New), `includedTypes: restaurant, cafe, bakery, bar, meal_takeaway`, ranked by distance, 10 results | same as Text Search |

### 25.2 Cost control
Every rule here serves the zero-cost guarantee (§27.5):
- Debounce autocomplete by 250 ms and use session tokens.
- Rich fields (rating, price level, hours) are requested **only** when a user taps "Google info", never automatically and never in search results or pin cards.
- The device caches each "Google info" result for 24 h.
- Per-user daily limits, plus the global monthly caps per SKU (§27.5).

### 25.3 Category mapping (`primaryType` → category)
| Google `primaryType` (or rule) | Category |
|---|---|
| cafe, coffee_shop | cafe |
| bakery | bakery |
| tea_house | tea_shop |
| fast_food_restaurant, hamburger_restaurant, pizza_restaurant, sandwich_shop | fast_food |
| dessert_shop, dessert_restaurant, ice_cream_shop, confectionery | dessert |
| bar, pub, wine_bar | bar |
| meal_delivery | delivery_only |
| restaurant, any other `*_restaurant`, food | restaurant |
| name contains "dhaba" | dhaba |
| name contains "chaat" or "street" | street_food (otherwise street food can't be detected) |
| anything non-food | null (the place is still allowed) |

### 25.4 Terms compliance
- The Place ID is kept indefinitely.
- Name, coordinates and address are cached for at most 30 days:
  - `details` refreshes a row on access if it is older than 30 days;
  - a weekly pg_cron job calls `places` `refresh_stale` for rows older than 25 days.
- "Google info" (rating, hours, price) is never stored on the server.
- "Google" attribution is shown wherever Google content appears.

### 25.5 Google info modes
| Mode | When | What users see |
|---|---|---|
| `tap` (default) | `details_rich` is under its monthly cap | A "Google info" row on C1, and a "Show Google's rating, hours and price" button on C1a. Tapping loads the details. |
| `off` | `details_rich` has reached its monthly cap | No Google rating, hours or price. The row reads "See rating and hours on Google Maps" and opens the free Maps link. Back to `tap` on the 1st of next month (UTC). |

If *basic* Places calls (autocomplete, details, search, nearby) reach their caps, place search pauses: D1 and Search show "Place search is resting until <date>. You can still pick places already in Thinnava." The app keeps working with places already in the database.

### 25.6 Practice mode (development only)
- When the `places` function has **no `GOOGLE_PLACES_KEY`** (local sandbox before the Google setup), it answers every action from a fixed list of about 30 real Bengaluru food places in `supabase/functions/_shared/practicePlaces.ts`, with the same response shapes. Their place IDs start with `practice:`.
- It never calls Google and never counts quota. Adding the key switches to real data without any app change.
- It can't run in production: `thinnava-prod` always has the key set, and the function refuses practice mode when `APP_ENV=prod`.

## 26. Frontend architecture

### 26.1 Layers
`screens (src/app)` → `feature hooks (features/*/hooks.ts)` → `api (features/*/api.ts)` → `lib/supabase.ts`.
- Screens never call Supabase directly.
- Components in `components/` are pure: props in, events out, no data fetching.

### 26.2 Routes (Expo Router)
```
src/app/
  _layout.tsx                 providers, fonts, splash, auth gate, share-intent listener
  index.tsx                   A1 splash / redirect
  welcome.tsx                 A2
  setup.tsx                   A3
  (tabs)/_layout.tsx          custom tab bar with the + speed dial
  (tabs)/index.tsx            B1 Home
  (tabs)/search.tsx           B4
  (tabs)/map.tsx              B2
  (tabs)/profile.tsx          B5
  place/[placeId].tsx         C1
  entry/[type]/[id].tsx       C2  (type = visit | saved)
  pick-place.tsx              D1  (returns the choice through a small zustand store)
  visit/new.tsx               D2  (?placeId, ?date, ?acceptTagId)
  visit/[id]/edit.tsx         D2
  saved/new.tsx               D5  (?source=friend|internet, ?placeId)
  saved/[id]/edit.tsx         D5
  import.tsx                  D7 → D8 share / copy import (fullScreenModal)
  people/[userId].tsx         E1 / E2
  connections.tsx             E3
  lists/index.tsx             E6
  lists/[id].tsx              E7
  tag/[tagId].tsx             E8
  notifications.tsx           F1
  settings/index.tsx · settings/profile.tsx · settings/friend-names.tsx · settings/companion-names.tsx
  settings/drafts.tsx · settings/blocked.tsx · settings/delete-account.tsx
  dev/gallery.tsx             dev-only component gallery
```
- Sheets (B1b, B2a, B2b, D3, D4, D6, E5) are `@gorhom/bottom-sheet` components, not routes.
- Dialogs (D10, E9, A7) use one shared `Dialog` component.

### 26.3 Auth gate
- **Routing:** `_layout.tsx` reads the Supabase session from MMKV.
  - No session → `/welcome`, a swipeable pager: A1b Intro, then A2 Welcome.
  - A session but no `profiles` row → `/setup`.
  - Otherwise → `(tabs)`.
- **Sign-in:** `GoogleSignin.signIn()` → `idToken` → `supabase.auth.signInWithIdToken({ provider: 'google', token })`.
- **Supabase Google provider settings:**
  - "Skip nonce check" on, because native Android sign-in doesn't send a nonce;
  - the Android OAuth client is in the authorized client IDs.
- **Sign out:** `GoogleSignin.signOut()`, then `supabase.auth.signOut()`, then clear the query cache, outbox, drafts and pending shares.

### 26.4 Data fetching
- **Query keys:** `['googleMode']`, `['feed', filter]`, `['place', placeId]`, `['placeGoogle', placeId]`, `['profile', userId]`, `['userVisits', userId]`, `['wishlist', userId]`, `['mySaved', kind]`, `['entry', type, id]`, `['map', bboxKey, filters]`, `['notifications']`, `['lists']`, `['connections']`, `['requests']`, `['friendNames']`, `['companionNames']`.
- **Feed:** `useInfiniteQuery` with the keyset cursor.
- **Stale times:** 30 s for the feed, 5 min for profiles and lists, 24 h for `placeGoogle`.
- **Refresh:** refetch on screen focus and app foreground. No realtime subscriptions in v1; pull to refresh plus push notifications are enough.
- **Offline reads:** the query cache is persisted to MMKV (max age 7 days), so screens open instantly and work offline.

### 26.5 Offline outbox
- **The queue:** `lib/outbox.ts` keeps a FIFO queue in MMKV. Each op is `{opId, kind, payload, createdAt, attempts, state: 'queued'|'failed', error?}`.
  - Kinds: `save_visit`, `delete_visit`, `save_saved_entry`, `delete_saved_entry`, `set_wishlist`, `add_friend_name`, `rename_friend_name`.
- **Each offline-capable mutation** (`runWrite(kind, args, label)`):
  1. generates its ids on the device (`expo-crypto.randomUUID`);
  2. if online with nothing queued, sends it straight away (rule errors show as usual); otherwise enqueues it (order matters) and tries to flush;
  3. when queued, updates the query cache optimistically (a new entry is put on Home, a deleted one taken off, the wishlist ♡ flips) and says "Saved · it'll sync when you're online".
  - The `label` ("Visit to CTR") is what F6 shows.
- **Flushing:**
  - Triggers: NetInfo coming online, the app coming to the foreground, app start, and after every enqueue. A trigger during a flush makes it take one more pass.
  - Ops are sent one at a time, in order.
  - A network error or 5xx stops the flush and retries later with backoff (2 s up to 5 min).
  - A 4xx or rule violation marks the op `failed` and shows it in F6 with its message. Later ops continue.
- **Place-less drafts** live in a separate MMKV store (`drafts`), never in the outbox. Offline, D1 lists places already on the phone (recently used and cached) and offers "Use '<typed>' for now", a stand-in place with a `draft:` id. A save with a stand-in place becomes a draft ("Saved as a draft · pick the place in Offline drafts"), never synced or shown. Once the user picks a place in F6, the draft becomes a normal outbox op.
- **Pending shares** (made while offline or signed out) are kept in `pendingShares`. They're processed on the next online open, with a Home banner: "1 message waiting · Review". (Copied text taken while offline is stored the same way: `/import` opened offline keeps the text and says "Saved. We'll read it when you're online.")
- **UI:** NetInfo drives the F8 banner (every TopBar, plus Search and Map). The F6 count is outbox failures + drafts + pending shares, shown as a badge on the F2 row. Social actions, search and settings offline say "You're offline. Try again when you're connected."
- **Sign-out** clears the query cache, outbox, drafts and pending shares; if anything is unsynced, the sign-out dialog says "N changes haven't synced yet and will be lost" first.

### 26.6 Share intent and copied text
- WhatsApp doesn't offer messages to the share sheet, so those arrive through the clipboard: the Home card "You copied a message · Read it" (below) or the chip "Use copied text?" (§10.4, D5). Both call the same `/import` screen with `{text}`. `expo-clipboard` reads the clipboard only when the chip is tapped (`hasStringAsync` decides whether to show the chip).
- The `expo-share-intent` plugin is set up for `text/*` (`ACTION_SEND`) and single items, for the apps that do allow sharing.
- The root layout listens with `useShareIntentContext()`. On a new share:
  - **Signed out:** save it to `pendingShares` and continue after onboarding.
  - **Offline:** save it to `pendingShares` and show "Saved. We'll read it when you're online".
  - **Otherwise:** detect a URL in the text, navigate to `/import` with `{text, url}`, then reset the intent.
- **Copied text** (`features/import/clipboard.ts`):
  - When the app becomes active, call `Clipboard.hasStringAsync()`. This doesn't read the text, so Android shows no notice.
  - If it returns true and there was no Read it / ✕ in the last 6 hours (time stored in MMKV), show the Home card.
  - While the app is open, `addClipboardListener` re-shows the card when the clipboard changes.
  - **Read it** calls `Clipboard.getStringAsync()` and navigates to `/import` with `{text, url}`, the same as a share.
- `/import`: if a URL is present, call `links` first and branch on `kind` (§10.1); otherwise call `extract`. The motion follows the share-import sequence in §16.7.

### 26.7 Map
- `platform/map/MapView.tsx` wraps `react-native-maps` with `provider={PROVIDER_GOOGLE}` and `customMapStyle` from `theme/mapStyle.ts` (built from the colour tokens; JSON styling only, never a Map ID). It exports `mapsReady`, true only when the build had `GOOGLE_MAPS_ANDROID_KEY` (`extra.mapsReady`).
- When the region changes (debounced 500 ms):
  1. call the `map_places` RPC for the visible area;
  2. cluster the results with `supercluster` in JS;
  3. render the clusters and custom marker views, with `tracksViewChanges={false}` after the first render.
- The pin card and the place list are bottom sheets.
- Location comes from `expo-location`, foreground only, after the A7 explainer.

### 26.8 Hand-offs
`features/handoff/urls.ts` builds the Directions and Swiggy URLs per §11.1 and opens them with `Linking.openURL`. Both are plain links: free, no API.

### 26.9 Push
- On first need (right after the user first sends a request or tags someone), show the A7 notifications explainer once per install ("Know when Anand says yes?"); on "Turn on" request permission, get a token with `Notifications.getExpoPushTokenAsync({ projectId })`, and upsert it with `register_push_token`. "Not now" is respected.
- Sign-out unregisters this device's token.
- `projectId` comes from `EAS_PROJECT_ID` (free Expo account); FCM config is `app/google-services.json` from the Firebase project `thinnava-f44c7` (Spark plan, no billing; git-ignored).
- Refresh the token on every app start.
- A push carries `data.route` (e.g. `/tag/<id>`); tapping it opens that route.
- Android channel: "default", high importance.

### 26.10 Theme and motion
- **Tokens:** `theme/tokens.ts` exports the §16.1 roles, plus radii, spacing and shadows. Shadows use Android `elevation` and `shadowColor` to approximate DESIGN.md. Components use tokens only, never raw hex.
- **Motion:** `theme/motion.ts` exports the curves (`Easing.bezier`) and durations. Every animation checks `useReducedMotion()` and switches to a ≤150 ms fade.
- **Card → place title glide:**
  1. measure the card title (`measureInWindow`);
  2. render an absolutely positioned `Animated.Text` overlay in a root portal;
  3. animate it to the destination title position;
  4. reveal the real title.

  The place route itself uses a plain fade.

### 26.11 Errors and loading
- First loads show skeleton cards, not spinners. A failed load shows an inline retry row.
- Mutations show a snackbar on success where useful ("Saved", "Added to your wishlist · Undo") and plain-language text on failure.
- Each route has an error boundary: "Something went wrong · Try again".

## 27. Configuration and accounts

### 27.1 Identifiers
- Android package: **`com.thinnava.app`**. It's fixed once testers install the app; the display name can still change later.
- Display name: **Thinnava**

### 27.2 Accounts to create (M0)
| Service | Plan / card | Setup |
|---|---|---|
| Google Cloud project **`thinnava-free`** | **No billing account, ever** | OAuth consent screen (External, basic scopes, published, with the §27.4 links). OAuth clients: **Web** (for Supabase) and one **Android** client per SHA-1 (P1's laptop, P2's laptop, EAS). Firebase (Spark plan) for push: Android app `com.thinnava.app` → `google-services.json`; upload the FCM v1 service account to EAS. **Gemini API key** created in Google AI Studio *on this project*. |
| Google Cloud project **`thinnava-maps`** | **Pay-as-you-go billing account** (owner's decision, 2026-10-14): created through the free trial and **upgraded immediately**, keeping the $300 trial credit for its 90 days. No subscription or fee; only usage beyond Google's free monthly amounts is billed, and our caps stop at 80% of them | Enable Places API (New) and Maps SDK for Android, nothing else. Keys: a **Maps Android key** restricted to `com.thinnava.app` + all SHA-1s and to Maps SDK for Android only; a **Places server key** restricted to Places API (New) only. Zero-cost locks 2–4 from §27.5. |
| GitHub | Free | Private repo `thinnava` (both owners). The legal pages live on the owner's own GitHub Pages site (§27.4). Branch protection on `main` (§33). |
| Supabase | **Free plan, no payment method** | **Development: a local sandbox on each laptop** (Supabase CLI in Docker, `npm run backend`, see `docs/dev-setup.md`), so migrations never collide and no free hosted slot is used. **Hosted (ap-south-1 Mumbai): only `thinnava-prod`**, in the owner's organisation (both owners as members), created before the first APK for other people (§33.4). **Google provider:** Web client ID + secret; "Skip nonce check" on; every Android client ID in the authorized client IDs. |
| Expo / EAS | **Free plan, no payment method** | One Expo organisation with both owners; project linked to the repo. Android keystore managed by EAS; add its SHA-1 to `thinnava-free` (OAuth) and `thinnava-maps` (Maps key). |

### 27.3 Environment variables
**App** (`app/.env`; `EXPO_PUBLIC_*` values are bundled into the APK):

| Variable | Notes |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | |
| `EXPO_PUBLIC_SUPABASE_KEY` | Publishable key |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | |
| `GOOGLE_MAPS_ANDROID_KEY` | Build time only, injected by `app.config.ts` |
| `APP_ENV` | `dev` or `prod` |

**Edge Function secrets:** `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, `GOOGLE_PLACES_KEY`, `PUSH_WEBHOOK_SECRET`, and optionally `EXPO_ACCESS_TOKEN`.

`.env*` files, `google-services.json` and keystores are git-ignored. `.env.example` lists every variable. Each person's `.env` points at their own dev project; real values are shared privately (never in git or chat logs that are public).

### 27.4 Privacy policy and terms
- Two short, plain-English pages, written in `docs/legal/privacy.md` and `terms.md` (this repo stays private) and published on the owner's own website (GitHub Pages, free) at **https://ckarthikeshwar.github.io/projects/thinnava/privacy** and **/projects/thinnava/terms** (Astro pages rendering a copy of the same Markdown). The URLs go into the OAuth consent screen, the A2 welcome line and Settings → About & privacy (`lib/links.ts`). The same text is also shown in the app (`tools/legal/sync.mjs`). After editing the text, copy both files to the website's `src/legal/thinnava/` too.
- The privacy policy covers:
  - what we collect: Google name, email and photo, plus the entries, connections and lists you create;
  - who sees what (§5);
  - copied or shared messages are sent to Google Gemini to be read and are **not stored** by Thinnava (internet links are stored);
  - place data comes from Google Maps;
  - no ads, no selling, no tracking or analytics;
  - deleting your account deletes everything (F7);
  - a contact email.
- Terms: a course project offered as-is, be respectful, don't log anything illegal; we may remove accounts that abuse the app.
- Drafted in M0, because the OAuth consent screen needs the links.

### 27.5 Zero-cost guarantee (hard rule)
**The owners must never be charged on any card.** Every service is set up so that reaching a limit **pauses a feature instead of billing**. Nobody upgrades any plan without changing this section first.

| Service | Card on file? | Why it can't charge |
|---|---|---|
| Supabase | No | Free plan with no payment method. Going over a limit restricts the project; it doesn't bill. |
| Expo EAS | No | Free plan. Builds just queue longer. |
| GitHub, GitHub Pages | No | Free. |
| Cloudflare Pages (web version, §18.3) | No | Free plan with no payment method; static files only, no Workers or paid add-ons. Over a limit, builds or requests stop; nothing bills. |
| Firebase Cloud Messaging (push) | No | Lives on `thinnava-free`, which has no billing account. FCM is free. |
| Gemini | No | The key belongs to `thinnava-free`, which has no billing account, so only the free tier exists. Over the limit, Google answers "rate limited" and the app opens the manual form. **Never attach billing to `thinnava-free`.** |
| Directions and Swiggy links | No | Plain links, no API. |
| Maps SDK for Android (map display) | Billing account on `thinnava-maps` | Displaying maps in the Android SDK is free and unlimited, as far as we know. **Verify on Google's pricing page in M0.** If it isn't free, it gets a cap like Places, and the map shows "Map is resting" when the cap is reached. |
| Places API (New) | Billing account on `thinnava-maps` | The four locks below. |

**The four locks for `thinnava-maps`** (all four are in place before the first real API call):
1. **Our hard cap (primary).**
   - Only the `places`, `extract` and `links` functions call Places, using a secret server key restricted to Places API (New).
   - Before **every** call they run `consume_google_quota(sku)`, which atomically counts the call for the month (UTC) and **refuses** once the SKU reaches its cap in `usage_caps`.
   - Caps are **80% of each SKU's free monthly amount**, checked on Google's official pricing page on 2026-10-14:

     | SKU | Free | Cap |
     |---|---|---|
     | Autocomplete Requests | 10,000 | 8,000 |
     | Place Details Pro (`details`) | 5,000 | 4,000 |
     | Place Details Enterprise (`details_rich`) | 1,000 | 800 |
     | Text Search Pro | 5,000 | 4,000 |
     | Nearby Search Pro | 5,000 | 4,000 |

     Maps SDK for Android is free and unlimited **as long as no Map ID is used**, so we style the map with JSON only.
   - When a cap is reached, the feature pauses (§25.5) until the 1st of next month.
2. **Google-side quota limits (backstop).** Places API (New) only offers per-minute limits. Lowering them slows a runaway bug or a leaked key, but can't cap a whole month.
3. **Automatic billing shut-off (backstop, built before the first key is used).**
   - A budget on `thinnava-maps` counts **gross cost, before credits**, so any usage beyond the free amounts shows up even while trial credit would cover it.
   - The budget publishes to a Pub/Sub topic. A small Cloud Run function (`infra/billing-killswitch/`) **detaches billing from the project** once gross cost passes **₹50**. That stops every paid API at once, and billing has to be re-linked by hand.
   - The budget also emails alerts at ₹50 and ₹100.
   - Cloud Run, Pub/Sub, Cloud Build and Artifact Registry all stay inside their own free tiers at this scale.
4. **Trial credit cushion.** For the first 90 days the leftover $300 trial credit absorbs any charge before it reaches the card.


What would have to go wrong for a real charge: lock 1 fails (a bug, or a leaked server key bypasses it) **and** the shut-off doesn't fire in time (Google's budget data can lag by hours) **and**, in the first 90 days, the $300 credit is used up. Each lock is tested in M0, by temporarily setting a cap to 1 and checking that the feature pauses.

## 28. Testing

| Layer | How | When |
|---|---|---|
| Privacy / RLS | pgTAP tests (§21.3), run with `supabase test db` (local Docker) or pasted into the dev SQL editor | Every migration that touches tables, RLS or RPCs |
| RPC logic | pgTAP for save_visit, respond_tag, delete_list fallback, merge_friend_names, block | Same |
| Pure TS | Jest: URL detection, the hand-off URL builder, price parsing and formatting, outbox ordering and retry, date helpers, zod schemas | Every change to `lib/` or the schemas |
| Components | @testing-library/react-native: ReviewPill, ChipInput, audience picker exclusivity, D8 Save enabling | When the component changes |
| AI | `tools/extraction-eval` pass bar (§24.4) | Prompt or model changes |
| Device | Manual checklist per milestone on a real Android phone (Android 10+), plus the demo script (§31) before each APK | Each milestone and release |

## 29. Build and release

- **Dev:** `npx expo run:android` (a dev build on a USB phone or emulator), or an EAS `development` APK used with Metro.
- **Release:**
  - Build with `eas build -p android --profile preview`, which produces an APK with an internal distribution link.
  - `eas.json` profiles: `development` (developmentClient, apk) and `preview` (apk, `APP_ENV=prod`).
  - Version `0.MINOR.PATCH`; EAS auto-increments `versionCode`.
- **Backend:**
  - Each person applies migrations to **their own** local sandbox while working (`npm run backend:reset`). Only code merged into `main` is ever pushed to `thinnava-prod` (§33.4).
  - Deploy functions with `supabase functions deploy <name>`.
- **Before any APK goes to users:**
  - pgTAP and Jest pass;
  - the demo script passes on a phone;
  - `changelog.md` has the release entry.
- Supabase free projects pause after 7 days without activity, so open the prod app at least weekly before the demo.

## 30. Implementation plan

Two people build in parallel on two laptops (how: §33).
- **P1** owns places, entries, AI, map and offline.
- **P2** owns auth, social, tags and notifications.

The milestones below describe *what* gets built; §33.2 shows who builds what, in which order, side by side. Steps marked ∥ can run in parallel.

### M0 · Foundations (no accounts needed)
Each account is created only when a milestone needs it, so the account-dependent spikes moved to the start of those milestones (decided 2026-10-13).
1. `git init`, `.gitignore`, the repo layout (§19). Add a `changelog.md` entry with the exact Expo SDK and library versions.
2. Create the Expo app in `app/`: TypeScript, Expo Router (`src/app`), the §18.1 dependencies, `app.config.ts` (package id, scheme, plugins), and `.env.example`.
3. `supabase/` folder (`supabase init`). The local Supabase stack runs in Docker for development; hosted projects come later.
4. Draft the privacy policy and terms (§27.4) in `docs/legal/`. They get published before M2.
5. **Spike: share target.** Install a dev build on the phone; share a URL into the app and show it. (Done 2026-10-13. WhatsApp text can't be shared, which led to the copy path in §10.0; reading the clipboard is checked in M5.)

**Done when:** the dev build runs on the phone and shows shared links. ✅ Done 2026-10-13.

**Account-dependent spikes, now at the start of each milestone:**
- **M2:** Google Cloud `thinnava-free` (OAuth) and publish the legal pages → **sign-in spike** (Google sign-in → Supabase session).
- **M3:** Google Cloud `thinnava-maps`, set up and test all four zero-cost locks (§27.5), record each SKU's free allowance and the Maps SDK pricing → **Places spike**.
- **M5:** Gemini key (on `thinnava-free`) → **Gemini spike** (first prompt + 10 messages in `tools/extraction-eval`).
- **M7 or the first APK:** Expo account, Firebase. **Hosted Supabase** before the first APK for other people.

### M1 · App shell and design system
1. `theme/` tokens, type and motion; fonts load behind the splash.
2. Every §16.5 component, matching `design/phase1.html` and `phase2.html`, shown in the dev-only `/dev/gallery` route.
3. App icon and splash (§16.8).
4. Tab layout with the custom nav bar, the + speed dial (with motion), the Rings ground for tab screens, TopBar, and an OfflineBanner placeholder.

**Done when:** the gallery matches the mockups side by side on a phone, tabs and the speed dial animate per §16.7, and Remove animations works.

### M2 · Auth and profile (P2, in parallel with M3)
1. Migration: profiles, profile_details, audience lists and the built-ins trigger, with RLS.
2. Screens: A1 splash/gate, A1b intro, A2 welcome, A3 setup with the live username check, F3 edit profile, sign out.
3. The `delete-account` function and F7.

**Done when:** a new Google account goes Welcome → Setup → Home, the username rules are enforced, delete account removes the user, and the profile RLS tests pass.

### M3 · Places and the place page (P1)
1. Migration: places, monthly_usage, usage_caps, `consume_google_quota`, `google_info_mode`. The `places` function (autocomplete, details, google_info, nearby, text search) with quota checks and per-user limits.
2. D1 place picker: search, nearby (with the A7 location explainer), recent.
3. C1 place page, starting with the Google-only (C1a) and closed (C1b) states. Google info row (tap / off modes). Hand-off buttons: Directions and Swiggy search.
4. B4 Search → Places, without the "who's been" filters yet.

**Done when:** searching a real Bengaluru place (by name and by a food word) opens its page; tapping Google info shows rating and hours; with the cap set to 1 the page switches to "off" mode; Directions opens Maps; Swiggy opens a Swiggy search.

### M4 · My visits, wishlist and Home (P1 + P2)
1. Migrations and RPCs:
   - tables: visits, visit_audience, companion names, wishlist tables;
   - helper functions and RLS;
   - `save_visit` (no tags yet), `delete_visit`, `set_wishlist`, `home_feed` (mine), `place_page`, `entry_detail`.
2. D2 add/edit visit, with D4 offering only the built-ins and D3 only private names. D10 delete.
3. B1 Home: cards, empty state, filter sheet (All and Mine for now). C2 entry detail. The card → place motion.
4. Wishlist ♡ on C1. Profile B5 with Visited and Wishlist tabs. Wishlist auto-removal when a visit is saved.

**Done when:** a visit takes under 30 s to add and appears on Home, Profile and the place page; edit and delete work; the wishlist adds and auto-removes.

### M5 · Friend and internet entries + share import (P1)
1. Migration: friend_names and saved_entries, with their RPCs.
2. D5 manual form, D6 friend-name picker, F4 friend names (rename, merge, delete; linking comes in M6).
3. The `extract` and `links` functions with the full prompt. Grow the eval set to 30 messages and meet the pass bar.
4. Share intent **and the copied-message card** (§10.0, §26.6) → `/import`:
   - D7 reading, then D8 confirmation (multi-place, flags, D8b candidates);
   - on failure, D5 prefilled;
   - the "Use copied text?" chip.
5. Home filters From friends and Internet; the Profile Saved tab.

**Done when:**
- demo criterion 1 passes (copy a WhatsApp message → Read it on Home, or + → A friend told me → Use copied text → a Rahul entry on Home and on the place page, in under 20 s);
- the eval pass bar is met.

### M6 · Connections, lists and audience (P2)
1. Backend:
   - migration for requests, connections, blocks, list members, list_prompts and activity_subscriptions, with their RPCs;
   - the full `can_see_visit`;
   - the pgTAP privacy tests (§21.3).
2. People screens: B4 Search → People, E2 not-connected profile, E3 connections/requests, E1 connection profile (visits, wishlist, map link).
3. Lists and privacy screens:
   - E5 add-to-lists sheet, E6/E7 lists, D4 with custom lists;
   - the wishlist audience setting;
   - E9 remove/block and the blocked list.
4. Social views: the Home Connections filter, "People who've been" on the place page, the Search "who's been" filters, and linking a friend name to a connection (F4).

**Done when:** demo criteria 2 and 4 pass on two phones and all privacy tests pass.

### M7 · Tags and notifications (P2)
1. Tags in `save_visit`, plus `respond_tag` and `untag_me`. D3 with connections, E8 tag request, "with …" everywhere, and the pgTAP tag scenario.
2. The notifications table and inserts, the F1 screen, the 🔔 activity toggle, and the unread dot.
3. Push: tokens, the `push` function with the DB webhook, the A7 notifications explainer, and deep links from pushes.

**Done when:** demo criterion 3 passes with three accounts, and pushes arrive for requests, accepts, tags and opted-in activity.

### M8 · Map (P1)
1. The `map_places` RPC.
2. B2 map: style, clusters, pins, my location, the list sheet, the B2b pin card and B2a filters.
3. My map and a connection's map, both as filtered views of B2.

**Done when:** journey C ("where should we eat tonight?") works smoothly with ~200 pins.

### M9 · Offline, polish and release (both)
1. Offline: outbox, drafts, pending shares, F6, the F8 banner, and offline place picking. Test it in airplane mode.
2. Settings screens complete (F2, F5, About & privacy). About & privacy must include the Gemini disclosure: "Copied or shared messages are sent to Google's Gemini to read them and are not stored by Thinnava".
3. Passes:
   - motion against `design/motion.html` (the share-import sequence, the cat climb);
   - accessibility (§16.9);
   - copy (§15).
4. Release prep: demo seed data on prod (team accounts, Bengaluru places, listing links), the prod backend deploy, and the preview APK.

**Done when:** everything in §31 passes on the release APK on two different phones, and `changelog.md` has the 0.1.0 release entry.

### M10 · Web version (owner decision 2026-10-17; see §18.3)
1. Spec and changelog.
2. Make it build for web: `react-native-web`, web stand-ins for the Android-only modules (sign-in, map, share intent, push, notification settings, offline outbox).
3. Web sign-in (OAuth redirect), local sandbox first.
4. Copy flow on web: "Paste a message" on Home and D5.
5. Edge Functions: CORS for the site's origins.
6. Web layout per §18.3 and `design/web.html`: top bar, laptop Home / Search / Map / Profile, phone-browser paste-first Home and Add to Home Screen card, signed-out front page, keyboard shortcuts, centred column for other screens.
7. Test in Chrome on the laptop at phone width (≈ 400 px) and laptop width (≈ 1366 px): the demo script (§31) as far as web allows.
8. Release: production backend (shared with the APK, M9), then deploy the static site and add its address to Google OAuth and Supabase.

**Done when:** on a laptop browser and an iPhone browser, a new user signs in with Google, logs a visit, pastes a WhatsApp message into a friend entry, connects with an Android user and sees each other's visits, and the laptop and phone-browser layouts match `design/web.html`.

## 31. Demo script and success criteria

1. **Message to entry:** copy a WhatsApp message → open Thinnava → Read it (or + → A friend told me → Use copied text) → confirm → add the friend's name → the entry appears on Home and on the place page. Also share an Instagram link → it becomes an internet entry.
2. **Connections:** send a request → accept it → add them to a list → open their profile and map → tap a place → see their review.
3. **Collab tag:** A tags B → B taps "Same as A's" → C, who is connected only to B, sees "B went with A" but none of A's content.
4. **Audience:** a visit shared with "Close friends" is invisible to a connection outside that list.
5. **Fallback:** search a place nobody has visited → its page shows basic info, and tapping shows Google's rating and hours.
6. **Act:** from a place page, open Google Maps directions and a Swiggy search in one tap each.
7. **Offline:** in airplane mode, log a visit → it appears immediately → turn data on → it syncs and a connection can see it.

## 32. Risks and open items

| Item | Status / mitigation |
|---|---|
| Zomato and District buttons wanted | v2 (§11.3). |
| Swiggy search URL changes | It's one constant in `handoff/urls.ts`. Re-test it before each release. |
| The Gemini free tier may use prompts for training | Accepted for the course demo and disclosed in the privacy policy. The paid tier is **not** an option (§27.5). |
| Any charge on a card | Not allowed. The zero-cost guarantee (§27.5): no card anywhere except the `thinnava-maps` free trial, which has four locks. |
| Card charged on the paid account | Very unlikely: 80% caps (lock 1), the billing shut-off at ₹50 gross (lock 3), and the trial credit for the first 90 days (lock 4). |
| Free limits too small for the demo | Features pause rather than bill. Reduce use (fewer test searches), or wait for the monthly reset. |
| expo-share-intent / map library vs the chosen Expo SDK | Checked in the M0 spikes before anything else is built. |
| Supabase free projects pause | Open the prod app at least weekly; no paid plan needed for the course. |
| App name, final logo | Open (branding comes later). The interim chef-cat icon is in §16.8. |

## 33. Team workflow: two people, two laptops, at the same time

**Who's who:** P1 and P2 aren't assigned yet; the owners will decide. **Claude writes most of the code.** Each owner runs Claude Code on their own laptop for their half, then reviews it and tests it on their phone. There's no fixed deadline.

Two people can work in parallel safely. Git keeps each person's work separate until it is merged, and conflicts can only happen in files both people change. This section makes those files rare and gives each one a rule.

### 33.1 The five rules
1. **Everything goes through git** (GitHub, private repo). Nobody copies files between laptops by hand.
2. **Each person works on their own branch.** `main` is always working, and work reaches it only through a pull request (PR).
3. **Each person owns folders and tables** (§33.3). You change only what you own. To change a shared file, make a small PR and tell the other person first.
4. **Each person has their own dev database** (§33.4). Migrations never collide while you work, and `thinnava-prod` changes only from `main`.
5. **The RPC signatures in §22 are the contract** between the two halves. If you need something the other person hasn't built yet, code against the agreed signature using a stub (§33.6).

### 33.2 Who builds what, side by side
| Phase | P1 (places · entries · AI · map · offline) | P2 (auth · social · tags · notifications) | Merge point |
|---|---|---|---|
| **0 · Setup (M0)** | Create the repo and the Expo app skeleton (`app.config.ts`, `eas.json`, folders). Spikes: share target, Gemini, Places. | Create the accounts (Google Cloud, Supabase, Firebase, Expo). Register both laptops' SHA-1s. Spike: sign-in. `supabase/` folder skeleton. | Both laptops clone the repo, run a dev build, and sign in. |
| **1 · Design system (M1)** | **Day 1, first:** `theme/` tokens, type and motion, merged before anything else. Then: ReviewPill, EntryCard, TextField, ChipInput, Avatar, SourceMark, EmptyState + CatPeek, MapPin + Cluster. | (After the tokens merge.) Button, Chip, TopBar, NavBar + SpeedDial, tab layout, Rings ground, BottomSheet, Dialog, Snackbar, SegmentedControl, OfflineBanner. | `/_gallery` checked against the mockups on both phones. |
| **2** | M3 places + place page | M2 auth + profile + built-in lists. **Merge the profiles/lists migration first**, because P1's visits need it. | **I1:** a new account signs up and opens a real place page. |
| **3** | M4 visits, wishlist, Home (mine), entry detail | M6 backend first (requests, connections, blocks, lists, `can_see_visit`, privacy tests), then the people screens | **I2:** two phones connect, and each sees the other's visit, respecting lists. |
| **4** | M5 friend/internet entries, share import, AI, listing links | Rest of M6 (lists UI, block, profile tabs), then M7 tags (extends `save_visit`, after M4 is merged) | **I3:** demo criteria 1–4 pass on phones. |
| **5** | M8 map, then M9 offline | M7 notifications + push; settings screens (F2–F7) | **I4:** demo criteria 5–7. |
| **6 · Release (M9)** | Together: motion, accessibility and copy passes, demo seed, prod deploy, APK | | Release 0.1.0 |

**Dependencies to respect:**
- P1's visits need P2's lists tables, so P2 merges that migration in phase 2 first.
- P2's tags change `save_visit`, so P2 starts after P1's M4 is merged.
- P2 extends `home_feed` and `place_page` with connection visits after P1 has created them.

### 33.3 Ownership map
| | P1 owns | P2 owns |
|---|---|---|
| **Features** (`app/src/features/`) | places, visits, saved, wishlist, feed, import, handoff, map, offline | auth, social, lists, tags, notifications, settings |
| **Routes** (`app/src/app/`) | `(tabs)/index`, `(tabs)/search`, `(tabs)/map`, `place/`, `entry/`, `pick-place`, `visit/`, `saved/`, `import` | `intro`, `welcome`, `setup`, `(tabs)/profile`, `people/`, `connections`, `lists/`, `tag/`, `notifications`, `settings/` |
| **lib** | `outbox.ts`, `net.ts`, `format.ts`, `dates.ts` | (none) |
| **Tables** | places, monthly_usage, usage_caps, visits, visit_audience, companion_names, visit_companion_names, friend_names, saved_entries, wishlist_items, usage_counters | profiles, profile_details, connection_requests, connections, blocks, audience_lists, list_members, list_prompts, wishlist_audience, activity_subscriptions, tags, notifications, push_tokens |
| **SQL functions** | `save_visit`, `home_feed`, `place_page`, `entry_detail`, `map_places`, saved-entry and wishlist RPCs | helper functions (`is_connected`, `in_audience`, `can_see_visit`, `can_see_wishlist`), profile, connection, list, tag and notification RPCs |
| **Edge Functions** | `places`, `extract`, `links` | `push`, `delete-account` |
| **Other** | `tools/extraction-eval` | `supabase/tests` (privacy) |

**Search** is split: P1 owns the screen and the Places segment. P2 builds the People segment as a component (`features/social/components/PeopleSearch.tsx`) that the screen imports.

**Shared files.** Change these only in a small, separate PR, after telling the other person:
- `components/`, `theme/`
- `app/_layout.tsx`, `(tabs)/_layout.tsx`
- `lib/supabase.ts`, `lib/queryClient.ts`, `lib/storage.ts`
- `app.config.ts`, `eas.json`, `package.json` + lockfile
- `types/db.ts`, `supabase/functions/_shared/`, `supabase/seed.sql`
- `spec.md`, `changelog.md`

**Changing a SQL function you don't own** (for example P2 adding tags to `save_visit`) is allowed. Do it in a new migration with `create or replace`, and the owner reviews the PR.

### 33.4 Database: no collisions
- **Separate dev databases.** Each person runs their **own local Supabase sandbox** in Docker (`npm run backend`) and points `app/.env` at it (`http://127.0.0.1:54321`, reached from the phone over USB). You can reset or experiment freely without breaking the other person, and no hosted project slot is used.
- **Creating migrations.** Only use `supabase migration new <name>`. The timestamped file names mean two people never create the same file.
- **Never edit a migration that's already on `main`.** Fix it with a new migration.
- **Before opening a PR:**
  1. Pull `main`.
  2. If `main` has a migration newer than yours, give yours a fresh timestamp (re-create it with `supabase migration new` and move the SQL in), so the order on `main` stays correct.
  3. Run `npm run backend:reset` on **your own** local sandbox. This replays every migration from scratch plus the seed, proving the whole history applies cleanly.
  4. Run the pgTAP tests.
- **Generated types (`types/db.ts`).** Never merge them by hand. After pulling, regenerate them from your freshly reset dev project.
- **Prod (`thinnava-prod`).** Only one person, the **release keeper** (P2 by default), runs `supabase db push` and `supabase functions deploy`, and only from an up-to-date `main` at a merge point.
- **Edge Function secrets.** Each person keeps the same secret names in their local `supabase/.env` (git-ignored). The release keeper sets them on prod.

### 33.5 Git workflow
- **Branches:** `p1/<milestone>-<topic>` and `p2/<milestone>-<topic>`, for example `p1/m3-places` or `p2/m2-auth`.
- **Commits:** commit on your branch when a meaningful chunk works, not after every small edit. PRs are **squash-merged**, so `main` gets one substantial commit per piece of work, in line with the minimal-commits rule. Commit messages never mention Claude.
- **Stay close to `main`.** Pull `main` into your branch at least once a day (`git pull --rebase origin main`). Merge a branch within 2–3 days; long-lived branches are what cause painful conflicts.
- **Pull requests:** the other person skims them, and **must** run the app for PRs that touch shared files or SQL functions they own. Merge only when the app builds and starts.
- **`main` protection:** no direct pushes and no force-pushes. Merging requires a PR.
- **Dependencies:**
  - One package manager: **npm**, with `package-lock.json` committed.
  - Add packages with `npx expo install <pkg>`, in a small PR.
  - On a lockfile conflict, take `main`'s lockfile and run `npm install` again.
- **Native changes** (a new native library, or edits to `app.config.ts`) mean both people must rebuild their dev build. Mark such PRs with `[native]` in the title.
- **Line endings:** commit a `.gitattributes` with `* text=auto eol=lf` so Windows line endings don't make every file look changed.
- **`changelog.md` conflicts** happen when both people add an entry at the top. Keep both entries, newest first.

### 33.6 Working before the other half exists
- **SQL:** if you need an RPC the other person hasn't written yet, add a stub migration with the agreed §22 signature that returns an empty result (for example `user_visits` returning nothing). The owner later replaces it with `create or replace`.
- **App:** code against the hook's TypeScript type in `features/*/api.ts`. A temporary mock implementation is allowed, but must be removed before the matching merge point (§33.2).
- **Built in stages:** `home_feed` and `place_page` first return only the user's own entries (P1, M4). P2 adds connection visits in M6. The app code doesn't change, because the response shape is fixed in §22.5.

### 33.7 Devices, accounts and secrets
- Each laptop has its own Android debug keystore. **Both SHA-1s must be registered** in Google Cloud (Android OAuth client and Maps key), or sign-in and maps fail on one laptop's builds. Get them with `keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android`.
- Each person tests on their own phone with their own Google account. For social features (which need 2–3 accounts), use a second Google account on an emulator or a spare phone.
- Secrets (`.env` values, `google-services.json`) are shared privately between the two owners, never committed. `.env.example` lists every variable name.
- Both owners are members of the Expo organisation, the Supabase prod project, the Google Cloud project and the Firebase project.

### 33.8 Using Claude Code on both laptops
- Each Claude Code session reads `CLAUDE.md` and `spec.md` from the repo. **The repo is the shared memory**; Claude's own memory is per laptop and is not shared.
- Start each session by telling Claude who you are and the current step, for example "I'm P1, working on M3 step 2". Claude then works only in that person's areas (§33.3) and asks before touching a shared file.
- Decisions made in one session go into `spec.md` and `changelog.md` in the same PR, so the other person's Claude sees them after pulling.

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

## 2026-10-16 · Tap a person on a card → their profile
**What:**
- On Home cards and the place page's "People who've been" rows, tapping the **avatar or the name** opens that person's profile (E1, or E2 if not connected).
- On my own cards ("You went to") it opens my Profile tab.
- On a friend entry ("Rahul told you about") it opens the profile of the account that friend name is linked to (Settings → Friend names → Link). If the name isn't linked, it does nothing.
- Internet entries have no person.
- Tapping anywhere else on the card still opens the entry (C2).

**Why:** the owner asked for it. The spec already said "tap name → profile" on B1, but Home never wired it up, and the avatar wasn't tappable anywhere.

**Spec:** §14 B1, C1 ("People who've been"), §22.5 `home_feed` (`friend_user_id`).

**Backend:**
- Migration `20261016142754_feed_person_links.sql`: `home_feed` (dropped and recreated, since the return type changed) and `place_page` now return `friend_user_id` (the friend name's `linked_user`). Saved entries only ever go to their owner, so this is owner-only data.
- The test `04_saved_entries` gained 2 checks. **All 124 database tests pass.**

**App:**
- `EntryCard`: `onPressName` became `onPressPerson`, which now covers the avatar or mark as well as the name;
- Home `personOf()`;
- place page `personId()`;
- `FeedItem.friend_user_id`.
- Typecheck is clean.

## 2026-10-16 · The wishlist is only for places I haven't visited
**What:** every ♡ / Wishlist control is hidden for a place I've already visited:
- C2's Wishlist button (on my own visit, **Edit** becomes the single filled button; if neither button applies, the bar is gone);
- the C1 ♡;
- the ♡ on a connection's wishlist item;
- the import screen's "Also add to my wishlist";
- the map preview (M8, in the spec).

If such a place is somehow still on my wishlist, the control stays so it can be removed.

**Why:** the owner asked "if I already visited a place why would I want it on my wishlist?" The wishlist means "want to go", and saving a visit already removes the place from it, so offering ♡ on "Your visit" re-added what the app had just removed. It was clutter and contradictory. Trade-off: no "want to go back" wishlist; the visit itself is the record.

**Spec:** §9 (the new rule), §14 C1 and C2, E1 (the wishlist tab), §22.3 `set_wishlist`, §22.5 `user_wishlist`.

**Backend:**
- migration `20261016141757_wishlist_unvisited.sql`:
  - `set_wishlist(…, true)` does nothing for a place I've visited;
  - `user_wishlist` gains `i_went`.
- New test `07_wishlist_unvisited.test.sql` (6 checks).
- `03_visits_privacy` no longer re-adds a visited place: that check now expects it to be ignored, and the wishlist-visibility check uses an unvisited place.
- **All 122 database tests pass.** Applied to the local sandbox with `supabase migration up`.

**App:** `entry/[type]/[id].tsx`, `place/[placeId].tsx`, `people/[userId].tsx` (`UserWish.i_went`) and `import.tsx` (checks the picked place with `place_page`). Typecheck is clean. **Checked on the phone by the owner.**

## 2026-10-16 · M7 work log (tags and notifications), in progress
**Done**
- **Migration** `20261016085839_tags_and_notifications.sql`:
  - `tags`, `notifications` and `push_tokens` tables, with RLS;
  - visibility split into `can_see_visit_social` (feeds and lists) and `can_see_visit` (adds "tagged on that visit");
  - `visit_companions` shows "with Anu", plus "Anu · pending" for the author; `visit_tags`; `visible_name` ("Someone" if they blocked you);
  - `save_visit` gains `tag_user_ids` (connections only; new tags notify) and `accept_tag_id`, and notifies opted-in subscribers on insert (the wishlist variant wins);
  - `respond_tag` (same / reject), `untag_me`, `tag_detail`, `my_tag_requests`;
  - `notifications_page`, `mark_notifications_read`, `unread_notifications`, `register_push_token`;
  - requests and accepts now notify; block also clears pending tags and notifications.
- **Migration** `20261016090458_push_webhook.sql`: a trigger on notifications INSERT calls the `push` function via pg_net. Its URL and secret live in Vault; with no secrets set, nothing is sent.
- **Function** `push`: checks the shared secret (`verify_jwt = false` in config.toml), sends through Expo's push service, and drops dead tokens.
- **Local setup:** `PUSH_WEBHOOK_SECRET` was generated into `supabase/.env`, and the sandbox Vault has `push_url` and `push_webhook_secret`.
- **Tests:** new `06_tags_notifications.test.sql` (27 checks: the A–B–C scenario, pending-tag privacy, Same as A's, un-tag, notification flows, activity notifications, block). **All 116 pass.**
- **App:**
  - D3 offers connections to tag; VisitForm sends tags and accepts tags (`visit/new?acceptTagId`);
  - E8 `tag/[tagId]`; F1 `notifications` (Today / Earlier, inline Accept / Decline and Add your review, marks read); Home 🔔 has an unread dot;
  - C2 shows tappable "Went with" names and ⋮ "Remove me from this visit";
  - the Button variant `dangerText`.
  - Typecheck clean.

**Push registration (app)**
- New `features/notifications/push.tsx`:
  - The A7 explainer: "Know when Anand says yes?" / "We'll only notify you about requests and tags, unless you turn on more for someone." with a bell icon and the buttons "Not now" and "Turn on". It shows **once per install**, right after the user first sends a request (with that person's name) or saves a visit with tags. "Not now" is respected.
  - On "Turn on": Android's permission prompt, then the "default" channel (high importance), then `getExpoPushTokenAsync({ projectId })`, then `register_push_token`.
  - The token is refreshed on every start while signed in.
  - Tapping a push opens its `data.route`, both when the app is running and from a cold start.
  - Every step fails quietly, so F1 still works without push.
- Sign-out now unregisters this device's token, so the next person to sign in doesn't get the old account's pushes.
- `app.config.ts`:
  - adds the `expo-notifications` plugin;
  - uses `app/google-services.json` only when the file exists (it is git-ignored);
  - reads `EAS_PROJECT_ID` from `app/.env`. `.env.example` is updated.
- Typecheck is clean and the bundle builds.

**Spec updated**
- §17: a `pg_net` trigger with the URL and secret in Vault, instead of a "Database webhook".
- §21.1: `can_see_visit_social` and why feeds use it.
- §22.4: `tag_detail`, `my_tag_requests`.
- §22.5: the `entry_detail` tags and my_tag; `notifications_page` fields; `unread_notifications`; `register_push_token` and `unregister_push_token`.
- §23: the `push` trigger.
- §26.9: when the explainer shows, unregister on sign-out, and where `projectId` and the FCM config come from.

**Push setup by the owner (all free, no card)**
- Firebase project `thinnava-f44c7` (Spark plan), with the Android app `com.thinnava.app`. Its `google-services.json` is in `app/` (git-ignored). Only Cloud Messaging is used; no other Firebase products were added (`expo-notifications` already includes `firebase-messaging`).
- Expo account with the project `thinnava`. `EAS_PROJECT_ID` is in `app/.env`. In Expo credentials, the application identifier `com.thinnava.app` was set up:
  - its upload keystore is the public **debug** keystore (default passwords; not a secret; Expo's wizard requires one even though we build locally);
  - the Play Store key was skipped;
  - the FCM V1 service-account key was uploaded.
  - The private key file was never shared or read.
- `.env` fix: the key was written `EAS_PROJECT-ID`, and it was renamed to `EAS_PROJECT_ID` without reading the value.
- Native rebuild: `expo prebuild --clean` + `expo run:android`; Metro restarted so the dev manifest carries the projectId.
- The release keystore is still to come in M9; it will be secret and never uploaded.

**Push phone test (Samsung S711B), passed ✅**
- Setup: cleared my old pending request to `@tester` (sandbox data only).
- Profile → "Request to connect": the explainer **"Know when Test says yes?"** appeared, with the bell icon, "Not now" and "Turn on". "Turn on" led to Android's "Allow Thinnava (dev) to send you notifications?", and Allow → an `ExponentPushToken[…]` was saved in `push_tokens` for my account.
- Test accepted from the laptop (`respond_request` as tester). Then:
  - the pg_net trigger fired;
  - the `push` function returned `sent: 1`, and Expo answered HTTP 200;
  - **the phone showed "Test accepted your request"** (channel "default", importance high, brand colour).
- Tapping the push: the M6 list prompt for the new connection showed first, as designed, then **Test's profile** opened (the `/people/<id>` route).

**Demo criterion 3 (collab tag), passed ✅**
- Three accounts:
  - **A** = `@tester`;
  - **B** = me, on the phone;
  - **C** = a new sandbox-only account `@cfriend` ("Chitra Rao", `c@thinnava.local`, same practice password). C is connected only to me.
- C's request arrived as a push, **"Chitra wants to connect"**. I accepted it from the push → her profile. (The first push looked missing because the phone was locked; it was in the shade.)
- A logged CTR (Shri Sagar) with "All connections", tagging me (`save_visit` with `tag_user_ids`). The **"Test tagged you at CTR (Shri Sagar)"** push arrived → E8 → **Same as Test's** → the tag was `accepted`, and my own visit was created.
- As C:
  - **Home shows my CTR visit "with Test"**;
  - `entry_detail` on **A's visit returns null**, so C can't see A's visit at all.
- **Decided: notes stay copied.** "Same as A's" copies A's notes too (spec §7). The copy belongs to B and is shared with B's audience, so C can read the note through B's visit. The owner chose to keep this as specced; B saw the notes on E8 before tapping, and can edit them afterwards.

**Pushes verified on the phone:** request ✅, accept ✅, tag ✅. Opted-in activity ("X visited …") uses the same path but hasn't been triggered on the phone yet.

## 2026-10-16 · M6 complete ✅ (connections, lists, audience)
**Phone test (Samsung S711B; the second person was the sandbox-only account `@tester`, driven from the laptop)**
- **Demo criterion 2:** Test's request showed as a red dot on Profile → Connections → Requests → Accept → E5 "You and Test are connected!" → Test's profile (bio, Connected) → tapping Shivaji opened "Test's visit" → Wishlist tab → ♡ copied Nagarjuna to mine → created the "College" list and added Test.
- **Demo criterion 4:** Test's Third Wave visit, shared only with their Close friends, was **hidden** from me. When Test added me to Close friends it **appeared**; when Test removed me it **disappeared**.
- Search → Places "biryani": Shivaji under "People you know went" with Test's face and "1 went"; the "Someone I know went" and ₹ chips are there.
- Search → People "test": "Connect" became "Requested" ("Request sent to Test").
- Block: the E9 dialog → after blocking, Test's search no longer found me and their request was refused ("blocked"); Test was removed from my College list. Settings → Blocked people → Unblock → not reconnected (as the spec requires).
- **Fixed during the test:**
  - the "connected" snackbar no longer covers the E5 sheet;
  - the Block dialog's icon circle is red (E9 mockup);
  - E1 has pull-to-refresh, and "N visited" no longer gets squeezed.
- **Not tested on the phone:** Remove connection, list rename and delete, and friend-name linking. The database tests cover their logic.
- **Two real phones not used:** the laptop played the second person. A real two-person run is still worth doing before the demo.

**Backend**
- **Migration** `20261016082345_connections_and_lists.sql`:
  - tables `connection_requests`, `list_prompts`, `activity_subscriptions` and `declined_requests` (new: makes the §5.1 silent decline work; only the sender can read it, so they keep seeing "Requested"); RLS on each;
  - helpers `relation_to`, `connect_pair`, `disconnect_pair` (removes the connection, 🔔 subscriptions, each other's custom-list memberships and list prompts);
  - people: `search_people` (prefix ≥ 2, hides people who blocked me), `profile_page` (bio, counts, 🔔 and "my lists they're in" for connections only), `user_visits`, `user_wishlist`;
  - connections: `send_request` (connects at once if they already asked me), `cancel_request`, `respond_request` (accept → E5 prompts for both; decline is silent), `remove_connection`, `block_user` (also unlinks friend names), `unblock_user` (doesn't reconnect), `my_blocked`, `set_activity_notifications`, `my_connections`, `my_requests`, `pending_list_prompts`, `dismiss_list_prompt`;
  - lists: `create_list` (1–30 characters, unique in any case, max 20), `rename_list`, `delete_list` (visits and the wishlist left with no audience fall back to Only me, never wider), `set_list_members` and `add_to_lists` (connections only), `list_detail`; `link_friend_name` (connections only).
  - Notification rows (connect_request / connect_accepted) are left for M7, when the notifications table exists.
- **Migration** `20261016083257_who_went.sql`: `who_went(place_ids)` for Search results: faces (≤ 3), count, "you went" and visible prices.
- **Tests:** new `05_connections_privacy.test.sql` (32 checks) covering the §21.3 items in M6: a Close-friends visit is hidden from a connection outside the list and from non-connections; bio is hidden from non-connections; members can't see the lists they're in; deleting a list falls back to Only me; disconnecting hides visits and bio; a blocked user can't find, open or request me; unblocking doesn't reconnect; crossing requests connect; the silent decline; `who_went` shows only what you may see. **All 89 tests pass.**

**App**
- `features/people/`: api, components (`PersonRow`, `RelationButton` showing Connect · Requested · Accept · Connected, `useRelationAction`), `AddToListsSheet` (E5), `ListPromptHost` (shows E5 for each new connection, mounted in the tabs layout).
- **Search → People:** username search with a status button per person and "People only see each other's food life after both say yes." Home's "Find people you know" opens it (`?seg=people`).
- **Search → Places:** results start with "People you know went" (faces, "3 went" / "You went"), then "Nobody you know has been"; filter chips "Someone I know went", the ₹ buckets and category.
- **E1 / E2** `people/[userId]`: E2 has "Connect to see where Anand eats" with Request to connect · Requested (tap to cancel) · Accept + Decline. E1 has bio, Connected + lists chips, "N visited", 🔔 (saved now; pushes come in M7), Visited · Wishlist (♡ copies to mine), and "Open map" (M8). ⋮ has Add to lists · Remove connection · Block, with the E9 dialogs.
- **E3** `connections`: Connections · N (search when there are more than 6) and Requests · N (Accept / ✕, "You asked" with Cancel and "2 days ago").
- **E6** `lists` and **E7** `lists/[id]`: New list, rename, add/remove people, Delete list (the dialog explains the Only me fallback).
- **Blocked people** `settings/blocked` with Unblock.
- **Settings:** Connections, My lists and Blocked people now open their screens.
- **Profile:** the Connections button opens E3 (a red dot when there are new requests); the counts are tappable.
- **F4 Friend names:** Link to a connection / Unlink.
- The D4 audience sheet already lists custom lists (with member counts), so visits can now be shared with "Close friends".
- **Spec updated:** §20 (`declined_requests`), §22.2 (`my_connections`, `my_requests`, `my_blocked`), §22.5 (`who_went`).

## 2026-10-16 · M5 complete ✅ (friend & internet entries, AI reading, copy/share import)
**Phone test (Samsung S711B, practice places, real Gemini)**
- Demo criterion 1: copied "Went to Meghana yesterday, boneless biryani was insane, chicken 65 was meh. ~350 each" → Home card "You copied a message" → **Read it** → "Which one?" (two Meghana Foods) → Use this place → the form came back filled (Okayish, loved boneless biryani, didn't like chicken 65, ₹350, yesterday) → Who told you? "Rahul" (new name) → **Save** → "Saved Rahul's experience". The entry shows on **Home** ("Rahul told you about", 🔒 Only you), on the **place page** ("Rahul told you") and in **Profile → Saved**. Reading took 5–11 s depending on Google's load. With the taps a person makes, the whole flow is about 20 s; my automated run was slower because of the screenshots between taps.
- **Bugs found and fixed:**
  - the "Who told you?" sheet didn't open inside /import, because a transparent modal sits above the app's sheet host; /import now has its own;
  - a slow Google answer could leave the reading sheet up for 2 minutes; the app now gives up after 15 s and offers "Fill it in", and the server's 14 s limit also covers reading the answer body;
  - `gemini-3.1-flash-lite` was answering "high demand" 503s, so the fallback is now `gemini-flash-lite-latest`;
  - "went Yesterday" → "went yesterday" on cards.
- Also seen working: the "Couldn't find a place in that" screen; the + → A friend told me form with "Use copied text?" and the "Rahul" quick pick; the "Done" badge; Save stays off until a name and place are set.
- **Not tested on the phone:** Share → Thinnava from another app (the `links` function was checked from the laptop: Maps, Instagram, YouTube, Swiggy, a normal page, and a blocked local address), editing and deleting a saved entry, and Settings → Friend names. These use the same database calls the tests cover.

**Backend**
- **Migration** `20261015130202_saved_entries.sql`:
  - `saved_kind` enum and the tables `friend_names` (client ids, unique per owner and case) and `saved_entries`, with the spec §20 checks; RLS is owner only;
  - writes: `save_saved_entry` (idempotent; a new friend name travels with the entry and reuses an existing name of any case; internet entries drop the date; links must be http(s)), `delete_saved_entry`, `add_friend_name`, `rename_friend_name`, `merge_friend_names` (moves entries, then deletes), `delete_friend_name` (only when unused); linking a name to a connection comes in M6;
  - reads: `my_friend_names` (entry counts, most recent first), `my_saved` (Saved tab, paginated); `home_feed` now unions my saved entries (filters friends and internet work); `place_page` lists my saved entries under people; `entry_detail('saved', id)`; `my_counts` adds `saved`.
- **Tests:** new `04_saved_entries.test.sql` (19 checks), including the §21.3 rule "saved entries are never visible to others, even linked friends". **All 57 tests pass.**
- **Shared Places code** moved into `_shared/placesCore.ts` (quota-checked text search, upserts), so `places`, `extract` and `links` share one zero-cost-guarded path. `practiceByName` was added for AI candidates in practice mode.
- **`extract` function** (§24): 40 reads per user per day; text up to 4,000 characters; Gemini with the §24.3 prompt and a JSON response schema; zod validation; clean-up (dishes de-duplicated, no future dates, prices within 1–50,000); up to 3 Google candidates per place. Only counts and timings are logged, never the text.
- **`links` function** (§10.1, §23):
  - follows redirects by hand, checking every hop (no private or local addresses), with a 5 s timeout and a 512 KB limit;
  - Maps links → the place (through `consume_google_quota`); Instagram and YouTube → the kind only (the user pastes the caption); other pages → title and description, plus a name hint from Zomato, Swiggy and District URL slugs, because those pages are script-rendered.
- **Model choice (measured):** `gemini-2.5-flash` is retired for new keys; **`gemini-3.5-flash` allows only 20 free requests a day per project**, too few for a demo. Switched to **`gemini-3.5-flash-lite`**, with `gemini-3.1-flash-lite` as the fallback (separate free allowance). Hedged request: if the main model hasn't answered in 5 s, or answers 503/429, the fallback is asked too and the first good answer wins, all within 14 s. The key is on `thinnava-free` (no billing), so it can't cost anything.
- **Eval** `tools/extraction-eval` (32 messages: single and multiple places, group totals, Hindi/Telugu/Kannada words, 6 non-food) plus `run.mjs`, which scores the real function. **Result: PASS. Places 100%, invented dishes 0, review 89%, price 100%, non-food rejected 100%; median 3.5 s.** One Google 503 on the first try recovered on retry.
- `npm run backend:functions` (app/package.json) serves functions with `supabase/.env`; `docs/dev-setup.md` now lists the Gemini settings.

**App**
- `features/saved/`: api (RPCs and the AI calls), `FriendNameSheet` (D6), `SavedFields` (the fields shared by D5 and D8: source toggle, Who told you? with Required/Done and quick-pick chips, Link, Place with Change, How was it for them?, dishes, price, When they went, amber "Please check this" flags), `SavedScreen` (D5), `draft.ts`, `labels.ts` ("From a reel" / "From a video" / "From a link" / "Found online").
- Routes `saved/new`, `saved/[id]/edit`, `import` (transparent modal), `settings/friend-names` (F4: rename, merge into…, delete when unused; linking says M6).
- **Import** `/import`: D7 "Reading this message…" sheet with the cat → D8 "Check what we found", "1 of N", Discard/Save, "Also add to my wishlist", and the original message "for checking · not saved" → D8b "Which one?" when several places share the name → on failure "Couldn't find a place in that" → Fill it in (the form, prefilled). Links go to `links` first, then branch by kind; Instagram and YouTube get "Paste the caption" + "Read caption".
- **Copy route:** `features/import/clipboard.ts` checks only *whether* there's text and reads it only on Read it / Use. Home shows the "You copied a message · Read it" card, hidden for 6 h after Read it or ✕, back when the clipboard changes. D5 shows "Use copied text?" (no preview, so Android's notice appears only on tap; spec §14 D5 updated).
- **Share route:** `useShareImport` sends shared text and links to `/import`; while signed out, the share is kept and continues after sign-in. Offline drafts come with M9.
- The + dial's "A friend told me" and "Found it online" open D5; Home's empty-state button too.
- **Home:** friend cards ("Rahul told you about", "went Oct 10", 🔒 Only you) and internet cards ("From a reel"); filtered-empty states have their matching action.
- **Entry page C2:** "Rahul's experience" / "Found online", Open link, "🔒 Logged by you today · Only you can see this", edit → D5, Delete entry ("This can't be undone.").
- **Place page:** "People who've been" includes my friend and internet entries ("Rahul told you", "From a reel", 🔒 Only you).
- **Profile Saved tab:** All · From friends · Internet chips; rows like "Burger Factory / Rahul · Koramangala"; 20 at a time.
- **Delete account:** shows the real count of friend and internet entries.
- Theme tokens `quote`, `onQuote` and `check` (from the D8 mockup); `TextField` gains `warn`; `Segmented` gains icons; `pick-place?for=select` hands the place back through `features/places/picked.ts`.
- **Spec updated:** §18.2 (models), §24.1 (hedged request), §14 D5 (no preview), §27.3 (`GEMINI_FALLBACK_MODEL`).

## 2026-10-15 · Design-drift pass: the app now follows the mockups screen by screen
- **What:** The owner noticed the + overlay was blue while the mockup is navy, and asked for a rigorous check of every built screen against `design/phase1.html` and `design/phase2.html`. All 48 mockup frames were rendered to images (headless Chrome) and compared with the code and the phone. Fixed:
  - **B3 + overlay:** navy scrim `rgba(14,24,44,.78)` (was Deep Cobalt at 84%). The × keeps a soft shadow so its white square shows on the white nav bar. The mockup's 3 px blur needs a native module, so it's left out.
  - **B1 / B1a Home:** filter icon before 🔔. On a new user's empty feed only 🔔 shows. The empty-state buttons have icons (utensils, message, user-plus); the cat is 170 dp; the WhatsApp tip sits below the card with **Thinnava** in bold.
  - **D2 Add / edit visit:**
    - × close and a 19 dp title;
    - a bordered place bar with a 40 dp thumb and a plain "Today" chip;
    - rating buttons in one 50 dp row (icon beside the label);
    - dish fields with a quiet "+ Add";
    - Price and Went with side by side (Went with shows small initials);
    - Notes marked "optional";
    - a tinted "Shared with / All connections" box;
    - a white footer bar with a hairline top.
  - **C2 Entry detail:** a tappable place card (thumb, name, area · category, chevron), then one panel holding the big rating pill and a facts list. Footer: "🔒 Logged by you on … · Shared with …". Wishlist is the filled button; it turns tonal once on the wishlist.
  - **D10 / A7 / sign-out dialogs:** an icon in a tinted circle and text buttons. Delete is red text; Allow and Sign out are a filled pill.
  - **C1 Place page:**
    - the "Google info" pill shows in every state, including C1a;
    - hand-off tiles: radius 18, cobalt icons, mockup shadow;
    - meta line 13.5 bold;
    - panels with card shadows and 16 dp section titles;
    - "Your visits" chips read "Today Good";
    - people rows read "Ananya with Arjun", with muted price · date;
    - the Add visit FAB uses the mockup's spacing and shadow.
  - **D1 Picker:** "Recently used" rows use a history icon. The title is 19 dp.
  - **D3 Went with:** pill search with a search icon, and an "Add a private name" row that is always visible.
  - **D4 Audience:** square checkboxes, since lists combine.
  - **B5 Profile:**
    - 92 dp avatar with a white ring, a shadow and a pencil badge (→ Edit profile);
    - @username in 14 bold;
    - tighter counts;
    - Saved tab starts with "🔒 Only you can see this tab.";
    - list rows on white cards.
  - **F2 Settings:** profile header on the ground with a tonal "Edit" pill. Groups have 22 dp corners and card shadows, 38 dp icon circles and full-width dividers. Delete account is red. The spec's extra rows (Blocked, Notifications, About & privacy) stay.
  - **F3 Edit profile:** × close.
  - **Shared components:**
    - `TopBar` gains `close` and `compact`;
    - `Dialog` gains `icon` and text buttons;
    - `SheetOption` gains `check`;
    - `ReviewPill` gains `big`;
    - `Thumb` / `CategoryThumb` gain `size`;
    - "optional" labels lose their parentheses.
- **Found and fixed during the phone check** (every built screen was opened on the S711B and compared with its mockup frame):
  - the "Okayish" in "Your visits" chips lost its verdict colour, because a text style overrode the colour prop;
  - the "Nobody you know has been yet" card was too tight: the panel's `paddingVertical` beat a later `padding`;
  - multi-line fields (Notes, Bio) are 76 dp, not 96;
  - your own unchanged username in Edit profile shows just the ✓, without "is available";
  - the entry footer reads "Logged by you today", not "on Today";
  - the Visited list's rating pill is centred in its row;
  - D3 section labels: bold group name with a lighter explanation;
  - B1b filter icons: two people for Connections, one person for From friends;
  - B4 Search: icons on the Places / People toggle, a history icon on Recent, and › on "Nobody you know has been" rows;
  - F7 Delete account: three icon rows with your counts ("1 visit and your reviews"), the warning below the panel, and a smaller cat;
  - C1b: no ♡ on a closed place (unless it's already on your wishlist);
  - snackbar: 14 dp corners, 12 dp side margins and the mockup shadow.
- **Checked on the phone and matching:** B1, B1a, B1b, B3, B4 (idle, typing, results), B5 (Visited, Saved), C1, C1a (♡ and the "Who sees it" snackbar), C1b, C2, D1, D2, D3, D4, D10, F2, F3, F7.
- **Not checked on the phone this round:** onboarding (A1 to A3) needs signing out and back in with Google. It was checked against the mockups in M1/M2.
- The test visit, the wishlist row and the test name "Mom" from this check live only in the local sandbox. The visit and wishlist row were removed; "Mom" stays as a private companion name.
- **Kept on purpose:**
  - The Profile tab's small map preview waits for M8 (an "Open map" row until then).
  - Screens for later milestones aren't built yet.
- **Docs:** DESIGN.md now says navy for the dial scrim (it contradicted itself), and adds the 19 dp flow-screen title and the × close. `motion.html` and its builder use the same navy scrim.
- **Spec:** §14 B1 top bar now reads "filter icon (hidden on a new user's empty feed), 🔔", matching the mockups.

## 2026-10-15 · M4 complete ✅ (my visits, wishlist and Home)
**Done**
- **Migration** `20261015072353_visits_and_wishlist.sql`:
  - tables `visits`, `visit_audience`, `companion_names`, `visit_companion_names`, `wishlist_items`, and the `rating` enum;
  - helpers `in_audience`, `can_see_visit`, `can_see_wishlist` (tags join in M7); RLS on every table;
  - RPCs `save_visit` (idempotent upsert; validates date, rating, dishes, price, notes and audience; a new visit removes the place from the wishlist), `delete_visit`, `set_wishlist`, `set_wishlist_audience`;
  - reads `home_feed` (all / connections / mine), `place_page`, `entry_detail`, `my_wishlist`, `my_counts`, `my_lists`, `my_wishlist_audience`.
- **Tests:** `03_visits_privacy.test.sql`, 18 checks covering audience rules (All connections, Only me, a custom list hidden from non-members), non-connections seeing nothing, private companion names, dish clean-up, wishlist auto-removal, and no deleting others' visits. **All 38 tests pass.**
- **App:**
  - `lib/dates.ts` (IST "today", friendly dates, time-ago), `features/visits/api.ts`;
  - `RatingPicker`, `DateSheet` (Today/Yesterday + month calendar, no future dates), `AudienceSheet` (D4, exclusivity rule), `CompanionSheet` (D3, private names);
  - `VisitForm` (D2), routes `visit/new` and `visit/[id]/edit`, `entry/[type]/[id]` (C2: Edit, Wishlist, ⋮ Delete with confirmation).

- **Place page (C1)** now uses real data: "Your visits", "People who've been", the ♡ wishlist toggle and the **Add visit** button (→ D2 with the place filled in).
- **Picker → Add visit:** `pick-place?for=visit` continues to `visit/new`. Home's empty-state button and the + dial's "I went somewhere" both use it.
- **Home (B1)** is a real timeline: FlashList, 20 cards per page with more loading on scroll, pull to refresh, a filter sheet (Everything · Connections · From friends · Internet · Mine) with a removable chip for the active filter, per-filter empty text, and the new-user empty state. A card shows "went Oct 10" only when the visit date differs from the day it was logged.
- **Profile (B5):**
  - real counts from `my_counts`;
  - Visited · Wishlist · Saved tabs; Visited loads 20 at a time;
  - each tab has an "Open map" row, which says the map arrives in M8;
  - Wishlist has "Who can see this" (D4 with the built-in lists), saved through `set_wishlist_audience`;
  - the Saved tab says it arrives in M5.
- New routes are registered in the root layout. `npx tsc --noEmit` is clean, and all 38 database tests still pass.
- **API check** with the sandbox test user (who was given a `tester` profile): ♡ → wishlist 1; saving a visit → visits 1, wishlist 0 (`removed_from_wishlist: true`); the visit appears in `home_feed('mine')` and in `place_page` under my visits; an edit changes the rating, date and notes; a delete brings visits back to 0.

**Deferred**
- The card → place title glide moves to the M9 motion pass. M4 uses a plain fade.

**Phone test (Samsung S711B, practice mode) — all "Done when" items pass**
- Add a visit: Home → Log a place → Koshy's (Near you) → Good → "Mutton cutlet" → Save. That's 5 taps, well under 30 s for a person. The card appeared on Home, in Profile → Visited (with the count at 1), and on the entry page.
- Edit: changed the rating to Okayish. The entry page, the Home card and Profile all updated.
- Wishlist: "Wishlist" on the entry page → "On wishlist" (1 row in the database). Logging another visit to Koshy's removed it (wishlist 0).
- Delete: ⋮ → Delete → confirm removed the visit (2 → 1).

**Design check against `design/phase1.html`** (owner asked whether the UI follows the latest designs)
- Fixed: Profile list rows now sit on white rounded cards, as in the mockup.
- Fixed: the entry detail panel no longer draws a divider under its last row.
- Kept as is: the Home top bar shows 🔔 then filter. That's the order in spec §14 B1; the mockup has them the other way round, and the spec wins.
- Waits for M8: the mockup's small map preview on each Profile tab. Until the map exists, it's an "Open map" row.
- The grey ⚙ "Tools" bubble on the phone is Expo's dev menu. It isn't part of the app and won't be in the APK.

## 2026-10-15 · M3 work log (places, place page, search; practice mode)
**Backend**
- **Migration** `20261015065935_places_and_quota.sql`:
  - `places` (readable by any signed-in user; written only by functions) and the `place_category` enum;
  - `usage_caps`, seeded with the 80% caps (autocomplete 8,000; details 4,000; details_rich 800; text_search 4,000; nearby 4,000), plus `monthly_usage` and `usage_counters`;
  - functions `consume_google_quota(sku)` (atomic; refuses at the cap; service role only), `consume_user_quota` (300 Places calls per user per day) and `google_info_mode()` ('tap' / 'off').
- **Edge Function `places`**:
  - actions autocomplete, details, google_info, nearby and search (keyword search, so food words work);
  - real Google: Places API (New) with field masks, session tokens, and the quota checked before every call;
  - practice mode with no key (§25.6): fixtures in `_shared/practicePlaces.ts` (29 real Bengaluru places with rough coordinates and food keywords, plus one fictional closed café); invented ratings and hours are labelled practice; it refuses to run with `APP_ENV=prod`;
  - every result is upserted into `places`; `_shared/category.ts` maps `primaryType` to our categories (§25.3).
- **Tests:** new `02_google_quota.test.sql` (the cap refuses, refused calls aren't counted, Google info turns off at the cap, app users can't call the counter). **All 20 tests pass.**
- **Local functions:** the sandbox's edge-runtime container exited on start, so functions are served with `npx supabase functions serve` (log `functions.log`). Checked with a sandbox-only test user (`tester@thinnava.local`): every action returns correct practice results.

**App**
- New libraries in our code: `lib/queryClient.ts` (TanStack Query, now in the root layout), `lib/functions.ts` (calls functions and unwraps `{ok, data}`), `lib/location.ts` (location with the A7 "Show places near you?" explainer before Android's prompt; denying blocks nothing), `lib/format.ts`.
- `features/places/`: api (functions, the `places` table, recent places in MMKV), components (PlaceRow with category icons, SearchField, the practice note), LocationExplainer.
- `features/handoff/urls.ts`: Directions (Google Maps link) and Swiggy search (§11.1).
- **D1 `pick-place`**: search with a 250 ms debounce and one autocomplete session per visit, "Near you" sorted by distance, "Recently used"; picking opens the place page (M4 will route it into Add visit).
- **C1 `place/[placeId]`**:
  - name, category · area, Directions and Swiggy;
  - C1a: "Nobody you know has been yet", the address, and "Show Google's rating, hours and price" **on tap only**; 'off' mode opens Google Maps instead;
  - C1b closed state (Swiggy hidden);
  - the ♡ and Add visit buttons say "arrives in M4".
- **B4 Search**:
  - while typing: places already in Thinnava, then Google name suggestions, plus "See all results";
  - after Search: keyword results with category filter chips;
  - Recent places when empty; People says "arrives in M6".
- **Wiring:** Home "Log a place you've been", + → "I went somewhere", and the Map search bar now lead to these screens.

**Tested on the phone (practice mode)** ✅
- The location explainer appeared before Android's prompt; the owner allowed location.
- "Near you" used the real position (near IISc): CTR, Malleshwaram at 1.9 km first, with category icons and distances.
- Typing "megh" listed both Meghana Foods. The place page shows Directions and Swiggy, and "Show Google's rating, hours and price" loads on tap, labelled "Practice data, not from Google".
- The Search tab with "biryani" (keyboard search) returns both Meghanas, Nagarjuna and Shivaji Military Hotel with distances. Category chips appear only when results mix categories.
- The closed café shows "Permanently closed", greyed name, Swiggy hidden, Directions kept.
- Fix: the closed-place note ("What people said is still here…") now shows only when there are entries.
- Testing note: automated taps once pressed Back too often and left the app (landed on the owner's home-screen folder; nothing changed). Afterwards, taps were found by on-screen labels and Back was avoided.

**M3 status:** ✅ done in practice mode. Still to check once Google Cloud is set up: real Google results, and the "off" mode on the phone (already proven by the database tests).

## 2026-10-15 · Google Cloud setup paused; M3 continues in practice mode
- **What:**
  - On the owner's first Google account, the UPI option demanded a one-time ₹1,000 prepayment (refundable only by closing the billing account). The owner didn't want to sort it out now and will use a **second Google account** for `thinnava-maps` later, with a card.
  - The whole Google Cloud console step is **postponed** at the owner's request.
- **Decision (owner): Option A.** Build M3/M4 now against a **dev-only practice mode** of the `places` function (spec §25.6): about 30 real Bengaluru places as fixtures, used whenever no Google key is set. Switching to real Google later only needs the key.
- **Still to do when the owner resumes:** first-account cleanup (check `thinnava-free` has no billing; close the stray billing account if the ₹1,000 was paid), then the `thinnava-maps` steps on the second account, the gcloud CLI, and deploying and testing the billing shut-off before any key goes live.
- **Spec:** §23 (`places` gains a `search` action), new §25.6.

## 2026-10-14 · M3 started: `thinnava-maps` goes pay-as-you-go, with a billing shut-off
- **Prices checked** on Google's official pricing page (spec §27.5 table):
  - Autocomplete Requests: 10,000 free a month; autocomplete sessions free and unlimited.
  - Place Details Pro: 5,000; Enterprise: 1,000. Text Search Pro: 5,000. Nearby Search Pro: 5,000.
  - Maps SDK for Android: unlimited and free, as long as no Map ID is used.
  - Our caps are 80% of each.
- **Owner decision:** after discussing free trial versus paid, the owner chose a **pay-as-you-go** account. It's created through the trial and **upgraded immediately**: no time limit, no subscription, and the $300 trial credit is kept for 90 days as a cushion.
  - Condition agreed: **lock 3 (automatic billing shut-off) is built before any key is used.**
- **Lock 3 code:** `infra/billing-killswitch/` (Python Cloud Run function). The budget counts gross cost (before credits) and publishes to Pub/Sub; above ₹50 the function detaches billing from `thinnava-maps`.
- **Lock 2 corrected:** Places API (New) only has per-minute quotas, which slow bursts but can't cap a month.
- **Spec:** §27.2 (`thinnava-maps` row), §27.5 (locks rewritten), §32 (risk row).

## 2026-10-14 · App name is "Thinnava" (no "?!")
- **What:** the owner dropped the "?!" from the name everywhere.
  - App: wordmark, splash, intro, welcome, gallery, and the Android app name, now "Thinnava" / "Thinnava (dev)". The launcher label changes on the next native rebuild.
  - Docs: spec, DESIGN.md, PRODUCT.md, CLAUDE.md, legal drafts, `.impeccable/design.json`.
  - Mockups: phase1, phase2 and motion, regenerated.
- **Not changed:** older changelog entries, which describe what was true at the time.
- **Spec:** §1 title, §16.8, §27.1 (display name).

## 2026-10-14 · M2 work log (sign-in and profile)
**Google Cloud `thinnava-free` (done by the owner, guided)**
- Project created with **no billing**, and the free-trial offer dismissed.
- Google Auth Platform (OAuth consent): app name "Thinnava", audience External, Testing mode, owner added as a test user. No logo, which avoids a verification review.
- **Public contact email:** `921019chimirelakarthik@gmail.com`, filled into `docs/legal/privacy.md` and `terms.md`.
- **Android signing fingerprint for dev builds:** Expo's standard debug keystore, SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`. It's the same on every laptop, so one Android OAuth client covers both owners' dev builds (simplifies spec §33.7).

**Backend (decided by the owner): local sandbox for development, hosted only for prod.**
- First the owner picked hosted `thinnava-dev`. After hearing that Supabase's free plan allows only about **2 active projects** (which `thinnava-dev` + `thinnava-prod` would use up), they switched to a **local Supabase sandbox in Docker** on each laptop for development.
- Hosted Supabase will hold **only `thinnava-prod`**, created before the first APK for other people. The organisation can have any name; the owner may group other projects in it.
- **Memory:** this laptop has 16 GB, about 2.5 GB free with Chrome and a Gradle daemon open. The sandbox is started slimmed down, without studio, imgproxy, vector, logflare, realtime, storage-api, mailpit, supavisor or postgres-meta (none are used yet), which needs about 1.5 GB.
- **Files:**
  - `supabase/config.toml`: Google provider enabled (web client ID; `skip_nonce_check = true`; secret read from `env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)`).
  - `supabase/.env`: holds that secret, git-ignored, with a placeholder value until the owner pastes it.
  - `app/package.json` scripts `backend`, `backend:stop`, `backend:status`, `backend:test`, `backend:reset`. `phone` now also forwards port 54321 so the phone can reach the sandbox over USB.
  - New guide `docs/dev-setup.md` for setting up any laptop.
- **Spec:** §27.2 and §33.4 updated (local sandboxes instead of personal hosted dev projects; §29 backend line). **`CLAUDE.md`** now includes the owner's reminder: when they move to another laptop, remind them to set up the sandbox there.

**Code written (M2)**
- **Migration** `supabase/migrations/20261014154217_profiles_and_lists.sql`:
  - Tables: `profiles`, `profile_details`, `audience_lists` (+ built-ins), `list_members`, `wishlist_audience`, plus `connections` and `blocks`. The last two are created now because the profile privacy rules depend on them; their RPCs come in M6.
  - A trigger that, for each new profile, creates the "All connections" and "Only me" lists, an empty details row, and sets the wishlist audience.
  - RLS on every table (spec §21.2) and the helpers `is_connected` / `has_blocked`.
  - RPCs `username_available`, `create_profile`, `update_profile`, `my_profile`. Usernames are stored lowercase, and errors come back as message keys.
- **Edge Function** `supabase/functions/delete-account` (+ `_shared/http.ts`): deletes the caller's auth user, and everything cascades.
- **Privacy tests** `supabase/tests/01_profiles_privacy.test.sql` (pgTAP, 12 checks): one profile per user, case-insensitive unique usernames, username rules, built-in lists, bio visible to a connection but hidden from others, and blocking hiding the profile.
- **App:**
  - Infrastructure: `lib/storage.ts` (MMKV), `lib/supabase.ts` (session kept in MMKV, token refresh only in the foreground), `lib/errors.ts` (message keys → plain English), `lib/links.ts`, `platform/signin/google.ts`.
  - Auth feature: `features/auth/` (api, session store, ProfileForm with the 400 ms username check, A1 Splash with the waving cat).
  - Screens: `intro.tsx` (A1b), `welcome.tsx` (A2: Continue with Google, legal links), `setup.tsx` (A3: "Let's eat"), `settings/index.tsx` (F2: rows for later milestones show a "arrives in Mx" note; sign-out confirmation), `settings/profile.tsx` (F3), `settings/delete-account.tsx` (F7: sad cat, type your username to enable).
  - Root layout: an auth gate using Expo Router's `Stack.Protected` (loading → splash; signed out → intro/welcome; no profile → setup; ready → tabs). One snackbar host for the whole app.
  - Small changes: Home greets the user by first name; Profile shows the real name, username, photo and bio; new `Dots` component; `Button` gained a trailing icon.
  - The new cat art was copied into `app/assets/images/`.
- **Waiting for:** the Supabase URL and publishable key (owner), then apply the migration, deploy the function and run the tests.

**Tested on the phone with the local sandbox** ✅
- Sandbox started: Docker Desktop was installed but not running, so it was launched. The first `supabase start` failed because `supabase/.env` had the secret without its `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=` name; fixed without printing the secret. Migration applied; **privacy tests 12/12 pass**.
- `app/.env` now points at the sandbox (`http://127.0.0.1:54321` + local publishable key). The phone reaches it over USB (`adb reverse tcp:54321`).
- A stale code server holding port 8081 with old settings was killed.
- **The owner signed in with Google end to end:** Intro → Welcome → Google → Set up profile → Home ("Hi C.Karthikeshwar!"). The database showed the profile, Google photo, the two built-in lists and the wishlist audience.
- **Also tested by the owner:** edit profile (bio), sign out, delete account. After the delete, the database had 0 auth users, profiles, lists and details. `delete-account` refuses calls with no sign-in (401).
- **Owner feedback: couldn't swipe between the onboarding screens.** Fixed: Intro and Welcome are now one swipeable pager at `/welcome` (pages moved to `features/auth/onboarding/`; `intro.tsx` route removed). Swipe, Next and Skip all work; Android back on Welcome returns to Intro; each page keeps its own dots as in the mockup. Spec §14 A1b/A2 and §26.2/§26.3 updated.
- The map label "DOMLUR" was repositioned so a pin doesn't cover it.

**M2 status:** ✅ Done. A new Google account goes Welcome → Setup → Home; username rules are enforced; delete account removes the user; profile privacy tests pass. The Android launcher name changes from "Thinnava?! (dev)" to "Thinnava (dev)" on the next native rebuild.

**Credits research (owner question)**
- The **$300 free trial** is real: no billing during the trial and no auto-upgrade, but it can't pay for Gemini in AI Studio. It will be used for `thinnava-maps` in M3.
- **Google AI Pro** gives $10 of Cloud credit a month through the Developer Program, usable on Cloud and Maps Platform. Useful only if the owner already subscribes; not to be bought.
- "Free AI Pro for Indian students" couldn't be confirmed officially.

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
- **Pushed** `main` to GitHub (owner approved) and deleted the merged remote branch `docs/copy-flow-onboarding`. The local safety branch `backup-before-merge` was then deleted at the owner's request.

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

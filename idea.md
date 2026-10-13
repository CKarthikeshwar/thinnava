# Thinnava — Idea Scratchpad

> **This is a living draft for thinking out loud. It is not a spec or a final product.**
> Everything here can change, contradict itself, or get thrown away. Sections are a starting structure to hang thoughts on, not commitments.
>
> - ⚠️ = known constraint from research so far
> - ❓ = open question / undecided
> - 💭 = raw thought, not yet thought through
>
> **Settled decisions now live in `spec.md` (source of truth) and `changelog.md`.** This file stays the place for raw thoughts.
>
> Working name: *Thinnava* (Telugu for "Did you eat?"). Built by a team of 2.

---

## 0. Shower thoughts / parking lot 💭

Dump new ideas here first; move them into the sections below once they make sense.

- 
- 

---

## Design north star: intuitive, clear, clutter-free, frictionless

Every screen and flow is judged against this first:

- **Intuitive**: someone opening the app for the first time knows what to do without a tutorial.
- **Clear**: one obvious primary action per screen; plain words, no jargon.
- **Clutter-free**: show only what helps the decision at hand. When in doubt, leave it out or tuck it behind a tap.
- **Frictionless**: fewest taps possible. Smart defaults (today's date, nearby places, last-used values); optional fields stay optional; logging a visit or a friend's experience should take seconds.

If a feature makes the app noticeably more complex to use, it needs a very good reason to exist.

---

## 1. One-line pitch

**Your friends' food experiences, organized.**

A social food memory app: connect with people whose taste you trust, see where they've eaten and what they thought, log what friends tell you about places they've been (WhatsApp, in person, anywhere) and things you find on the internet, and jump straight to Google Maps / Swiggy / Zomato when you decide to go or order.

### Key idea: friends share experiences, they don't "recommend"

A friend tells you about **their experience** at a place — what they ate, what was good, what wasn't, what it cost. They aren't recommending it to you. **You** decide whether to go based on their review. The app is built around collecting and organizing those experiences.

### What it is not

- Not "Instagram for food": no photos, no influencer feed, no likes-chasing.
- Not Zomato/Google reviews: ratings from strangers aren't the main signal. They're only shown when none of your friends have been to a place.
- Not "people nearby" discovery: the network is **people you actually know and have connected with**.
- Not a group/community app: no groups.

### The hook

> **"Heard about a good place? Share it here."**

Friend tells you about a place in a chat → **Share → Thinnava** → AI pulls out the place, dishes, price and how they found it → you add who told you, confirm/edit → it lands on your home timeline and map.

---

## 2. The problem

1. Friends talk about places they've eaten at all the time — in WhatsApp chats, DMs, in person. That information gets lost in scroll.
2. When you actually want to eat out, you can't remember who went where, or which dish they said was good.
3. Public ratings (4.3★ from 2,000 strangers) don't tell you whether **you** will like it. Your friends' experiences do.
4. Deciding and acting is fragmented: Google Maps for directions, Zomato/Swiggy for ordering, notes app for lists, chats for experiences.

---

## 3. The three layers of the product

### Layer 1 — My food life (personal)
A record of:
- places I've **visited** (each visit separately, with date)
- places I **want to try** (wishlist)
- what I **loved** and **didn't like** there
- my review (Good / Okayish / Bad), what I spent per person, who I went with, notes

Useful even with zero connections on the app.

### Layer 2 — My connections (social)
I connect with people I know (mutual, request-based). For each connection I can see (subject to the audience they chose, see §12):
- where they've been and their review
- what they loved / didn't like
- what they paid per person
- their wishlist

I can't see anything about people I'm not connected with.

### Layer 3 — What friends tell me, and what I find online
Whatever a friend tells me through another app or in person, I log myself. **These entries are always private to me**, whether or not that friend is on the app. If the friend is one of my connections, I can optionally **link** the entry to their profile.

Internet finds (reels, videos, blogs, Maps links) are logged the same way.

---

## 4. Core concepts (vocabulary)

Keeping these separate keeps the UX honest and the data clean.

| Concept | Meaning | Who authors it |
|---|---|---|
| **Place** | A real restaurant/cafe/stall/cloud kitchen **that exists on Google Maps**, anchored to a Google Place ID. Places not on Google Maps can't be added (for now). | System (from Google Places) |
| **Visit** | "I went to this place on this date". One per trip; repeat visits are new Visits | Me |
| **Review** | My opinion attached to my Visit: Good/Okayish/Bad, loved / didn't like, price per person, notes. Posted on the app, visible to the audience I choose. | Me (or a connection, on their own Visit) |
| **Friend-reviewed entry** | What a friend told me about **their** experience at a place, logged by me. Always **private to me**. | Me, on behalf of a friend |
| **Internet-suggested entry** | A place I found online (reel, short, blog, Maps link), logged by me. Always **private to me**. | Me |
| **Wishlist item** | A place I want to try | Me |
| **Companion tag** | Someone I went with: a connection (must accept by adding their own review) or a private name ("Mom") | Me |
| **Connection** | A mutual link between two app users, made through a request and an accept | Both users |
| **Audience list** | Snapchat-style list of my connections ("All connections", or curated ones like "Close friends") used to choose who sees a review | Me |
| **Friend name** | My private list of friend names used for friend-reviewed entries ("Rahul", "Rahul K"). Autocompletes, can be merged, can be linked to a connection. | Me |

Dishes are **not** a separate thing. They only appear as free text in the "Loved" / "Didn't like" fields. There are no dish pages, no dish counts, and no dish search.

### Entry types — the three kinds of entry I make

```
✍️ My visit           — I went there myself. Posted on the app to my chosen audience.
👤 Friend reviewed    — A friend told me about their experience. Private to me.
                        (🔗 if linked to a connection's profile; one tap opens it)
🌐 Internet suggested — Found online. Private to me.
```

Plus what I see from others:

```
👥 Connection         — A connection's own visit/review, posted by them on the app.
```

Friend and internet sources are **never mixed**.

### AI honesty rule

A WhatsApp message I import becomes **"Rahul's experience — logged by you"**. It never becomes **"Rahul's review"**, even if Rahul is linked. Only what Rahul posts on the app is Rahul's review. The original message is shown on the confirmation sheet while you check, then **discarded**; it isn't stored. Internet entries keep their **original link**.

---

## 5. Who is this for

- **The planner**: keeps a list of places to try and wants to remember who said what about them.
- **The follower**: doesn't research much, just wants "where have my friends been that they liked?"
- **The foodie friend**: the one everyone asks; has a profile their connections can browse.

Initial target: college students / young professionals in Indian cities (Bengaluru first, but works anywhere), INR pricing, Android only.

---

## 6. Key user journeys

### Journey A — Log a friend's experience from WhatsApp (the hero flow)

1. Rahul messages: *"Went to Burger Factory in Koramangala yesterday. Chicken burger was insane, shake was meh. ~300 each."*
2. I long-press the message → **Share** → **Thinnava**. (If I'm logged out, I sign in first and then the import continues.)
3. Thinnava opens a lightweight import sheet: *"Reading this…"* (1–3 s).
4. **Confirmation sheet** shows what was found. **Every field is editable and can be filled in manually:**
   ```
   Source                👤 Friend  ·  🌐 Internet
   👤 Friend's name      [ required — type or pick ]   [link to connection]
   📍 Place              Burger Factory, Koramangala   [change]
   ⭐ Review             Good  ·  Okayish  ·  Bad  ·  —
   ❤️ Loved              Chicken burger                 [+ add]
   👎 Didn't like        Shake                          [+ add]
   💰 Price / person     ₹300
   📅 When they went     yesterday → Oct 10
   ── Shared message (for checking, not saved) ──
   "Went to Burger Factory in Koramangala yesterday…"
   ```
   - **The friend's name is never auto-filled** (WhatsApp shares don't include the sender). It starts blank and **Save stays disabled** until I either enter a friend name (autocompleted from my private friend-name list) or switch the source to 🌐 Internet.
   - Fields the AI couldn't find are left **empty**, not guessed.
   - Low-confidence fields are visually flagged on the sheet. **Confidence is only used on this sheet and is discarded on save.**
   - If several Google places match, the sheet shows a short candidate list with map thumbnails. If the place isn't on Google Maps, it can't be saved (for now).
   - **One message, several places** → one confirmation sheet per place, each with **[Save]** and **[Discard]**.
5. I tap **[Save]**, and optionally **[Save + add to Wishlist]**.
6. The entry appears on my **Home** timeline as 👤 Rahul, visible only to me.

If the AI fails, is slow, or the text isn't about food → *"Couldn't find a place"* and the manual form opens with whatever was found already filled in.

### Journey A′ — Same thing, fully manual
**+** → **Log a friend's experience** → same form, empty, no AI. Every field the AI can fill can also be typed by hand. AI is a shortcut, never a requirement.

If my clipboard has text when I open this, the app offers a one-tap **"Use copied text?"**.

### Journey B — Log my own visit

1. **+** → **Add Visit** → search place (Google Places autocomplete, nearby first if location is allowed).
2. Quick form (should take < 30 s):
   - Date (defaults to today)
   - Review: Good · Okayish · Bad
   - Loved / Didn't like (free text chips)
   - Price per person (₹, optional)
   - Who I went with (tag connections and/or add private names)
   - Notes (optional)
   - **Audience**: All connections (default) or one of my lists
3. Save → appears on my timeline and on the timelines of the audience I chose.
4. If I tagged connections, they get a tag request (see §9).
5. If the place was on my wishlist, it moves to Visited automatically.

Entries can be **edited or deleted** later.

### Journey C — "Where should we eat tonight?"

1. Open **Map** → filter **Connections** + **₹₹** + **Cafe**.
2. Pins show places with entries; tapping shows a mini-card: *"Ananya, Rahul went · Loved: cold brew · ~₹350/pp"*.
3. Open place page → see who went, what they loved, what they paid.
4. Act: **Directions (Google Maps)** · **Swiggy** · **Zomato** · **District** (each only if the place is listed there) · **Add to Wishlist**.

### Journey D — Browse a connection's profile

1. Open Ananya's profile (only possible if we're connected) → bio, her map, her recent visits, her wishlist.
2. Filter her map: **Visited / Wishlist**.
3. One tap to add any of those places to my own wishlist.
4. Not connected? I only see name + photo + **[Request to connect]**.

### Journey E — Search a place

1. Search **"Meghana Foods"** (search is places only).
2. **If anyone I know has been:** *"Ananya, Arjun and Rahul have been here"* with each person's review, loved / didn't like and price.
3. **If no friend info exists:** show Google Maps info: rating, number of reviews, address, hours, price level, category. Plus **[Add to Wishlist] [Add Visit] [Directions] [Order]**.

### Journey F — Import from internet (reel / short / Maps link)

1. Share an Instagram Reel / YouTube Short / Google Maps link to Thinnava.
2. App receives the URL (and any shared text).
3. Best-effort extraction:
   - **YouTube** → title/description via API → AI extraction.
   - **Google Maps link** → resolve to a Place directly.
   - **Instagram** ⚠️ → may only get the URL. Prompt: *"Paste the caption"* (or fill manually).
4. Same confirmation sheet, source 🌐 Internet. The original link is saved and tappable.

### Journey G — Screenshot import *(v2, later)*

Share/upload a screenshot → OCR → AI extraction → place matching → same confirmation sheet. Not in v1.

---

## 7. Screens & navigation

Bottom navigation (5 tabs):

```
 [ Home ]  [ Search ]  [ + ]  [ Map ]  [ Profile ]
```

**+** fans out 3 circles: *Add visit · Log a friend's experience · Log an internet find*. Wishlist is added from a place page.

Light mode only. English only.

### 7.1 Home — the timeline
A single timeline of **entries**, newest first, sorted by **when the entry was made**. **One item per entry.** If Ananya and Arjun both went to MTR, that's **2 items** on Home. Aggregation happens on the place page / search, not on Home.

Each card:
```
👥 Ananya · Burger Factory, Koramangala         2h ago
Good · ❤️ Chicken burger · 👎 Shake · ₹300/pp
```
Tapping a connection's name, or a linked friend's name, opens their profile.

**Filter icon** (top right):

| Filter | Shows |
|---|---|
| **All** | everything below |
| **Connections** | reviews my connections posted on the app (👥) |
| **From friends** | friend-reviewed entries I saved (👤 / 🔗) |
| **Internet** | internet-suggested entries I saved (🌐) |
| **Mine** | my own visits (✍️) |

Entries I log from friends or the internet are **private**: they show on **my** Home only.

**Empty state** (new user, nothing yet): a short prompt with two buttons: **"Log a place you've been"** and **"Share something a friend told you"**, plus **"Find people"**.

### 7.2 Map — food memory map
One map, multiple layers, distinct pin styles:

```
●  Visited (me)
♡  Wishlist (me)
👥 Connections
👤 From friends
◉  Internet
```

Filters: layer · price per person · category · specific connection.
Bottom-sheet list view of whatever is on screen.

### 7.3 Place page

**With entries:**
```
Burger Factory
Koramangala · Fast food · Google 4.2★

YOUR HISTORY
  Jan 2027 · Good     Sep 2026 · Okayish

PEOPLE WHO'VE BEEN
  👥 Ananya   Good   Loved: Peri peri fries      (with Arjun)
  👤 Rahul    Good   Loved: Chicken burger · Didn't like: Shake
  🌐 Reel     Good   Loved: Chicken burger                         [open link]

[ Directions ] [ Swiggy ] [ Zomato ] [ District ]   (only the apps that list this place)   [ ♡ Wishlist ] [ + Add visit ]
```
No summary counts (e.g. "2 Good · 1 Okayish") and no dish tallies. Just the people and what they said.

**Without any entries:** Google Maps info only (rating, review count, address, hours, price level, category) and the same action buttons.

**Closed places** stay in the app with a "Permanently closed" label.

### 7.4 Profile
- **Fields:** name *(required)*, username *(required)*, bio *(optional)*. Photo comes from the Google account.
- **Mine:** map, visited list, wishlist, friend/internet entries I've logged, private friend names, private companion names, **audience lists**, connections.
- **A connection's:** bio, map, visits/reviews they shared with me, wishlist. 🔔 activity notifications toggle (off by default). Remove connection. Block.
- **Not connected:** name + photo + **[Request to connect]** only.
- **Settings:** delete account (required by Google Play policy for apps with accounts), sign out.

### 7.5 Search
**Places only.** Results show the "who's been here" view, or Google info if nobody I know has been. No dish or food search, which would get complicated.

Search has two segments: **Places** and **People** (username lookup to send connect requests), with filters on results. Anyone can look up a username, but they only see name + photo. No invite links.

### 7.6 Import / confirmation sheet
Covered in Journey A. Fast, every field editable/manual, friend name required, shows the shared message for checking (not saved).

### 7.7 Notifications
On by default (only things that need me):
- *Ananya sent you a connect request* / *accepted your request*
- *Ananya tagged you at Bao Story* → **Add your review / Reject**

Opt-in per connection (🔔 on their profile, off by default):
- *Ananya visited Bao Story*
- *Ananya visited a place on your wishlist*

---

## 8. Ratings & price

- **One rating scale everywhere: Good · Okayish · Bad.** This applies to my own visits, connections' reviews, and friend/internet entries. No stars.
- Friend/internet entries may also be **— (none)** when the message says nothing about how they found it.
- Google's star rating is only shown as Google's info (e.g. "Google 4.2★"), never as our scale.
- **Price is always per person (₹)** and always optional. No "for two" input, no totals.

---

## 9. Going with people — companion tags

Works like **Instagram collaborative posts**.

- When I add a visit, I can tag who I went with:
  - **Connections only** → they get a tag request. Non-connections can't be tagged; add them as a private name instead.
  - **Private names** ("Mom", "Dad") → only visible to me; they never become accounts.
- Tags can be added **after the fact** (editing an old visit).
- **Accepting a tag means adding your own review.** When A tags B, B's options are:
  - **[Write my review]** → B fills in their own review.
  - **[Same as A's]** → one tap copies A's review (rating, loved / didn't like, price, notes) into **B's own** review, which B can edit later. It's B's copy and belongs to B.
  - **[Reject]** → the tag disappears.
- Accepting creates B's own Visit (same place, same date) with B's review. Each review is separate and belongs to its author.
- A pending tag is only visible to the tagger. A tagged person can **un-tag themselves later**.
- **Disconnecting** doesn't remove past tags. Each person just stops seeing the other's content.

### Visibility example

A and B are connected. B and C are connected. **A and C are not connected.**
A and B go to a restaurant together, tag each other (accepted), and each has a review.

| Viewer | Sees |
|---|---|
| **B** | own review; A's review (if A's audience includes B); "with A" |
| **A** | own review; B's review (if B's audience includes A); "with B" |
| **C** | **B's** review (if B's audience includes C), showing *"with A"*. That's A's name only; tapping it leads to "Request to connect". |
| **C** | **Not** A's review, rating, dishes, or anything else of A's |

Rule: **you see a person's content only if you're connected to them and in the audience they chose.** A tag only reveals the tagged person's name, and only after they've accepted the tag.

---

## 10. AI extraction — how it should behave

**Output structured data, never prose.** Target schema (draft):

```json
{
  "place_candidates": [{ "name": "", "area": "", "city": "" }],
  "review": "good | okayish | bad | null",
  "liked_dishes": [],
  "disliked_dishes": [],
  "price_per_person": null,
  "visit_date": null,
  "confidence": { "place": 0.0, "review": 0.0, "price_per_person": 0.0 }
}
```

(Returns an **array** of these when a message mentions several places.)

Rules:
1. **Never invent.** Unmentioned → `null`. "Paneer tikka was great" says nothing about the price or the other dishes.
2. **No source person.** The friend's name is never extracted; the user enters it (§6, Journey A).
3. **`confidence` is sheet-only.** It's used to flag uncertain fields on the confirmation sheet and is **not stored** after the final save.
4. **Place resolution is separate.** The LLM proposes names/areas; Google Places resolves them to real Place IDs.
5. **Human confirmation is mandatory** before anything is saved.
6. **Everything is manually editable**, and the whole form works without AI.
7. **English only** (including casual Indian-English chat style and ₹ shorthand like "3 each", "500 ish"). If the message gives a total for a group, convert to per person on the sheet and let the user correct it.

---

## 11. Ordering, booking, directions

The goal is **"I've decided — take me there"**, not rebuilding ordering.

- **Directions** → Google Maps URL (no API key needed).
- **Swiggy / Zomato / District** → each button is shown **only if the place is listed on that app**. If a restaurant is on Swiggy and Zomato but not District, only Swiggy and Zomato appear. No dead buttons, no search fallback. District replaces the old "Book a table".
- ⚠️ Feasibility: this needs a reliable way to know whether a place is listed on each app (and its listing link). Swiggy has a developer program (needs an application); Zomato's and District's public APIs are partner/POS-only. Options to explore: Swiggy's API, a periodically refreshed mapping table, or letting users add/confirm a listing link. Verify before building.
- No in-app cart, payments or ordering.

---

## 12. Privacy, audience & social rules

- **Connect = mutual.** A sends a request → B accepts or declines. No one-directional follow, no open connect.
- **No connection, no content.** Non-connections see only name + photo.
- **Audience lists (Snapchat-style):**
  - **All connections** is the default list; everyone I connect with is in it automatically.
  - I can create **curated lists** ("Close friends", "College", "Family"…) containing chosen connections.
  - **When a new connection is made**, the app shows all my lists and lets me tick which ones to add them to (skippable).
  - Each **visit/review** has an audience: All connections (default), or **one or more** lists.
  - The **wishlist** also follows my lists: I choose which lists can see it.
  - **Only me**: share with an empty list (a list with nobody in it).
- **Wishlist** is visible to the lists I choose. Adding a place to my wishlist notifies no one. When I look at a wishlisted place, I can see on its place page which connections have reviewed it.
- **Friend-reviewed and internet-suggested entries are private to me**, always, whether or not the friend is on the app.
- **Linking a friend name** to a profile is only possible for **connections**. Linking doesn't share the entry with them.
- **Companion tags** follow §9.
- **Block**: a blocked user can't find me, request me, or tag me. Blocking also removes the connection.
- No "people nearby", no stranger discovery, no groups, no contact-based friend finding.

---

## 13. Onboarding & sign-in

1. **Welcome**: 3 swipeable slides (decided), with the chef-cat mascot, the "how to share" hint, and **Continue with Google**.
2. **Sign in with Google** (decided, see §14).
3. **Set up profile**: name + username required (live "available / taken" check, no suggestions), bio optional.
4. **Home** with empty-state prompts (§7.1), including "Find people".

Permissions (location, notifications) are asked in context, not during onboarding. Full screen list in §19 A.

---

## 14. Phone OTP vs Email OTP — comparison & pricing

> **✅ Decision: Google Sign-In only.** It's free, one tap on Android, involves no OTP codes or SMS/DLT hassle, and fits the frictionless goal. Phone and email OTP are not used; the comparison below is kept for reference.
>
> Prices as of Oct 2026 from public pricing pages / comparison articles. ₹ figures use ~₹83/$.

### 14.1 Phone (SMS) OTP options

| Option | Price per OTP (India) | Free tier | Setup effort | Notes |
|---|---|---|---|---|
| **Firebase Phone Auth** | **~$0.07 ≈ ₹6 per SMS** | Only **test numbers** (fictional numbers set in console), up to 10/day. No free real SMS. | Easy, SDK does everything | Requires **Blaze (pay-as-you-go) plan** with billing account since Sept 2024. |
| **Twilio Verify** (works with Supabase) | **$0.05 per successful verification ≈ ₹4.2** + SMS channel fee | Trial credit only | Easy, native Supabase provider | Billed in USD. Failed/undelivered SMS attempts are still billed. |
| **MSG91** (Indian provider) | **~₹0.15–0.25 per SMS** depending on volume | None meaningful | Medium. Needs a Supabase **Send SMS hook** | Cheapest. ⚠️ Needs **DLT registration** (TRAI rule): entity + sender ID + template approval. |
| **Firebase Phone Number Verification** (SIM-based, no SMS) | Tiered by region | Test mode only | — | ⚠️ **Not available in India**. |

### 14.2 Email OTP / magic link options

| Option | Price | Free tier | Notes |
|---|---|---|---|
| **Supabase Auth, default email** | Free | ⚠️ **2 emails/hour**, only to **project team members** | Dev only. |
| **Supabase Auth + Resend (custom SMTP)** | Free tier | **3,000 emails/month, 100/day** | Needs a domain you own. |
| Supabase + Brevo | Free tier | ~300/day | Alternative. |
| Supabase + AWS SES | ~$0.10 per 1,000 emails | 3,000/month free (first year) | More setup. |
| **Firebase email link / email-password** | Free | Free MAU tier | Magic link, no code. |
| **Google Sign-In** | Free | — | One tap on Android. ✅ Chosen. |

---

## 15. Scope (current leaning — not locked)

### MVP (v1)
| # | Feature |
|---|---|
| A | Google Sign-In; profile (name, username, optional bio); delete account |
| B | Connect requests: send / accept / decline / remove; block |
| C | Audience lists (All connections + curated lists); pick lists when a connection is made |
| D | Places via Google Places (Google-listed places only; Google info shown when nobody I know has been) |
| E | Add / edit / delete Visit + Review (Good/Okayish/Bad, loved / didn't like, price/person, companions, notes, audience) |
| F | Companion tagging: accept by reviewing (or "Same as A's"), reject, un-tag, tag after the fact |
| G | Friend-reviewed entries (manual + AI-assisted); private friend-name list; link to connection |
| H | Internet-suggested entries (URL saved) |
| I | Wishlist (audience = my lists) |
| J | Home timeline (one item per entry, by time) + filters: Connections / From friends / Internet / Mine |
| K | Place page with "who's been here" |
| L | Map with layers + filters |
| M | Android share target: text, URL |
| N | AI structured extraction (multi-place) + confirmation sheet |
| O | Directions + Swiggy / Zomato / District buttons, each only if the place is listed there |
| P | Notifications: connect requests + tags by default; activity opt-in per connection |
| Q | Offline support for manual entries (see §16) |

### Phase 2 (later)
- Screenshot import (OCR → extraction)
- YouTube Shorts import via metadata
- Places that aren't on Google Maps (custom places)
- Place collections (named lists of places, e.g. "Late-night food")
- Revisit nudges ("You heard about this from Rahul 3 months ago — been yet?")

### Probably NOT building (revisit anytime)
- ❌ Auto-importing someone's entire Google Maps review history (no supported API for a person's reviews)
- ❌ Auto-downloading Instagram reels
- ❌ Auto-transcribing arbitrary YouTube videos (captions API needs owner permission)
- ❌ In-app ordering / payments
- ❌ "People nearby" / stranger discovery
- ❌ Groups
- ❌ Contact-based friend finding (username lookup + invite links instead)
- ❌ Veg / non-veg info and filters
- ❌ Photos on visits/reviews
- ❌ Dishes as entities: no dish pages, dish counts or dish search
- ❌ Rating summaries on the place page
- ❌ In-app "send a recommendation to a friend": friends share experiences, they don't recommend
- ❌ AI chatbot, taste matching, recommendation algorithms
- ❌ Creator / influencer features
- ❌ iOS, dark mode, languages other than English (for now)

---

## 16. Feasibility notes (from research so far)

| Area | Note |
|---|---|
| Distribution | **Installable APK** shared with testers (no Play Store needed). Android only. |
| Android share target | Native `ACTION_SEND` intent supports text and URLs. Needs native config in an Expo/React Native app. |
| Google Places | Place IDs, name, address, coordinates, category, rating, hours. India pricing has generous free monthly thresholds, so course scale should cost ₹0. ⚠️ Google's terms generally allow storing only the **Place ID** indefinitely; other place details must be re-fetched rather than stored long-term. |
| Google Maps URLs | No API key needed for "open in Maps". |
| Google reviews by a user | ⚠️ Not available via API. Use share/paste instead. |
| YouTube | `videos.list` gives title/description cheaply. Captions of others' videos aren't downloadable. |
| Instagram | ⚠️ Only the URL is reliable. Ask the user for the caption, or let them fill it in manually. |
| Swiggy / Zomato | A launch/deep link is enough. Swiggy has a developer program; Zomato's APIs are aimed at partners/POS. |
| Offline | Manual entries (visits, friend entries, wishlist, edits) are saved locally and sync when back online. ⚠️ Google place search needs internet. Offline, I can pick from places already in the app, or save a draft with a typed place name and resolve it when back online. A draft that never resolves to a Google place **stays an offline draft on the device**; it isn't synced or shown to anyone until it's fixed. AI extraction also needs internet; offline shares are queued. |
| Clipboard | "Use copied text?" reads the clipboard only when the user opens the form (Android 12+ shows a "pasted from clipboard" toast). |
| LLM | Gemini free tier or similar for extraction; must return JSON. |

---

## 17. Open questions ❓

1. ⏳ App name, branding, logo: later.

### Decided (log)
- Wishlist follows audience lists.
- A review can go to one or more lists; "only me" = an empty list.
- Offline drafts that never resolve to a Google place stay offline on the device.
- Home "Connections" and "From friends" are separate filters.
- Friend-reviewed and internet-suggested entries are private, always.
- One rating scale everywhere: Good / Okayish / Bad. No rating summaries.
- Auth: Google Sign-In only. No contact-based friend finding.
- No veg info, no photos, no dish entities, search is places only.
- Places must be on Google Maps (custom places → v2).
- Friend name is required and never auto-filled.
- Accepting a tag = adding your own review (or "Same as A's").
- Categories: Restaurant, Cafe, Bakery, Dhaba, Tea shop, Fast food, Dessert, Bar, Street food, Delivery-only / Cloud kitchen.
- Tags can be added after the fact; tagged people can un-tag themselves.
- English only, light mode only, Android only, APK distribution, real users for the demo.

---

## 18. Success criteria for the demo

1. **Share-to-app**: share a WhatsApp message → confirmation sheet → add friend name → entry appears on Home and on the place page.
2. **Connections**: send a connect request → accept → put them in a list → open their profile and map → tap a place and see their review.
3. **Collab tag**: A tags B → B accepts with "Same as A's" → C (connected only to B) sees "B went with A" but not A's review.
4. **Audience**: a review shared with "Close friends" is invisible to a connection outside that list.
5. **Fallback**: search a place nobody has visited → Google info shows.
6. **Act**: from a place page, open Google Maps directions and Swiggy in one tap.

---

## 19. UI screen inventory (to design one by one)

> Every screen, sheet and key state the app needs, based on everything above. Status: ⬜ not designed · 🟨 in progress · ✅ designed.
> "Sheet" = slides up from the bottom over the current screen; "Dialog" = small confirm popup.

### A. Launch, sign-in & onboarding

Goal: **under a minute from install to "I get it"**. Permissions are asked **in context** (when a feature first needs them), not up front.

| ID | Screen | Type | Purpose | Status |
|---|---|---|---|---|
| A1 | Splash | Screen | Chef-cat logo while the session loads; routes to Welcome (new) or Home (signed in) | ⬜ |
| A2 | Welcome | Screen | ✅ **3 swipeable slides** (decided; 1-screen option dropped). Includes the "how to share" hint (WhatsApp long-press → Share → Thinnava). **Continue with Google** always visible | ⬜ |
| A3 | Set up profile | Screen | Name (prefilled from Google), username (**no suggestion**; as you type it checks and says "available" / "taken"), optional bio | ⬜ |
| A7 | Permission explainers | Dialog (in context) | Location: first time you open Map or the place picker. Notifications: first time you send a connect request or tag someone. App still works if denied | ⬜ |

Removed: ~~A4 Find your friends~~, ~~A5 Try it~~, ~~A6 How to share~~ (merged into A2), ~~A8 Invite landing~~ (no invite links).

### B. Main tabs
| ID | Screen | Type | Purpose | Status |
|---|---|---|---|---|
| B1 | Home | Tab | Time-sorted timeline of entries, one card per entry | ⬜ |
| B1a | Home: empty state | State | New user: "Log a place you've been" · "Share something a friend told you" · "Find people" | ⬜ |
| B1b | Home filter | Sheet | All · Connections · From friends · Internet · Mine | ⬜ |
| B2 | Map | Tab | Pins by layer; list of what's on screen | ⬜ |
| B2a | Map filters | Sheet | Layers, price per person, category, specific connection | ⬜ |
| B2b | Map pin card | Bottom sheet | **Slides up from below** when a pin is tapped: place name, who went, what they loved → open place page | ⬜ |
| B3 | Add (+) | Speed-dial | Tapping + fans out **3 circles**: Add visit · Log a friend's experience · Log an internet find. (Wishlist is added from a place page, not here.) | ⬜ |
| B4 | Search | Tab | Search **places** and **people** (two tabs/segments), with filters on results (category, price, who's been) | ⬜ |
| B5 | My profile | Tab | Bio, my map, tabs: Visited · Wishlist · Saved (friend + internet entries); links to Connections, Lists, Settings | ⬜ |

### C. Places & entries
| ID | Screen | Type | Purpose | Status |
|---|---|---|---|---|
| C1 | Place page | Screen | Your history, people who've been, action buttons (Directions, plus Swiggy / Zomato / District only where listed; Wishlist, Add visit) | ⬜ |
| C1a | Place page: Google-only state | State | Nobody I know has been → Google rating, hours, address, price level, category | ⬜ |
| C1b | Place page: closed state | State | "Permanently closed" label | ⬜ |
| C2 | Entry detail | Screen | One entry in full: review, loved/didn't like, price, notes, "with …", date; for internet entries the original link (friend messages are not stored) | ⬜ |

### D. Creating & editing entries
| ID | Screen | Type | Purpose | Status |
|---|---|---|---|---|
| D1 | Place picker | Screen | Google place search, nearby first, recently used; offline: places already in the app or "save as draft" | ⬜ |
| D2 | Add / edit visit | Screen | Date, review, loved / didn't like, price/person, who I went with, notes, audience | ⬜ |
| D3 | Companion picker | Sheet | Tag connections + add private names | ⬜ |
| D4 | Audience picker | Sheet | Multi-select lists (All connections default) ❓ built-in "Only me" or empty list | ⬜ |
| D5 | Log friend / internet entry (manual) | Screen | Source toggle (Friend / Internet), friend name (required) or link, place, review, loved / didn't like, price, when they went | ⬜ |
| D6 | Friend name picker | Sheet | Autocomplete from my private friend names; add new; link to a connection | ⬜ |
| D7 | Share import: reading | Screen/Sheet | "Reading this…" while AI runs; failure → "Couldn't find a place" → D5 prefilled | ⬜ |
| D8 | Confirmation sheet | Screen | AI result for one place, low-confidence flags, shared message for checking (not saved), Save / Discard; "1 of 3" when several places | ⬜ |
| D9 | Add to wishlist | Sheet | Pick place (via D1) → saved; wishlist audience follows my lists | ⬜ |
| D10 | Delete entry | Dialog | Confirm delete | ⬜ |

### E. People & connections
| ID | Screen | Type | Purpose | Status |
|---|---|---|---|---|
| E1 | Connection's profile | Screen | Bio, their map (pins of places they've visited + wishlisted, only what they share with me), visits/reviews shared with me, wishlist; 🔔 activity toggle; ⋯ menu (lists, remove, block) | ⬜ |
| E2 | Non-connected profile | Screen | Name + photo + Request to connect (or "Requested" / "Accept") | ⬜ |
| E3 | Connections | Screen | Tabs: Connections · Requests (incoming / sent) | ⬜ |
| E4 | Find people | Screen | Username search (same as Search → People). No invite links | ⬜ |
| E5 | Add to lists | Sheet | Shown when a connection is made: tick which lists to add them to (skippable) | ⬜ |
| E6 | My lists | Screen | All my audience lists + create new | ⬜ |
| E7 | List detail / edit | Screen | Rename, add/remove members, delete list | ⬜ |
| E8 | Tag request | Screen | "A tagged you at X": Write my review · Same as A's · Reject | ⬜ |
| E9 | Remove connection / Block | Dialog | Confirm, with what it means | ⬜ |

### F. Notifications, settings & housekeeping
| ID | Screen | Type | Purpose | Status |
|---|---|---|---|---|
| F1 | Notifications | Screen | Connect requests, tag requests, opt-in activity | ⬜ |
| F2 | Settings | Screen | Edit profile, my friend names, my private companion names, offline drafts, sign out, delete account | ⬜ |
| F3 | Edit profile | Screen | Name, username, bio | ⬜ |
| F4 | My friend names | Screen | Rename, merge manually (no automatic duplicate suggestions), link/unlink to a connection | ⬜ |
| F5 | My companion names | Screen | Private names like "Mom"; rename/delete | ⬜ |
| F6 | Offline drafts | Screen | Drafts waiting to sync or waiting for a place match | ⬜ |
| F7 | Delete account | Dialog/Screen | Explain what's deleted, confirm | ⬜ |
| F8 | Offline banner | State | Small "You're offline — changes will sync" strip | ⬜ |

**Design phases** (one palette shared by every screen):

| Phase | Screens | Status |
|---|---|---|
| **1. Identity & main tabs** | A1 Splash, A2 Welcome (3 slides, decided), A3 Set up profile, B1 Home (+ empty state, filter), B2 Map (+ pin sheet), B3 Add speed-dial, B4 Search, B5 My profile. Decided: **Cobalt** palette, **Rings** background. Mockups in `design/phase1.html` | 🟨 |
| **2. Core loop** | C1 Place page (+ states), C2 Entry detail, D1–D10 (place picker, add visit, pickers, share import, confirmation sheet, manual entry). Mockups in `design/phase2.html` | 🟨 |
| **3. Social & housekeeping** | E1–E9 (profiles, connections, lists, tag request), F1–F8 (notifications, settings, etc.), A7 permission dialogs. Mockups in `design/phase2.html` | 🟨 |

Motion: transitions designed in `design/motion.html` (clickable prototype); rules recorded in `DESIGN.md` → Motion.

References: `ui-references/` (1, 2 = onboarding layout; 7.png = chef-cat mascot; 3 = blue palette and glassy cards; 6, 7.jpeg, 8 = home and profile; 4 = settings; 5 = map).

---

## Sources (pricing research, Oct 2026)

- [Firebase Phone Number Verification pricing](https://firebase.google.com/docs/phone-number-verification/pricing)
- [MiniMoth vs Firebase OTP pricing for India](https://minimoth.dev/blog/minimoth-vs-firebase-otp-pricing-india/)
- [Firebase Auth pricing 2026 (Logto)](https://blog.logto.io/firebase-authentication-pricing)
- [Twilio Verify pricing & alternatives (Authgear)](https://www.authgear.com/post/twilio-verify-pricing-and-alternatives)
- [Best OTP providers 2026 (Authgear)](https://www.authgear.com/post/best-otp-service-providers/)
- [SMS OTP pricing India (Message Central)](https://www.messagecentral.com/blog/sms-otp-pricing-india)
- [MSG91 SMS pricing](https://msg91.com/in/pricing/sms)
- [Supabase custom SMTP docs](https://supabase.com/docs/guides/auth/auth-smtp)
- [Resend pricing](https://resend.com/pricing)

# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Stack

App: Expo / React Native + TypeScript, Supabase, Google Places/Maps, Gemini for extraction (decided; see `spec.md` Part B). UI design mockups: static HTML in the browser, phone-sized frames with a palette switcher (confirmed by the owner).

## Users

College students and young professionals in Indian cities (Bengaluru first). They hear about food places constantly from friends (WhatsApp, in person) and from reels, then forget who said what. Job: remember where friends ate and what they thought, keep a personal food diary and wishlist, and decide where to eat tonight.

## Product Purpose

Thinnava ("Did you eat?" in Telugu) is a social food memory app. Users log their own visits, privately save friends' experiences and internet finds (mostly via the Android share sheet with AI-assisted extraction they confirm), connect mutually with people they know, and jump out to Google Maps / Swiggy / Zomato. Success: when deciding where to eat, the answer "who I know has been there and what they thought" is one tap away.

## Positioning

Friends' experiences, not strangers' ratings or influencer feeds. Off-app friends are first-class: what a friend tells you in a chat becomes a structured, private entry in seconds. Connections are mutual and request-based; nothing is visible without a connection.

## Operating Context

Used on Android phones, often one-handed, often right after reading a WhatsApp message or while deciding where to go. English only, INR prices per person, Google Maps places only.

## Capabilities and Constraints

- Entry types: My visit (posted to chosen audience lists), Friend reviewed (private), Internet suggested (private), plus connections' own posts.
- One rating scale everywhere: Good / Okayish / Bad. Price per person, optional. No photos, no veg info, no dish entities.
- Audience lists (Snapchat-style): All connections by default plus curated lists; "only me" = an empty list.
- Companion tags work like Instagram collab posts; accepting a tag means adding your own review.
- Google Sign-In only. Light mode only. Offline support for manual entries.
- The full definition lives in `spec.md` (source of truth); `idea.md` is the brainstorm scratchpad.

## Brand Commitments

- Name (working): **Thinnava?!** with the "?!" punctuation.
- Mascot: a grey-blue chef cat (chef hat, neckerchief), source art at `ui-references/7.png`. The owner explicitly likes it and wants it kept.
- Palette: **Cobalt** blue (chosen by the owner). Background: flat ground with minimal **Rings** art (chosen); no gradients (owner rejected them as "vibecoded").
- Design north star: intuitive, clear, clutter-free, frictionless.

## Evidence on Hand

Reference images in `ui-references/` (1, 2 onboarding layout; 3 blue palette; 4 settings; 5 map; 6, 7.jpeg, 8 Beli-style home and profile; 7.png mascot). No real user data, testimonials or metrics; all demo content in mockups is synthetic.

## Product Principles

1. Fewest taps wins: smart defaults, optional fields stay optional.
2. Friends first: show people and what they said, never aggregate scores.
3. Honest AI: never invent, always confirm. Friend messages are not stored after confirming; internet entries keep their original link.
4. Private by default for anything the user logs on someone else's behalf.

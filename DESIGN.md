---
name: Thinnava
description: A friends-first food diary that feels like a friendly kitchen, not a review site.
colors:
  cobalt-blue: "#2350D9"
  deep-cobalt: "#16348F"
  on-primary: "#FFFFFF"
  pale-cobalt: "#DBE4FF"
  on-pale-cobalt: "#0E2266"
  mist: "#EEF2FF"
  surface: "#FFFFFF"
  surface-tint: "#E6ECFF"
  night-ink: "#10183A"
  slate-ink: "#46507A"
  muted-ink: "#5C668C"
  hairline: "#D9E0F7"
  scrim: "rgba(10,20,60,.42)"
  good-green: "#17703E"
  good-wash: "#DDF2E4"
  okayish-amber: "#845300"
  okayish-wash: "#FBEFD2"
  bad-red: "#A8301F"
  bad-wash: "#FADFDB"
  map-land: "#EEF1FB"
  map-water: "#BCCBF5"
  map-park: "#D3EBD6"
  map-road: "#FFFFFF"
  map-road-edge: "#D8DEF0"
typography:
  display:
    fontFamily: "Fredoka, system-ui, sans-serif"
    fontSize: "42px"
    fontWeight: 600
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Fredoka, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1.15
  title:
    fontFamily: "Fredoka, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.2
  title-place:
    fontFamily: "Fredoka, system-ui, sans-serif"
    fontSize: "17.5px"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  body-strong:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "15.5px"
    fontWeight: 800
    lineHeight: 1.25
  label:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 700
  button:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 800
rounded:
  chip: "10px"
  thumb: "14px"
  field: "16px"
  fab: "18px"
  card: "20px"
  panel: "24px"
  surface: "26px"
  sheet: "28px"
  hero: "30px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "14px"
  gutter: "18px"
  sheet: "22px"
components:
  button-primary:
    backgroundColor: "{colors.cobalt-blue}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    height: "52px"
  button-tonal:
    backgroundColor: "{colors.pale-cobalt}"
    textColor: "{colors.on-pale-cobalt}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    height: "52px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.cobalt-blue}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    height: "52px"
  button-small:
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "40px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.slate-ink}"
    rounded: "{rounded.chip}"
    padding: "0 13px"
    height: "34px"
  chip-selected:
    backgroundColor: "{colors.pale-cobalt}"
    textColor: "{colors.on-pale-cobalt}"
    rounded: "{rounded.chip}"
    height: "34px"
  review-good:
    backgroundColor: "{colors.good-wash}"
    textColor: "{colors.good-green}"
    rounded: "{rounded.pill}"
    height: "26px"
  review-okayish:
    backgroundColor: "{colors.okayish-wash}"
    textColor: "{colors.okayish-amber}"
    rounded: "{rounded.pill}"
    height: "26px"
  review-bad:
    backgroundColor: "{colors.bad-wash}"
    textColor: "{colors.bad-red}"
    rounded: "{rounded.pill}"
    height: "26px"
  card-entry:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "14px 14px 13px"
  text-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.night-ink}"
    rounded: "{rounded.field}"
    padding: "0 16px"
    height: "54px"
  nav-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.slate-ink}"
    height: "78px"
  nav-indicator:
    backgroundColor: "{colors.pale-cobalt}"
    textColor: "{colors.on-pale-cobalt}"
    rounded: "16px"
    width: "56px"
    height: "30px"
  nav-add:
    backgroundColor: "{colors.cobalt-blue}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.fab}"
    size: "52px"
  icon-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.night-ink}"
    rounded: "{rounded.pill}"
    size: "48px"
  bottom-sheet:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.sheet}"
    padding: "10px 0 30px"
  search-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted-ink}"
    rounded: "{rounded.pill}"
    padding: "0 8px 0 18px"
    height: "52px"
---

# Design System: Thinnava

## Overview

**Creative North Star: "The Friendly Kitchen"**

Thinnava is a food diary kept among friends, and the system is built to feel like a warm, uncluttered kitchen table rather than a review site. Every surface is about a person and what they said; nothing is about stars, photos or aggregate scores. The chef-cat mascot (the owner's own art, `ui-references/7.png`, used as alpha-matted cutouts `design/assets/cat-sitting.png` and `cat-peek.png`) is the brand and appears on identity moments: splash, welcome, profile setup and empty states, where the peeking cat's paws rest on the top edge of a card.

Structure is Android Material 3 (top app bar, navigation bar with pill indicator, chips, bottom sheets, segmented control), and the brand arrives through theming: a cobalt-blue role set, soft rounded white cards, Fredoka for the friendly display voice and Nunito for everything read. The page ground is flat. The owner rejected gradients as "vibecoded"; depth comes from white surfaces lifting off a pale cobalt ground with soft, diffuse shadows.

Density is relaxed and one-handed: 48px touch targets, 52px primary buttons, an 18px screen gutter, one obvious primary action per screen.

**Key Characteristics:**
- Flat pale cobalt ground with thin ring art in the corners; white rounded cards and list surfaces on top.
- Fredoka display (600) for wordmark, headings and place names; Nunito body with heavy weights (700/800) for names and labels.
- Material 3 skeleton, brand via colour roles; one role set shared by every palette.
- Good / Okayish / Bad review pills in fixed semantic green / amber / red.
- The chef cat on identity and empty moments only.

## Colors

A light, airy cobalt-blue world: one confident blue, a deep navy for weight, pale sky washes, and near-navy ink.

The palette is **Cobalt**, chosen by the owner after comparing Sky, Cobalt, Cerulean, Indigo and Denim (all on the identical role set; Masala and Pista were explored earlier). Only Cobalt is the system. Any future palette swap must fill the same roles and leave the review colours untouched.

### Primary
- **Cobalt Blue** (`cobalt-blue`): primary buttons, the + add button in the nav bar, focus rings on fields, the selected radio, the active onboarding dot, the user's own map pins and location dot. White text on it.
- **Deep Cobalt** (`deep-cobalt`): the wordmark, the welcome hero card, map cluster circles, icons inside source marks and thumbnails, and Continue with Google on the onboarding slides.

### Secondary
- **Pale Cobalt** (`pale-cobalt`) with **Deep Cobalt Ink** (`on-pale-cobalt`): tonal buttons, selected chips, the nav-bar active indicator, text selection.

### Neutral
- **Mist** (`mist`): the default page ground behind every screen.
- **Surface** (`surface`): cards, list surfaces, sheets, nav bar, inputs, icon buttons.
- **Surface Tint** (`surface-tint`): source-mark circles, thumbnails, segmented-control track, tip banners.
- **Night Ink** (`night-ink`): headings, names, place names, primary text.
- **Slate Ink** (`slate-ink`): body copy, chip text, inactive nav labels.
- **Muted Ink** (`muted-ink`): meta lines, timestamps, "Only you", placeholders, legal.
- **Hairline** (`hairline`): field strokes, chip strokes, dividers, nav-bar top border, sheet handle.
- **Scrim** (`scrim`): behind bottom sheets.

### Review semantics (fixed across palettes)
- **Good** (`good-green` on `good-wash`), **Okayish** (`okayish-amber` on `okayish-wash`), **Bad** (`bad-red` on `bad-wash`). Also reused for field validation: Good green for "available", Bad red for "taken" and the notification dot.

### Map
- `map-land`, `map-water`, `map-park`, `map-road`, `map-road-edge`: a quiet tinted basemap so pins, not geography, carry the colour.

### Named Rules
**The Fixed Verdict Rule.** Good is always green, Okayish always amber, Bad always red, in every palette and every screen. Brand colour never stands in for a verdict, and verdict colours never decorate.

**The One Role Set Rule.** Every colour on a screen comes from a role (`p`, `p-strong`, `pc`, `bg`, `surface`, `ink`...). New screens use roles, not hex values, so palettes stay swappable.

## Typography

**Display Font:** Fredoka (with system-ui, sans-serif)
**Body Font:** Nunito (with system-ui, sans-serif)

**Character:** Fredoka's rounded geometry gives the wordmark and headings the cat's friendliness; Nunito's soft terminals keep body text warm and very legible, and its heavy weights do the work of hierarchy inside cards.

### Hierarchy
- **Display** (Fredoka 600, 42px): the Thinnava wordmark on splash and welcome only. In the top app bar the wordmark runs at 24px; on onboarding slides at 22px.
- **Headline** (Fredoka 600, 26px, 1.15, balanced wrap): onboarding promises, setup titles.
- **Title** (Fredoka 600, 20px, 1.2): sheet titles, profile name, empty-state title, count numerals. Top-bar screen titles run at 22px.
- **Place title** (Fredoka 600, 17.5px, 1.2): the place name on every timeline card. Places are always set in the display face.
- **Body** (Nunito 400, 15px, 1.45): explanatory copy, in Slate Ink.
- **Strong body** (Nunito 800, 15.5px): list-item names, sheet options; person names inside sentences are bolded at 800.
- **Label** (Nunito 700, 12.5px): meta lines, nav labels (12px), field labels (13px, 800), timestamps (12px).
- **Button** (Nunito 800, 16px; 14px on small buttons).

### Named Rules
**The Two Voices Rule.** Fredoka speaks for the brand and for places (wordmark, headings, place names, big numerals); Nunito carries everything else. Never set body copy or buttons in Fredoka.

## Layout

Phone frames are 360px wide (Android baseline). Screen content uses an 18px horizontal gutter (top bar 18px left, chips, search, list items, segmented control); the timeline feed uses a slightly tighter 14px gutter with 10px between cards. Bottom sheets pad their rows at 22px.

Vertical skeleton per tab screen: 34px status bar, 56px top app bar, flexible body, 78px navigation bar, gesture handle. Lists sit on a white list surface with 26px top corners that rises from the ground 12px below the controls. Card internals indent the dish lines and footer 51px so they align under the name, past the 40px avatar.

Chip rows scroll horizontally with 8px gaps; stacked buttons use 10px gaps. Touch targets are 48px minimum.

### Ground: Rings (decided)
The ground is flat Mist carrying **Rings**: thin concentric arcs (1.4px stroke, the primary mixed 18% into the ground) rippling in from two opposite corners, radii stepping about 50px, plus one small primary dot at 55% opacity as the only accent. Three compositions cycle across screens so they don't feel stamped. Rings stay in the margins and corners; content always sits on white cards or list surfaces, never on the lines. No blur, no gradient, no fill shapes. Map screens use the map instead of rings. Rings appear only on onboarding and the main tab screens (Home, Search, Map, Profile and their sheets); every other screen (place page, entry detail, forms, pickers, people, settings) sits on plain flat Mist, by the owner's call.
Explored and not chosen: abstract tonal shapes, cut-paper food, food line drawings, thali, Bauhaus blocks, solid field, doodle wallpaper, gingham.

## Elevation & Depth

Hybrid: tonal layering first (white surfaces on a pale ground), with soft, diffuse, navy-tinted shadows that read as lift, never as outline. Shadows are always blurred and low-opacity; there are no hard offset shadows.

### Shadow Vocabulary
- **Card rest** (`box-shadow: 0 1px 2px rgba(20,30,50,.05), 0 6px 18px -12px rgba(20,30,50,.22)`): timeline cards.
- **Icon button** (`box-shadow: 0 1px 2px rgba(20,30,50,.08)`): round top-bar buttons.
- **Floating panel** (`box-shadow: 0 10px 30px -18px rgba(20,30,50,.4)`): inline panels and empty-state cards on onboarding and Home (also seen at -20px / .35).
- **Search bar** (`box-shadow: 0 1px 2px rgba(20,30,50,.06), 0 8px 20px -14px rgba(20,30,50,.3)`).
- **Sheet** (`box-shadow: 0 -10px 30px -10px rgba(10,20,40,.25)`): bottom sheets.
- **Add button glow** (`box-shadow: 0 6px 14px -6px var(--p)`): the nav + only.
- **Map pin** (`box-shadow: 0 4px 12px -4px rgba(10,20,40,.35)`); selected pin adds a 3px primary ring.
- **Mascot** (`filter: drop-shadow(0 18px 18px rgba(20,40,80,.18))`): the sitting cat on splash and slides.

### Named Rules
**The Soft Lift Rule.** Depth is white on sky plus a diffuse navy-tinted shadow. Strokes are inset hairlines (1-1.5px `hairline`), never heavy borders.

## Shapes

Everything is rounded and soft, scaled to the element's size: chips 10px, thumbnails 14px, fields and count tiles 16px, the nav add button 18px (a rounded square, not a circle), cards 20px, inline panels 24px, list surfaces and empty-state cards 26px, sheets 28px top corners (fully rounded when floating), the welcome hero card 30px. Buttons, review pills, search, segmented control and pin bubbles are full pills (999px). Avatars, source marks, icon buttons and speed-dial actions are circles.

Strokes are inset box-shadows (1px chips, 1.5px fields and outline buttons, 2px focus), so shapes never shift on state change. Icons are Lucide outline icons at stroke 2, typically 22px, 16px in chips and pills.

## Components

### Buttons
Round, full-width and confident.
- **Shape:** full pill (999px), 52px tall, full width by default; small variant 40px (36px in list rows), auto width, 16px side padding.
- **Primary:** Cobalt Blue with white Nunito 800 text. One per screen.
- **Tonal:** Pale Cobalt with Deep Cobalt Ink, for the second-most likely action (Accept, Directions, Save what a friend told you).
- **Outline:** transparent with a 1.5px inset hairline and Cobalt Blue text (Requested state uses Slate Ink text).
- **Google sign-in:** white with near-black text on the navy hero card; on light grounds, a navy pill with the Google mark in a white 28px circle. The welcome ships as 3 swipeable slides (decided).
- **Disabled:** 40% opacity until the form is valid.

### Chips
- **Style:** 34px tall, 10px corners, white with a 1px inset hairline, Slate Ink Nunito 700 at 13.5px, optional 16px leading icon or trailing chevron for dropdowns.
- **Selected:** Pale Cobalt fill, Deep Cobalt Ink text, no stroke. Used for filters and map layers; the active Home filter shows as a chip.

### Cards / Containers
- **Entry card:** white, 20px corners, card-rest shadow, 14px padding. Top row: 40px avatar or source mark, "**Name** went to / told you about", the place in Fredoka, a 12.5px meta line with map-pin icon, timestamp right. Then heart (loved, in Cobalt Blue) and thumbs-down (didn't like, Muted Ink) dish lines, then a footer with the review pill, "₹N / person" in Night Ink 800, and a lock "Only you" mark for private entries.
- **List surface:** white sheet with 26px top corners; rows (48px thumb or avatar, 800 name, 13px muted sub) separated by 18px-inset hairline dividers. Section labels inside lists are plain 13px muted 800 sentence-case text.
- **Count tiles:** white, 16px corners, Fredoka 20px numeral over a label.

### Inputs / Fields
- **Style:** 54px tall, 16px corners, white with a 1.5px inset hairline, 16px Nunito 600 text; label above in 13px 800 Slate Ink; "(optional)" in muted 600.
- **Focus:** 2px inset Cobalt Blue stroke and a Cobalt Blue caret.
- **Error:** 2px inset Bad red stroke, red caret and trailing x-circle; helper line in red 700 with an x icon. Success helper in Good green with a check. Neutral helper in Muted Ink.

### Navigation
- **Top app bar:** 56px; the wordmark (Deep Cobalt, 24px) on Home, a 22px Fredoka title on main screens, or a 19px title on flow screens (Add visit, Your visit, pickers); a ghost ← (or × for forms you dismiss, like Add visit and Edit profile); 48px round white icon buttons on the right with a 9px Bad-red notification dot.
- **Navigation bar:** 78px white bar with a hairline top border; four destinations (Home, Search, Map, Profile) around a centre add button. Labels Nunito 700 12px in Slate Ink, active in Night Ink with a 56x30 Pale Cobalt pill indicator behind the icon.
- **Add button:** 52px Cobalt Blue rounded square (18px) with a primary-tinted glow. Tapping opens a speed dial of three white 62px circles with plain-word labels over a navy scrim (`rgba(14,24,44,.78)`, the phase1 B3 mockup); the + becomes a white rounded square with a Deep Cobalt x and a soft shadow.
- **Segmented control:** Surface Tint pill track, 4px inset, 36px segments; selected segment is white with a faint shadow.

### Bottom Sheet
White, 28px top corners, 36x4 hairline handle, title in Fredoka 20px, option rows at 22px padding with a 40px source mark, 15.5px 700 label, a muted one-line hint, and a trailing radio (selected: Cobalt Blue with a white inner ring). On the map, the pin card floats 8px from the edges with all corners rounded.

### Review Pill (signature)
26px full pill, Nunito 800 13px, a 16px face icon (smile / meh / frown) then the word. Colours from the fixed review semantics. The verdict inks were deepened (#17703E / #845300 / #A8301F) so each pair clears 4.5:1 at 13px. The only rating mark the app shows; Google's rating appears only as "Google 4.2" with a small star in meta text.

### Map Pins (signature)
White pill bubbles with a rotated-square tail: a 24px avatar (who) or a 24px Surface Tint glyph circle (heart = wishlist, check = went, globe = internet), then the place name in 12.5px 800. The user's own pins invert to Cobalt Blue with white text. Busy areas collapse to a 38px Deep Cobalt cluster with a white halo; the user's location is a Cobalt Blue dot with white and translucent primary rings.

### Avatars and Source Marks
Initials avatars are 40px circles (28px small, 24px in stacks with a 2px surface ring and -7px overlap) in five fixed tints (`#E07A5F`, `#6C8EBF`, `#7FB069`, `#B07AA1`, `#E3A73B`). Entries not posted by a person use a 40px Surface Tint source mark with a Deep Cobalt icon: person for "friend told you", globe for internet.

## Motion

Prototype: `design/motion.html` (clickable; every transition has a Play button). Motion explains state and place; it never decorates. Everyday navigation is fast and quiet; one authored moment is reserved for the share import.

**Curves:** standard `cubic-bezier(.2,0,0,1)` for small state changes; emphasized decelerate `cubic-bezier(.05,.7,.1,1)` for anything arriving; emphasized accelerate `cubic-bezier(.3,0,.8,.15)` for anything leaving. Exits are always faster than entrances. No bounce or elastic curves.

**Durations:** short 100–150 ms (presses, ticks, heart pop, chips); medium 250–300 ms (tabs, slides, speed dial); long 400–450 ms (sheets, container transform); signature 500–900 ms (cat climb and share-import steps only).

**Transitions (Material 3 patterns):**
- **Tabs:** soft overlapping crossfade, 280 ms: the new tab settles in on top from 98% scale while the old one fades beneath (240 ms), so there is never a blank frame. The navigation bar never moves; only its pill indicator changes.
- **Pushed screens and welcome slides:** shared axis X (150 ms out, 300 ms in, 60 px travel).
- **Home card → place page:** shared title glide. The place name lifts off the card and glides into the page title (460 ms, `cubic-bezier(.2,.8,.2,1)`), the card dims to 97% / 60%, the page fades in (260 ms) and its content rises 14 px in a 45 ms stagger. Back fades the content (150 ms) and glides the title down into its card (380 ms). No clipping or box-expanding container transform.
- **Bottom sheets and the map pin card:** slide up 400 ms over a 200 ms scrim fade; slide down 250 ms.
- **+ speed dial:** three circles fan out of the + in 250 ms with a 30 ms stagger; the + icon turns 135° into ×.
- **Dialogs:** fade and scale from 90%, 200 ms.

**Signature moments:**
- **Chef cat climb:** wherever the peeking cat appears, it rises from behind the card (600 ms, emphasized decelerate) and only then hooks its paws over the edge.
- **Share import:** the copied-message card on Home lifts (or, for a shared link, the shared bubble lights up); the sheet rises; the cat climbs; a copy of the message flies into the reading card; the sheet grows into the confirmation screen; fields fill in with a 40 ms stagger and the amber flag pulses once; entering a friend's name wakes Save; Save shrinks the screen into a new card that drops onto the top of Home while the other cards slide down, then the new card's tint fades from Pale Cobalt to white.

**Feedback:** heart pops once (scale 1.35, 220 ms) and fills; snackbars rise 300 ms, stay 3 s, leave 200 ms; review buttons and chips respond within 150 ms; the username check spins, then the tick pops in.

**Remove animations (Android setting):** every movement becomes a crossfade of at most 150 ms. State changes (Save enabling, heart fill, snackbar text, new card) still appear.

## Do's and Don'ts

### Do:
- **Do** keep the ground flat Mist with the Rings treatment; put content on white surfaces, never directly on the ring lines.
- **Do** lead every entry with who and where, then loved / didn't like / price, with the review pill in the footer.
- **Do** use the fixed Good / Okayish / Bad pills for every verdict, in every palette.
- **Do** set place names, headings and the wordmark in Fredoka 600; everything else in Nunito.
- **Do** use roles (`p`, `pc`, `surface`, `ink`) rather than raw hex so palettes remain swappable.
- **Do** show the chef cat on identity and empty moments, peeking over a card's top edge.
- **Do** mark private entries with the lock "Only you".

### Don't:
- **Don't** use gradients on grounds or surfaces; the owner rejected them.
- **Don't** use hard offset shadows or heavy borders; lift is a soft blurred shadow, strokes are inset hairlines.
- **Don't** show stars or numeric scores as the app's own rating, and no rating summaries; stars appear only beside Google's figure.
- **Don't** add photos to entries or cards.
- **Don't** recolour verdict pills with brand colours, or use verdict colours as decoration (the "loved" heart uses the brand primary, never Bad red).
- **Don't** set body copy or buttons in Fredoka.

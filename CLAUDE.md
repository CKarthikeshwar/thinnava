# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**Thinnava?!** (working name) is a social food memory app for Android: connect mutually with people you know, see where they ate and what they thought, privately log what friends tell you (copy a WhatsApp message and paste it in, or share text/links from apps that allow it; AI fills the form, you confirm) and internet finds, and jump out to Google Maps / Swiggy / Zomato / District. IISc course project, **team of 2**, demo with real users, distributed as an APK.

## Source of truth: `spec.md`

- **`spec.md` defines the whole project**: product rules, screens, design summary, stack, schema, privacy (RLS), APIs, AI, frontend architecture, testing, release and the step-by-step build plan (§30).
- **Build only what the spec says.** If a task needs something the spec doesn't cover or contradicts, stop and ask the owners; don't improvise.
- **Change process:** update `spec.md` first, then add an entry to `changelog.md` (date, what, why, spec sections), then change code. Every behaviour, data, scope or stack change gets a changelog entry.
- Build in milestone order (spec §30) and check each milestone's "Done when" before moving on.
- Other files: `idea.md` = owners' brainstorm scratchpad (not requirements; preserve their voice, add raw thoughts to its parking lot). `DESIGN.md` = detailed visual system (must agree with spec §16). `design/*.html` = mockups and motion prototype. `PRODUCT.md`, `.impeccable/` = design-tool context.

## Design north star

The app must be **intuitive, clear, clutter-free, easy and frictionless**:
- One obvious primary action per screen; plain language.
- Show only what helps the decision at hand; hide secondary info behind a tap.
- Minimize taps and typing: smart defaults, optional fields stay optional, logging takes seconds.
- Push back (briefly) on anything that adds noticeable complexity for the user.

## Engineering rules (details in spec Part B)

- Privacy is enforced in Postgres (RLS + security-definer RPCs), never only in the app. Any change to tables, RLS or RPCs needs the pgTAP privacy tests (spec §21.3) passing.
- No secrets in the app except the Android-restricted Maps key and the Supabase publishable key. Gemini and Places keys live only in Edge Function secrets.
- **Zero cost, always (spec §27.5):** never set up, suggest or upgrade to anything that can charge the owners' card. Every Google Places call goes through `consume_google_quota`; hitting a limit pauses a feature, never bills.
- Components use theme tokens, never raw hex. Respect "Remove animations".
- Keep shared code web-compatible; Android-only code goes in `app/src/platform/`.

## Two people, two laptops (spec §33)

- At the start of a session, ask who the user is (**P1** or **P2**) and which step they're on, unless they've said.
- Change only that person's folders, tables and functions (spec §33.3). Shared files (components, theme, layouts, `lib/supabase.ts`, config, `package.json`, `types/db.ts`, `spec.md`, `changelog.md`) only after the user confirms, in a small separate change.
- Work on the person's branch (`p1/...` / `p2/...`), never directly on `main`. Migrations only via `supabase migration new`; never edit a migration already on `main`.
- Never run `supabase db push` / `functions deploy` against prod unless the user is the release keeper and explicitly asks.

## Git / commits

- Claude is allowed to make commits.
- Keep commits **minimal**: commit only after a substantial chunk of work is done. Avoid frequent or small commits.
- **Do NOT mention Claude in commit messages.** No `Co-Authored-By: Claude` trailer, no "Generated with Claude Code", no AI attribution of any kind.

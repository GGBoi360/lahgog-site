# lahgog.app (the website)

The site went live on 2026-10-13. Until the listing is public the landing page says "בקרוב ב-Google Play" (owner, 2026-10-14); the
Play button points at the real listing (`com.lahgog.app`), live once the app is published. On Android, the invite page
sends a visitor without the app to Google Play after 1.5 seconds, with the invite in the install referrer
(`lahgog=<path and query>`, when it fits) for a deferred deep link; iPhones see the code and "Android for now".

A static site, no build step: the landing page (`index.html`); the invite pages for the links built in
`src/features/sharing/inviteLinks.ts`: `/j/?c=<code>`, `/i/?c=<code>`, `/f/?c=<code>`, `/a?d=…`, `/l?d=…`, `/c?d=…`
(`j/index.html`, `i/index.html`, `f/index.html`, `a.html`, `l.html`, `c.html`, each with its own preview card, all
drawn by `invite.js`; generated from one template, scratchpad `mkinvites.mjs`, so edit them together); `404.html`,
which GitHub Pages serves for every path without a file and which only forwards the older path forms (`/j/<code>` to
`/j/?c=<code>`, `/p/<token>` to `/p/?t=<token>`); and `/.well-known/assetlinks.json`, which tells Android that the app may open
`https://lahgog.app/...` links itself (App Links; the intent filter with `autoVerify` is in `app.json`).

## Guest pages (since 2026-10-26)

`/p/?t=<token>` (a plan's guests, R105) and `/g/?t=<token>` (a chat event's guests, R51) are real files
(`p/index.html`, `g/index.html`, identical except `og:url`) that load `guest.js`. They are files, not 404 routes, so
link previews (WhatsApp) get HTTP 200 and a generic invite card (`og-invite.png`, template `.preview/og-invite.html`);
the card never holds event details. The older `/p/<token>` form (app builds before 2026-10-26) reaches `404.html`,
which forwards it to `/p/?t=<token>`. A guest without the app sees what the server function returns (`plan_guest_view` / `guest_event`)
and answers with a name, going/maybe/not and plus-ones (`plan_guest_rsvp` / `guest_rsvp`, Supabase REST with the
public anon key; access is decided by those functions). The key for changing the answer stays in the browser's
localStorage (`lahgog.guest.<token>`); the server keeps only its hash. The privacy notice above the button is required
(Privacy Protection Law s.11): what is kept, who sees it, that it's voluntary, how long, and a link to privacy
`#guests`. Unknown or turned-off links show "not found". Test without real tokens: `.preview/guest-*.html` are built
from `p/index.html` with `fetch` stubbed (scratchpad `mkmock.cjs`).

## Landing page (since 2026-10-26)

- **Files:**
  - `index.html` (Hebrew) and `en.html` (English, served at `/en`) share `landing.css` and `landing.js`.
  - `landing.js` draws today's calendar page (the Gregorian date plus the Hebrew date in Hebrew numerals, from Intl's
    Hebrew calendar) and a countdown to the next Hanukkah. Nothing is fetched.
  - Fonts are self-hosted in `fonts/` (Rubik subset, SIL OFL).
  - Images: `og.png` (Hebrew), `og-en.png` (English), `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`, `icon-192/512.png`, `icon.svg`,
    `flame.svg`.
  - Metadata: `site.webmanifest`, `robots.txt`, `sitemap.xml`.
- **Until the Play listing is public**, the pages say "בקרוב ב-Google Play" (no link, no badge, no QR); the invite
  page keeps its Play button for invites. When the listing is live, add the official Hebrew badge, a QR for desktop
  and the Google trademark line.
- **Content rules:**
  - Claims only from README and data-facts.
  - The example notifications use the app's real wording (`src/domain/reminders.ts`).
  - No fake ratings or counts.
  - Decisions with sources are in `docs/website/DECISIONS.md`.
- **Regenerating images:** `site/.preview/` holds the templates (git-ignored, never published). Serve `site/`
  locally, screenshot `og.html` / `icon.html` with headless Edge, and crop with Pillow. Headless Edge's window is at
  least about 500 px wide, so check phone widths through an iframe (`.preview/frame.html`, 375 px).

## Legal pages (website session, since 2026-10-14)

`/privacy`, `/terms`, `/delete-account`, `/accessibility`: Hebrew first, then English (`#en`), and the Hebrew version
prevails.
- Written from `docs/legal/data-facts.md` (the app session keeps it current) with research in
  `docs/website/research/legal-benchmark.md`.
- Posture (owner): maximum protection that still survives the Standard Contracts Law, and never a false statement
  about data.
- Keep the URLs: `/privacy` and `/terms` are on the Google consent screen, and `/delete-account` goes in Play's Data
  safety form.
- Any change to the privacy page also updates `docs/store/play-data-safety.md`.
- Bump the version and effective date on every change. A material change needs notice of 30 days (both pages; privacy
  §17, terms §17). After a **material** change to the terms (terms §17: one against users), also raise
  `TERMS_VERSION` in the app (`src/features/legal/legal.ts`) so the app asks for acceptance again. A clarification
  that takes nothing from users (like v2.2 on 2026-10-27) doesn't re-ask everyone; record the reasoning in DECISIONS.
- `app-ads.txt` (AdMob) sits at the site root and needs lahgog.app as the developer website in the Play listing.

## assetlinks.json

One entry per Android package and signing key:

| Package | Key | SHA-256 |
|---|---|---|
| `com.lahgog.app.preview` | EAS keystore, created 2026-10-13 | `BE:1D:02:…:85:2B`, read from the build's APK (v2 signature block) |
| `com.lahgog.app` | Google Play App Signing | add when the app is first uploaded to Play (Play Console → App integrity) |

## Publishing a change

This folder is the source of truth; the public repo **GGBoi360/lahgog-site** (GitHub Pages, branch `main`, root) only
mirrors it (created 2026-10-13, owner approved). To publish: clone that repo into a scratch folder, copy this folder's
files over it (including `.well-known`, `.nojekyll`, `CNAME`), commit and push; Pages redeploys in about a minute.

## Hosting

GitHub Pages from a public repo holding this folder, custom domain `lahgog.app` (`CNAME` file), HTTPS enforced
(`.app` requires HTTPS). `.nojekyll` keeps the `.well-known` folder published. DNS at Porkbun: the apex `lahgog.app`
points at GitHub Pages (A records `185.199.108.153`, `.109.153`, `.110.153`, `.111.153`).

*Live since 2026-10-14:* DNS at Porkbun (A and AAAA records, `www` → `ggboi360.github.io`), HTTPS enforced. The
certificate stayed pending for over an hour; removing and re-adding the custom domain (Pages settings, or
`gh api -X PUT repos/GGBoi360/lahgog-site/pages -F cname=` then `-f cname=lahgog.app`) issued it within seconds.
`EXPO_PUBLIC_WEB_URL=https://lahgog.app` is set (EAS preview/production/development and `.env.local`), so the app
shares links instead of bare codes. lahgog.com and lachgog.com are not forwarded on purpose: lahgog.com is kept for
the vendors and organizers site (roadmap R87). Check: `https://lahgog.app/.well-known/assetlinks.json` returns the JSON, and
on the phone, Settings → Apps → the app → "Open by default" lists lahgog.app as verified.

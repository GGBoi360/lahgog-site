# lahgog.app (the website)

The finished site from day one (owner, 2026-10-13: no "coming soon" page; it gets no traffic before launch): the
Play button points at the real listing (`com.lahgog.app`), live once the app is published. On Android, the invite page
sends a visitor without the app to Google Play after 1.5 seconds, with the invite in the install referrer
(`lahgog=<path and query>`, when it fits) for a deferred deep link; iPhones see the code and "Android for now".

A static site, no build step: the landing page (`index.html`), the invite page (`404.html`, which GitHub Pages
serves for every path without a file: `/j/<code>`, `/i/<code>`, `/f/<code>`, `/a?d=…`, `/l?d=…`, the links built in
`src/features/sharing/inviteLinks.ts`), and `/.well-known/assetlinks.json`, which tells Android that the app may open
`https://lahgog.app/...` links itself (App Links; the intent filter with `autoVerify` is in `app.json`).

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
  §17, terms §17). After changing the terms, also raise `TERMS_VERSION` in the app (`src/features/legal/legal.ts`)
  so the app asks for acceptance again.

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

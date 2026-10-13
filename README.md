# lahgog.app (the website)

The finished site from day one (owner, 2026-10-13: no "coming soon" page; it gets no traffic before launch): the
Play button points at the real listing (`com.lahgog.app`), live once the app is published. On Android, the invite page
sends a visitor without the app to Google Play after 1.5 seconds, with the invite in the install referrer
(`lahgog=<path and query>`, when it fits) for a deferred deep link; iPhones see the code and "Android for now".

A static site, no build step: the landing page (`index.html`), the invite page (`404.html`, which GitHub Pages
serves for every path without a file: `/j/<code>`, `/i/<code>`, `/f/<code>`, `/a?d=…`, `/l?d=…`, the links built in
`src/features/sharing/inviteLinks.ts`), and `/.well-known/assetlinks.json`, which tells Android that the app may open
`https://lahgog.app/...` links itself (App Links; the intent filter with `autoVerify` is in `app.json`).

## assetlinks.json

One entry per Android package and signing key:

| Package | Key | SHA-256 |
|---|---|---|
| `com.lahgog.app.preview` | EAS keystore, created 2026-10-13 | `BE:1D:02:…:85:2B`, read from the build's APK (v2 signature block) |
| `com.lahgog.app` | Google Play App Signing | add when the app is first uploaded to Play (Play Console → App integrity) |

## Hosting

GitHub Pages from a public repo holding this folder, custom domain `lahgog.app` (`CNAME` file), HTTPS enforced
(`.app` requires HTTPS). `.nojekyll` keeps the `.well-known` folder published. DNS at Porkbun: the apex `lahgog.app`
points at GitHub Pages (A records `185.199.108.153`, `.109.153`, `.110.153`, `.111.153`).

Once the site answers, set `EXPO_PUBLIC_WEB_URL=https://lahgog.app` (EAS environments and `.env.local`) so the app
shares links instead of bare codes. Check: `https://lahgog.app/.well-known/assetlinks.json` returns the JSON, and
on the phone, Settings → Apps → the app → "Open by default" lists lahgog.app as verified.

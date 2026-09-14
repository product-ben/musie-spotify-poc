# musie — Spotify POC

A proof of concept for playing Spotify from the browser. Sign in and the page
offers **Play**, which plays a track in the page itself, and **Reveal song
details**, which opens a card with everything the Web API knows about it.

Which track depends on the card you scanned. Each printed card carries a QR
code pointing at `…/?c=001`, and the app looks that code up in
[`src/tracks.js`](src/tracks.js).

No build step, no backend, no dependencies — plain ES modules served as static
files. Authentication uses the **Authorization Code flow with PKCE**, which is
the flow Spotify recommends for public clients, so there is no client secret
anywhere in the repo.

## Setup

1. Create an app at <https://developer.spotify.com/dashboard>.
2. Under **Redirect URIs**, add both of these exactly:

   ```
   http://127.0.0.1:5173/
   https://<your-github-user>.github.io/musie-spotify-poc/
   ```

   Spotify no longer accepts `http://localhost`, and the trailing slash matters.
   The app derives its redirect URI from wherever it is being served, so the
   same code works locally and when deployed.
3. Under **APIs used**, tick *Web API*.
4. Copy the **Client ID**.

## Run

```bash
./serve.sh
```

Then open <http://127.0.0.1:5173/>. A client ID is already committed in
[`src/config.js`](src/config.js) — that is safe, because the client ID is not a
secret under PKCE. Clear it to have the app prompt for a different one instead
and keep it in `localStorage`.

## Layout

| File | Purpose |
| --- | --- |
| `index.html` | Version index, and the one place you sign in |
| `player.html` | Full player — streams via the Web Playback SDK |
| `src/config.js` | Client ID, redirect URI, scopes, endpoints |
| `src/auth.js` | PKCE login, token exchange, refresh, storage |
| `src/api.js` | Fetch wrapper for the Web API endpoints used here |
| `src/player.js` | Web Playback SDK — registers the tab as a device |
| `src/app.js` | Rendering and event handling for the full player |
| `src/home.js` | The version index and its sign-in |
| `src/chrome.js` | Brand mark and the shared session badge |
| `src/tracks.js` | The card catalogue — paste share links here |
| `cards.html` | Printable QR cards, one per track |
| `embed.html` | Spotify's own embedded player — no sign-in |
| `listen.html` | Controls above the fold, unaltered embed below |
| `serve.sh` | Static server on 127.0.0.1:5173 |

Scopes requested: `streaming`, `user-read-private`, `user-read-email`,
`user-modify-playback-state`, `user-read-playback-state`.

## How playback works

Two separate pieces, which is the part that surprises people:

1. The **Web Playback SDK** (`src/player.js`) registers this browser tab as a
   Spotify Connect device — the same list your phone and desktop app appear in.
   It receives audio; it does not choose what to play.
2. The **Web API** (`PUT /me/player/play`) then tells Spotify what to play and
   which device to play it on.

So nothing can play until the SDK's `ready` event has handed over a
`device_id`. The header shows "Player ready" once that has happened.

## Known limits

- **The detail card cannot show audio features.** Tempo, key, danceability and
  the rest come from the Audio Features and Audio Analysis endpoints, which
  Spotify restricted on 27 November 2024 for apps registered after that date.
  A new app gets a 403, so the card is built from the track, album and artist
  objects instead — which is everything still readable.
- **Playback requires Spotify Premium.** There is no free-tier path to full
  playback; it is enforced server-side, and a free account gets an
  `account_error` from the SDK.
- **The tab must stay open.** Closing it removes the device and stops playback.
- **Serve from `127.0.0.1`.** Protected audio needs a secure context, which
  loopback satisfies even over plain `http://`. Serving from your machine's
  network IP to test on a phone will break playback unless it is over HTTPS.
- **Desktop browsers are the tested ground.** On iOS, audio will not start
  until the user taps a control inside the page.
- Tokens live in `localStorage`, which is fine for a local POC but is not how
  you would ship this — a production app would keep the refresh token on a
  server.
- `/me/top/tracks` is empty for brand-new accounts with no listening history.

## Cards

`src/tracks.js` holds a list of Spotify share links. Codes are assigned by
position (`001`, `002`, …), so **append** new links rather than reordering
them — reordering changes the codes on cards you have already printed.

Open `cards.html`, press Print, and cut along the borders. Scanning a card with
any phone camera opens the player on that track.

The QR encodes the card *code*, never the track id. Anyone can decode a QR with
their phone, and a URL containing `track/0riRZrZ…` would give the answer away.

## Three players

`index.html` lists them and owns signing in and out. The session lives in
`localStorage`, so it is shared by every page on the origin — sign in once and
the brand mark carries you between them with the account intact.

`player.html` streams through the Web Playback SDK, so the page owns the UI
entirely. That needs a Spotify Premium account which is on the app's User
Management list.

`embed.html` drops Spotify's own embed onto the page instead. It needs no
token, no Premium and no allowlisted account, so anyone can open it — visitors
signed into Premium in that browser hear the full track, everyone else hears a
30-second preview. The embed displays the cover art and metadata that the
[developer policy](https://developer.spotify.com/policy) requires alongside
playback, which the SDK route leaves to you.

`listen.html` is the same embed arranged differently: play/pause and the
detection badge fill the first screen, and the widget sits on a second,
unaltered and reachable by scrolling. Spotify's embed terms forbid obscuring
the widget, but say nothing about where on the page it lives, and the IFrame
API exists precisely so it can be driven from your own controls.

The fold is guaranteed with `min-height: calc(100lvh + 24px)` on the first
pane. `lvh` is the *largest* viewport height, so a collapsing address bar can
only shrink what is visible — never reveal what is below it. `svh` or `dvh`
would both let the widget peek in.

All three read the same `?c=` card code and the same catalogue.

## Deploying

The app is static, so GitHub Pages serves it as-is with no build step. Pages is
enabled from the `main` branch at the repository root; every push deploys.

Two things must line up or login fails:

- the Pages URL must be registered as a Redirect URI on the Spotify app;
- the site must be served over HTTPS, which Pages does automatically. Protected
  audio will not play over plain HTTP anywhere except loopback.

## Who can sign in

While the Spotify app is in **development mode**, only accounts listed under
**User Management** in the dashboard can sign in — up to 25 — and each needs
its own Spotify Premium subscription to hear anything. Every guest scanning a
card on their own phone therefore needs both. Lifting that means applying to
Spotify for an extension.
